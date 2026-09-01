/**
 * ActionsBoard-Solo Popup Script
 */

document.addEventListener('DOMContentLoaded', async () => {
  const elements = {
    main: document.getElementById('main-content'),
    tabs: document.querySelectorAll('.tab'),
    refreshBtn: document.getElementById('refresh-btn'),
    settingsBtn: document.getElementById('settings-btn'),
  };

  let currentMode = 'developer';
  let config = {};
  let cache = {};
  let currentUser = null;

  // Track manually toggled accordion states to persist across re-renders
  // Mapping: { 'ws:wsId': boolean, 'group:groupId': boolean }
  const accordionStates = {};

  function applyI18n() {
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const msg = chrome.i18n.getMessage(el.dataset.i18n);
      if (msg) el.textContent = msg;
    });
    document.querySelectorAll('[data-i18n-tooltip]').forEach((el) => {
      const msg = chrome.i18n.getMessage(el.dataset.i18nTooltip);
      if (msg) el.dataset.tooltip = msg;
    });
  }

  async function init() {
    applyI18n();

    if (!init.initialized) {
      chrome.runtime.connect({ name: 'popup' });

      chrome.storage.onChanged.addListener((changes) => {
        // Refresh if config or cache changes
        if (changes.authConfigs || changes.workspaces || changes.cache || changes.currentUser) {
          chrome.storage.local
            .get(['authConfigs', 'workspaces', 'cache', 'currentUser'])
            .then((data) => {
              config.authConfigs = data.authConfigs;
              config.workspaces = data.workspaces;
              cache = data.cache || { runs: {}, pages: {}, history: {} };
              currentUser = data.currentUser || {};
              render();
            });
        }
      });
      init.initialized = true;
    }

    const data = await chrome.storage.local.get([
      'authConfigs',
      'settings',
      'workspaces',
      'cache',
      'activeMode',
      'currentUser',
    ]);
    config = data;

    // Support for multiple current users (one per auth config)
    // Mapping: { authConfigId: login }
    // Fetching currentUser is centrally managed by background.js.
    currentUser = data.currentUser || {};

    cache = data.cache || { runs: {}, pages: {}, history: {} };
    currentMode = data.activeMode || 'developer';

    elements.tabs.forEach((tab) =>
      tab.classList.toggle('active', tab.dataset.mode === currentMode),
    );

    render();
  }

  await init();

  elements.tabs.forEach((tab) => {
    tab.onclick = async () => {
      currentMode = tab.dataset.mode;
      elements.tabs.forEach((t) => t.classList.toggle('active', t === tab));
      await chrome.storage.local.set({ activeMode: currentMode });
      render();
    };
  });

  elements.refreshBtn.onclick = () => {
    chrome.runtime.sendMessage({ action: 'poll' }, () => {
      setTimeout(init, 1000);
    });
  };

  elements.settingsBtn.onclick = () => chrome.runtime.openOptionsPage();

  function render() {
    elements.main.innerHTML = '';
    if (!config.authConfigs?.length || !config.workspaces?.length) {
      renderEmptyState();
      return;
    }
    if (currentMode === 'developer') renderDeveloperMode();
    else if (currentMode === 'team') renderTeamMode();
    else renderOperationsMode();
  }

  function renderEmptyState() {
    elements.main.innerHTML = `
      <div class="empty-state">
        <div style="font-size: 48px; margin-bottom: 16px;">🚀</div>
        <p class="md-sys-typescale-title-medium">${escapeHtml(chrome.i18n.getMessage('setupRequiredTitle'))}</p>
        <button class="btn-primary" style="margin-top: 16px;" id="go-to-settings">${escapeHtml(chrome.i18n.getMessage('openSettings'))}</button>
      </div>
    `;
    document.getElementById('go-to-settings').onclick = () => chrome.runtime.openOptionsPage();
  }

  function getWorkflowStatus(run) {
    if (!run || run.status === 'none') return 'neutral';
    if (run.status === 'error' || run.conclusion === 'failure') return 'failure';
    if (
      run.status === 'queued' ||
      run.status === 'in_progress' ||
      run.status === 'waiting' ||
      run.status === 'pending' ||
      run.status === 'requested' ||
      run.conclusion === 'action_required'
    ) {
      return 'progress';
    }
    if (run.conclusion === 'success') return 'success';
    if (run.conclusion === 'cancelled') return 'neutral';
    return 'neutral';
  }

  function renderDeveloperMode() {
    const allItems = getAllItems();
    const userLogins = Object.values(currentUser || {}).map((login) => login.toLowerCase());
    const myActivity = allItems.filter((item) => {
      const run = cache.runs?.[`${item.owner}/${item.repo}/${item.workflowFile}`];
      if (!run || !run.actor) return false;
      return userLogins.includes(run.actor.toLowerCase());
    });

    elements.main.appendChild(createExpandCollapseButton('developer', myActivity));

    if (myActivity.length === 0) {
      const p = document.createElement('p');
      p.className = 'empty-state';
      p.textContent = chrome.i18n.getMessage('noActivity');
      elements.main.appendChild(p);
      return;
    }

    renderGroupedItems(myActivity);
  }

  function renderTeamMode() {
    elements.main.appendChild(createExpandCollapseButton('team', config.workspaces));

    config.workspaces.forEach((ws) => {
      if (!ws.items?.length) return;

      let successCount = 0;
      let failureCount = 0;
      let progressCount = 0;
      let wsStatus = 'success';

      ws.items.forEach((item) => {
        const run = cache.runs?.[`${item.owner}/${item.repo}/${item.workflowFile}`];
        const status = getWorkflowStatus(run);
        if (status === 'failure') {
          failureCount++;
          wsStatus = 'failure';
        } else if (status === 'progress') {
          progressCount++;
          if (wsStatus !== 'failure') wsStatus = 'progress';
        } else if (status === 'success') {
          if (run.conclusion === 'success') successCount++;
        }
      });

      const section = document.createElement('div');
      section.className = 'workspace-section';

      const header = document.createElement('div');
      header.className = 'workspace-header';
      const wsKey = `ws:${ws.id}`;
      // Workspaces are closed by default unless manually opened
      if (accordionStates[wsKey]) {
        header.classList.add('open');
      }

      const statusClass =
        wsStatus === 'failure'
          ? 'status-failure'
          : wsStatus === 'progress'
            ? 'status-progress'
            : 'status-success';

      const statsText = chrome.i18n.getMessage('workspaceStats', [
        successCount.toString(),
        failureCount.toString(),
        progressCount.toString(),
      ]);

      header.innerHTML = `
        <div class="workspace-header-top">
          <div class="status-icon ${statusClass}"></div>
          <div class="ws-name">${escapeHtml(ws.name)}</div>
          <span class="material-symbols-outlined expand-icon">expand_more</span>
        </div>
        <div class="workspace-stats">
          ${escapeHtml(statsText)}
        </div>
      `;

      const content = document.createElement('div');
      content.className = 'workspace-content';
      const card = document.createElement('div');
      card.className = 'workspace-card';

      ws.items.forEach((item) => {
        const runKey = `${item.owner}/${item.repo}/${item.workflowFile}`;
        const auth = config.authConfigs.find((a) => a.id === ws.authConfigId);
        card.appendChild(
          createActionRow(
            item,
            ws,
            cache.runs?.[runKey],
            cache.pages?.[`${item.owner}/${item.repo}`],
            cache.history?.[runKey],
            auth,
          ),
        );
      });

      content.appendChild(card);
      header.onclick = () => {
        const isOpen = header.classList.toggle('open');
        accordionStates[wsKey] = isOpen;
      };

      section.appendChild(header);
      section.appendChild(content);
      elements.main.appendChild(section);
    });
  }

  function renderOperationsMode() {
    const items = getAllItems();
    // Sort by updated_at descending
    items.sort((a, b) => {
      const runA = cache.runs?.[`${a.owner}/${a.repo}/${a.workflowFile}`];
      const runB = cache.runs?.[`${b.owner}/${b.repo}/${b.workflowFile}`];
      const dateA = runA?.updated_at ? new Date(runA.updated_at) : new Date(0);
      const dateB = runB?.updated_at ? new Date(runB.updated_at) : new Date(0);
      return dateB - dateA;
    });

    elements.main.appendChild(createExpandCollapseButton('operations', items));
    renderGroupedItems(items);
  }

  function renderGroupedItems(items) {
    const groups = [
      {
        id: 'failure',
        title: chrome.i18n.getMessage('groupFailure'),
        statuses: ['failure'],
        open: true,
      },
      {
        id: 'progress',
        title: chrome.i18n.getMessage('groupProgress'),
        statuses: ['progress'],
        open: true,
      },
      {
        id: 'success',
        title: chrome.i18n.getMessage('groupSuccess'),
        statuses: ['success', 'neutral'],
        open: false,
      },
    ];

    groups.forEach((group) => {
      const groupItems = items.filter((item) => {
        const run = cache.runs?.[`${item.owner}/${item.repo}/${item.workflowFile}`];
        return group.statuses.includes(getWorkflowStatus(run));
      });

      const section = document.createElement('div');
      section.className = 'workspace-section';

      const header = document.createElement('div');
      header.className = 'accordion-header';
      const groupKey = `group:${group.id}`;
      // Groups use initial open logic if not manually toggled
      const isOpen =
        accordionStates[groupKey] !== undefined
          ? accordionStates[groupKey]
          : group.open && groupItems.length > 0;

      if (isOpen) header.classList.add('open');

      let statusClass = '';
      if (groupItems.length === 0) {
        statusClass = 'status-empty';
      } else {
        if (group.id === 'failure') statusClass = 'status-failure';
        else if (group.id === 'progress') statusClass = 'status-progress';
        else statusClass = 'status-success';
      }

      const emptyTag = `<span style="font-weight: normal; opacity: 0.6; font-size: 0.9em;">${escapeHtml(chrome.i18n.getMessage('groupEmpty'))}</span>`;

      header.innerHTML = `
        <div class="status-icon ${statusClass}"></div>
        <div class="group-title">${escapeHtml(group.title)} ${groupItems.length === 0 ? emptyTag : ''}</div>
        ${groupItems.length > 0 ? '<span class="material-symbols-outlined expand-icon">expand_more</span>' : ''}
      `;

      const content = document.createElement('div');
      content.className = 'accordion-content';
      const card = document.createElement('div');
      card.className = 'workspace-card';

      if (groupItems.length !== 0) {
        groupItems.forEach((item) => {
          const runKey = `${item.owner}/${item.repo}/${item.workflowFile}`;
          const ws = config.workspaces.find((w) =>
            w.items?.some(
              (i) =>
                i.owner === item.owner &&
                i.repo === item.repo &&
                i.workflowFile === item.workflowFile,
            ),
          );
          const auth = config.authConfigs.find((a) => a.id === ws?.authConfigId);
          card.appendChild(
            createActionRow(
              item,
              ws,
              cache.runs?.[runKey],
              cache.pages?.[`${item.owner}/${item.repo}`],
              cache.history?.[runKey],
              auth,
            ),
          );
        });
      }

      if (card.childNodes.length > 0) {
        content.appendChild(card);
      }

      header.onclick = () => {
        if (groupItems.length > 0) {
          const newState = header.classList.toggle('open');
          accordionStates[groupKey] = newState;
        }
      };

      section.appendChild(header);
      section.appendChild(content);
      elements.main.appendChild(section);
    });
  }

  function createActionRow(item, ws, run, pages, history, auth) {
    const card = document.createElement('div');
    card.className = 'workflow-row';

    const status = getWorkflowStatus(run);
    const statusClass = status !== 'neutral' ? `status-${status}` : '';

    let runInfoHtml = `<div class="run-info">${escapeHtml(chrome.i18n.getMessage('statusFetching'))}</div>`;
    if (run) {
      if (run.status === 'none') {
        runInfoHtml = `<div class="run-info">${escapeHtml(chrome.i18n.getMessage('statusNoHistory'))}</div>`;
      } else if (run.status === 'error') {
        const errText = chrome.i18n.getMessage('statusError', [
          run.error || chrome.i18n.getMessage('apiFetchError'),
        ]);
        runInfoHtml = `<div class="run-info" style="color: var(--md-sys-color-error)">${escapeHtml(errText)}</div>`;
      } else {
        const displayTitle = run.display_title
          ? `<strong>${escapeHtml(run.display_title)}</strong> `
          : '';
        const separator = run.display_title ? '| ' : '';
        runInfoHtml = `<div class="run-info">${displayTitle}<span style="opacity: 0.8">${separator}${escapeHtml(
          run.actor,
        )} | ${relativeTime(run.updated_at)}</span></div>`;
      }
    }

    const pagesText =
      pages?.status === 'deliverable'
        ? chrome.i18n.getMessage('pagesDeployed')
        : chrome.i18n.getMessage('pagesProcessing');

    card.innerHTML = `
      <div class="row-main">
        <div class="status-icon ${statusClass}"></div>
        <div class="workflow-name">${escapeHtml(item.alias || item.workflowFile)} <span class="repo-info">(${escapeHtml(item.owner)}/${escapeHtml(item.repo)})</span></div>
        ${run?.conclusion === 'failure' ? '<button class="icon-btn log-toggle"><span class="material-symbols-outlined" style="font-size: 18px;">terminal</span></button>' : ''}
      </div>
      <div class="log-area"></div>
      <div class="row-sub">
        <div style="min-width: 0; flex-grow: 1;">${runInfoHtml}</div>
        <div class="history-dots">${[...(history || [])]
          .reverse()
          .map((h) => {
            const hStatus = getWorkflowStatus(h);
            const hStatusClass = hStatus !== 'neutral' ? `status-${hStatus}` : '';
            return `<div class="dot ${hStatusClass}"></div>`;
          })
          .join('')}</div>
        ${
          pages && run?.conclusion === 'success'
            ? `<div class="pages-badge"><span>🌐</span><span>${escapeHtml(pagesText)}</span></div>`
            : ''
        }
      </div>
    `;

    if (run?.conclusion === 'failure' && auth) {
      const logToggle = card.querySelector('.log-toggle');
      const logArea = card.querySelector('.log-area');
      logToggle.onclick = (event) => {
        event.stopPropagation();
        if (logArea.style.display === 'block') logArea.style.display = 'none';
        else fetchAndShowLogs(run, logArea, auth);
      };
    }

    card.onclick = () => run?.html_url && chrome.tabs.create({ url: run.html_url });
    return card;
  }

  async function fetchWithTimeout(resource, options = {}) {
    const { timeout = 15000 } = options;

    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(resource, {
        ...options,
        signal: controller.signal,
      });
      return response;
    } finally {
      clearTimeout(id);
    }
  }

  async function fetchAndShowLogs(run, logArea, auth) {
    logArea.textContent = chrome.i18n.getMessage('logFetching');
    logArea.style.display = 'block';
    try {
      const res = await fetchWithTimeout(`${run.jobs_url}`, {
        headers: { Authorization: `token ${auth.pat}` },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const failedJob = data.jobs.find((j) => j.conclusion === 'failure');
      if (failedJob) {
        const failedStep = failedJob.steps.find((s) => s.conclusion === 'failure');
        logArea.textContent = chrome.i18n.getMessage('logFailedStep', [
          failedStep?.name || failedJob.name,
          failedJob.html_url,
        ]);
      } else {
        logArea.textContent = chrome.i18n.getMessage('logNoFailedJob');
      }
    } catch (err) {
      console.error(
        '[ActionsBoard-Solo] fetchAndShowLogs error: ' +
          (err?.name || 'Error') +
          ' ' +
          (err?.message || err),
        err,
      );
      logArea.textContent = chrome.i18n.getMessage('logFetchFailed');
    }
  }

  function getAllItems() {
    const items = [];
    config.workspaces?.forEach((ws) =>
      ws.items?.forEach((item) => {
        const key = `${item.owner}/${item.repo}/${item.workflowFile}`;
        if (!items.find((i) => `${i.owner}/${i.repo}/${i.workflowFile}` === key)) items.push(item);
      }),
    );
    return items;
  }

  function createExpandCollapseButton(mode, itemsOrWorkspaces) {
    let isExpandAction = true;
    let isDisabled = true;

    if (mode === 'team') {
      const activeWorkspaces = (itemsOrWorkspaces || []).filter((ws) => ws.items?.length > 0);
      isDisabled = activeWorkspaces.length === 0;
      if (!isDisabled) {
        const allOpen = activeWorkspaces.every((ws) => !!accordionStates[`ws:${ws.id}`]);
        isExpandAction = !allOpen;
      }
    } else {
      const items = itemsOrWorkspaces || [];
      isDisabled = items.length === 0;
      if (!isDisabled) {
        const groups = [
          { id: 'failure', statuses: ['failure'], open: true },
          { id: 'progress', statuses: ['progress'], open: true },
          { id: 'success', statuses: ['success', 'neutral'], open: false },
        ];
        const activeGroups = groups.filter((group) =>
          items.some((item) => {
            const run = cache.runs?.[`${item.owner}/${item.repo}/${item.workflowFile}`];
            return group.statuses.includes(getWorkflowStatus(run));
          }),
        );
        const allOpen =
          activeGroups.length > 0 &&
          activeGroups.every((group) => {
            const groupKey = `group:${group.id}`;
            return accordionStates[groupKey] !== undefined ? accordionStates[groupKey] : group.open;
          });
        isExpandAction = !allOpen;
      }
    }

    const container = document.createElement('div');
    container.className = 'controls-row';

    const btn = document.createElement('button');
    btn.className = 'icon-btn';
    btn.dataset.tooltip = isExpandAction
      ? chrome.i18n.getMessage('tooltipExpandAll')
      : chrome.i18n.getMessage('tooltipCollapseAll');
    btn.dataset.tooltipPosition = 'bottom';
    btn.dataset.tooltipAlign = 'right';
    btn.disabled = isDisabled;

    btn.innerHTML = `<span class="material-symbols-outlined">${isExpandAction ? 'expand_all' : 'collapse_all'}</span>`;

    btn.onclick = () => {
      if (mode === 'team') {
        config.workspaces.forEach((ws) => {
          accordionStates[`ws:${ws.id}`] = isExpandAction;
        });
      } else {
        ['failure', 'progress', 'success'].forEach((groupId) => {
          accordionStates[`group:${groupId}`] = isExpandAction;
        });
      }
      render();
    };

    container.appendChild(btn);
    return container;
  }

  function relativeTime(dateStr) {
    if (!dateStr) return '';
    const diff = Math.round((new Date() - new Date(dateStr)) / 1000);
    if (diff < 60) return chrome.i18n.getMessage('timeJustNow');
    if (diff < 3600)
      return chrome.i18n.getMessage('timeMinutesAgo', [Math.floor(diff / 60).toString()]);
    if (diff < 86400)
      return chrome.i18n.getMessage('timeHoursAgo', [Math.floor(diff / 3600).toString()]);
    return chrome.i18n.getMessage('timeDaysAgo', [Math.floor(diff / 86400).toString()]);
  }

  function escapeHtml(str) {
    return str
      ? str.replace(
          /[&<>"']/g,
          (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m],
        )
      : '';
  }
});
