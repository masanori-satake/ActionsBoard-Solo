/**
 * ActionsBoard-Solo Background Service Worker
 */

// --- Constants & State ---
const DEFAULT_API_URL = 'https://api.github.com';
const ALARM_NAME = 'poll_actions';
const POLL_INTERVAL_ACTIVE = 0.5; // 30 seconds
const POLL_INTERVAL_BG = 5; // 5 minutes
const HISTORY_COUNT = 10;

let activeConnections = 0;
let activeIntervalId = null;
let isPolling = false;

// --- Lifecycle ---

chrome.runtime.onInstalled.addListener(async () => {
  console.log('[ActionsBoard-Solo] Extension installed');
  setupAlarm(POLL_INTERVAL_BG);
});

// Enable opening the side panel when the extension icon is clicked
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

// Update polling interval based on popup connection
chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'popup') return;
  activeConnections++;

  if (activeConnections === 1) {
    poll();
    // Use setInterval for accurate 30s polling when popup is open (MV3 alarm is min 1min)
    activeIntervalId = setInterval(poll, POLL_INTERVAL_ACTIVE * 60 * 1000);
    chrome.alarms.clear(ALARM_NAME);
  }

  port.onDisconnect.addListener(() => {
    activeConnections--;
    if (activeConnections === 0) {
      if (activeIntervalId) {
        clearInterval(activeIntervalId);
        activeIntervalId = null;
      }
      setupAlarm(POLL_INTERVAL_BG);
    }
  });
});

// Message listener for manual refresh
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'poll') {
    poll();
    sendResponse({ status: 'polling' });
  }
});

// --- Alarm & Polling Logic ---

async function setupAlarm(intervalInMinutes) {
  await chrome.alarms.clear(ALARM_NAME);
  chrome.alarms.create(ALARM_NAME, { periodInMinutes: intervalInMinutes });
  if (intervalInMinutes < 1) poll();
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) poll();
});

/**
 * Main polling sequence
 */
async function poll() {
  if (isPolling) return;
  isPolling = true;

  try {
    let {
      authConfigs,
      settings, // legacy
      workspaces,
      cache: storageCache,
      notificationSettings,
      currentUser,
    } = await chrome.storage.local.get([
      'authConfigs',
      'settings',
      'workspaces',
      'cache',
      'notificationSettings',
      'currentUser',
    ]);

    let migrated = false;
    // Migration logic
    if (!authConfigs) {
      if (settings?.pat) {
        authConfigs = [
          {
            id: 'default',
            name: 'デフォルト',
            pat: settings.pat,
            baseUrl: settings.baseUrl || DEFAULT_API_URL,
          },
        ];
      } else {
        authConfigs = [];
      }
      migrated = true;
    }

    if (!authConfigs.length || !workspaces?.length) return;

    if (!notificationSettings) {
      notificationSettings = { scope: 'all', workspaces: [], events: ['failure'] };
    }

    if (!currentUser) currentUser = {};
    let currentUserUpdated = false;

    // Fetch current user for each auth config in parallel if missing
    await Promise.all(
      authConfigs.map(async (authConfig) => {
        if (!currentUser[authConfig.id]) {
          const login = await fetchCurrentUser(authConfig);
          if (login) {
            currentUser[authConfig.id] = login;
            currentUserUpdated = true;
          }
        }
      }),
    );

    if (currentUserUpdated) {
      await chrome.storage.local.set({ currentUser });
    }

    // Ensure all workspaces have an authConfigId (for migration)
    workspaces.forEach((ws) => {
      if (!ws.authConfigId) {
        ws.authConfigId = authConfigs[0]?.id || 'default';
        migrated = true;
      }
    });

    if (migrated) {
      await chrome.storage.local.set({ authConfigs, workspaces });
    }

    const currentCache = storageCache || { runs: {}, pages: {}, history: {} };
    const results = {
      runs: {},
      pages: { ...currentCache.pages },
      history: { ...currentCache.history },
    };

    // Deduplicate items to fetch, grouping by authConfigId
    // Map<authConfigId, Map<key, item>>
    const fetchGroups = new Map();
    workspaces.forEach((ws) => {
      if (!fetchGroups.has(ws.authConfigId)) {
        fetchGroups.set(ws.authConfigId, new Map());
      }
      const itemsMap = fetchGroups.get(ws.authConfigId);
      ws.items?.forEach((item) => {
        const key = `${item.owner}/${item.repo}/${item.workflowFile}`;
        if (!itemsMap.has(key)) itemsMap.set(key, item);
      });
    });

    const pollPromises = [];

    for (const [authConfigId, itemsMap] of fetchGroups) {
      const authConfig = authConfigs.find((c) => c.id === authConfigId);
      if (!authConfig) continue;

      for (const [key, item] of itemsMap) {
        // Initialize with current cache if not present
        results.runs[key] = currentCache.runs[key] || null;
        results.history[key] = currentCache.history[key] || [];

        pollPromises.push(
          (async () => {
            try {
              // Fetch multiple runs for history
              const runs = await fetchWorkflowRuns(authConfig, item, HISTORY_COUNT);
              if (runs && runs.length > 0) {
                const latestRun = runs[0];
                results.runs[key] = latestRun;
                results.history[key] = runs.map((r) => ({
                  status: r.status,
                  conclusion: r.conclusion,
                  id: r.id,
                }));

                const context = {
                  notificationSettings,
                  currentUser: currentUser?.[authConfigId],
                  itemWorkspaces: workspaces.filter((ws) =>
                    ws.items?.some((i) => `${i.owner}/${i.repo}/${i.workflowFile}` === key),
                  ),
                  latestRun,
                };

                checkFailureNotification(key, latestRun, currentCache.runs[key], context);

                if (latestRun.conclusion === 'success') {
                  const pagesStatus = await fetchPagesStatus(authConfig, item.owner, item.repo);
                  if (pagesStatus) {
                    results.pages[`${item.owner}/${item.repo}`] = pagesStatus;
                    checkPagesNotification(
                      item,
                      pagesStatus,
                      currentCache.pages[`${item.owner}/${item.repo}`],
                      context,
                    );
                  }
                }
              } else if (runs === null) {
                // API Error
                results.runs[key] = {
                  status: 'error',
                  conclusion: 'error',
                  error: '取得失敗 (APIエラー)',
                };
              } else {
                // No runs found
                results.runs[key] = { status: 'none', conclusion: 'none' };
                results.history[key] = [];
              }
            } catch (err) {
              console.error(
                `[ActionsBoard-Solo] Error polling ${key} with ${authConfig.name}:`,
                err,
              );
              results.runs[key] = { status: 'error', conclusion: 'error', error: err.message };
            }
          })(),
        );
      }
    }

    await Promise.allSettled(pollPromises);

    await chrome.storage.local.set({ cache: results });
    updateBadge(results.runs);
  } finally {
    isPolling = false;
  }
}

// --- API Helpers ---

async function fetchWithTimeout(resource, options = {}) {
  const { timeout = 10000 } = options;

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  const response = await fetch(resource, {
    ...options,
    signal: controller.signal,
  });
  clearTimeout(id);

  return response;
}

async function fetchWorkflowRuns(settings, item, count) {
  const baseUrl = settings.baseUrl || DEFAULT_API_URL;
  const workflowSelector = item.workflowId || item.workflowFile;
  const url = `${baseUrl}/repos/${item.owner}/${item.repo}/actions/workflows/${workflowSelector}/runs?per_page=${count}`;

  try {
    const response = await fetchWithTimeout(url, {
      headers: {
        Authorization: `token ${settings.pat}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) return null;
    const data = await response.json();
    if (!data?.workflow_runs) return [];

    return data.workflow_runs.map((run) => ({
      id: run.id,
      status: run.status,
      conclusion: run.conclusion,
      event: run.event,
      actor: run.actor ? run.actor.login : 'system',
      html_url: run.html_url,
      updated_at: run.updated_at,
      display_title: run.display_title,
      jobs_url: run.jobs_url,
    }));
  } catch (err) {
    console.error(`[ActionsBoard-Solo] fetchWorkflowRuns error:`, err);
    return null;
  }
}

async function fetchCurrentUser(authConfig) {
  try {
    const res = await fetchWithTimeout(`${authConfig.baseUrl}/user`, {
      headers: {
        Authorization: `token ${authConfig.pat}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });
    if (res.ok) {
      const data = await res.json();
      return data.login;
    }
  } catch (err) {
    console.error(`[ActionsBoard-Solo] Error fetching current user for ${authConfig.name}:`, err);
  }
  return null;
}

async function fetchPagesStatus(settings, owner, repo) {
  const baseUrl = settings.baseUrl || DEFAULT_API_URL;
  const url = `${baseUrl}/repos/${owner}/${repo}/pages/deployments`;

  try {
    const response = await fetchWithTimeout(url, {
      headers: {
        Authorization: `token ${settings.pat}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });
    if (!response.ok) return null;
    const deployments = await response.json();
    if (!deployments?.length) return null;

    const latest = deployments[0];
    return {
      status: latest.status,
      id: latest.id,
      updated_at: latest.updated_at,
      page_url: latest.page_url,
    };
  } catch {
    return null;
  }
}

// --- Notification & UI Helpers ---

function shouldNotify(type, run, context) {
  const { notificationSettings, currentUser, itemWorkspaces } = context;

  // 1. Event type check
  if (!notificationSettings?.events?.includes(type)) return false;

  // 2. Scope check
  if (notificationSettings.scope === 'all') return true;

  if (notificationSettings.scope === 'my-activity') {
    return !!currentUser && !!run?.actor && run.actor === currentUser;
  }

  if (notificationSettings.scope === 'workspaces') {
    return itemWorkspaces.some((ws) => notificationSettings.workspaces?.includes(ws.id));
  }

  return false;
}

function checkFailureNotification(key, current, previous, context) {
  if (current.status === 'completed' && current.conclusion === 'failure') {
    if (!previous || previous.id !== current.id) {
      if (shouldNotify('failure', current, context)) {
        showNotification(
          `❌ Build Failure: ${key}`,
          `${current.display_title} by ${current.actor}`,
          current.html_url,
        );
      }
    }
  }
}

function checkPagesNotification(item, current, previous, context) {
  if (current.status === 'deliverable') {
    if (!previous || (previous.id !== current.id && previous.status !== 'deliverable')) {
      // For pages notification, the 'run' object used in shouldNotify is just the latest run
      // but actor might not be easily available from pages deployment.
      // However, checkPagesNotification is called only if latestRun.conclusion === 'success'.
      // In this case, we can pass the latestRun as context for actor-based filtering.
      // Wait, shouldNotify expects 'run' for actor check.
      // We'll use the latest run that triggered this check.
      if (shouldNotify('pages', context.latestRun || {}, context)) {
        showNotification(
          `🟢 Pages Deployed: ${item.alias || item.repo}`,
          `Your changes are now live on GitHub Pages.`,
          current.page_url,
        );
      }
    }
  }
}

function showNotification(title, message, url) {
  const id = 'notif|' + url + '|' + Date.now();
  chrome.notifications.create(id, {
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title,
    message,
    priority: 2,
  });
}

chrome.notifications.onClicked.addListener((notificationId) => {
  if (notificationId.startsWith('notif|')) {
    const parts = notificationId.split('|');
    const url = parts[1];
    if (url) {
      chrome.tabs.create({ url });
    }
    chrome.notifications.clear(notificationId);
  }
});

function updateBadge(runs) {
  let failureCount = 0;
  for (const key in runs) {
    if (runs[key].conclusion === 'failure') failureCount++;
  }
  chrome.action.setBadgeText({ text: failureCount > 0 ? failureCount.toString() : '' });
  chrome.action.setBadgeBackgroundColor({ color: '#BA1A1A' });
}
