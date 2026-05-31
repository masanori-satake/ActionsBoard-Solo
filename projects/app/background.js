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
    const {
      settings,
      workspaces,
      cache: storageCache,
    } = await chrome.storage.local.get(['settings', 'workspaces', 'cache']);

    if (!settings?.pat || !workspaces?.length) return;

    const currentCache = storageCache || { runs: {}, pages: {}, history: {} };
    const results = {
      runs: {},
      pages: { ...currentCache.pages },
      history: { ...currentCache.history },
    };

    // Deduplicate items to fetch
    const itemsToFetch = new Map();
    workspaces.forEach((ws) => {
      ws.items?.forEach((item) => {
        const key = `${item.owner}/${item.repo}/${item.workflowFile}`;
        if (!itemsToFetch.has(key)) itemsToFetch.set(key, item);
      });
    });

    for (const [key, item] of itemsToFetch) {
      try {
        // Fetch multiple runs for history
        const runs = await fetchWorkflowRuns(settings, item, HISTORY_COUNT);
        if (runs && runs.length > 0) {
          const latestRun = runs[0];
          results.runs[key] = latestRun;
          results.history[key] = runs.map((r) => ({
            status: r.status,
            conclusion: r.conclusion,
            id: r.id,
          }));

          checkFailureNotification(key, latestRun, currentCache.runs[key]);

          if (latestRun.conclusion === 'success') {
            const pagesStatus = await fetchPagesStatus(settings, item.owner, item.repo);
            if (pagesStatus) {
              results.pages[`${item.owner}/${item.repo}`] = pagesStatus;
              checkPagesNotification(
                item,
                pagesStatus,
                currentCache.pages[`${item.owner}/${item.repo}`],
              );
            }
          }
        }
      } catch (err) {
        console.error(`[ActionsBoard-Solo] Error polling ${key}:`, err);
      }
    }

    await chrome.storage.local.set({ cache: results });
    updateBadge(results.runs);
  } finally {
    isPolling = false;
  }
}

// --- API Helpers ---

async function fetchWorkflowRuns(settings, item, count) {
  const baseUrl = settings.baseUrl || DEFAULT_API_URL;
  const url = `${baseUrl}/repos/${item.owner}/${item.repo}/actions/workflows/${item.workflowFile}/runs?per_page=${count}`;

  const response = await fetch(url, {
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
}

async function fetchPagesStatus(settings, owner, repo) {
  const baseUrl = settings.baseUrl || DEFAULT_API_URL;
  const url = `${baseUrl}/repos/${owner}/${repo}/pages/deployments`;

  try {
    const response = await fetch(url, {
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
  } catch (e) {
    return null;
  }
}

// --- Notification & UI Helpers ---

function checkFailureNotification(key, current, previous) {
  if (current.status === 'completed' && current.conclusion === 'failure') {
    if (!previous || previous.id !== current.id) {
      showNotification(
        `❌ Build Failure: ${key}`,
        `${current.display_title} by ${current.actor}`,
        current.html_url,
      );
    }
  }
}

function checkPagesNotification(item, current, previous) {
  if (current.status === 'deliverable') {
    if (!previous || (previous.id !== current.id && previous.status !== 'deliverable')) {
      showNotification(
        `🟢 Pages Deployed: ${item.alias || item.repo}`,
        `Your changes are now live on GitHub Pages.`,
        current.page_url,
      );
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
