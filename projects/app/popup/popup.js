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

  async function init() {
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
    currentUser = data.currentUser || {};

    cache = data.cache || { runs: {}, pages: {}, history: {} };
    currentMode = data.activeMode || 'developer';

    elements.tabs.forEach((tab) =>
      tab.classList.toggle('active', tab.dataset.mode === currentMode),
    );

    if (config.authConfigs?.length) {
      let changed = false;
      for (const auth of config.authConfigs) {
        if (!currentUser[auth.id]) {
          const login = await getCurrentUser(auth);
          if (login) {
            currentUser[auth.id] = login;
            changed = true;
          }
        }
      }
      if (changed) {
        await chrome.storage.local.set({ currentUser });
      }
    }
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
        <p class="md-sys-typescale-title-medium">セットアップが必要です</p>
        <button class="btn-primary" style="margin-top: 16px;" id="go-to-settings">設定を開く</button>
      </div>
    `;
    document.getElementById('go-to-settings').onclick = () => chrome.runtime.openOptionsPage();
  }

  function getWorkflowStatus(run) {
    if (!run || run.status === 'none') return 'neutral';
    if (run.status === 'error' || run.conclusion === 'failure') return 'failure';
    if (run.status === 'queued' || run.status === 'in_progress') return 'progress';
    if (run.conclusion === 'success' || run.conclusion === 'cancelled') return 'success';
    return 'neutral';
  }

  function renderDeveloperMode() {
    const allItems = getAllItems();
    const myActivity = allItems.filter((item) => {
      const run = cache.runs[`${item.owner}/${item.repo}/${item.workflowFile}`];
      if (!run) return false;
      const ws = config.workspaces.find((w) =>
        w.items?.some(
          (i) =>
            i.owner === item.owner && i.repo === item.repo && i.workflowFile === item.workflowFile,
        ),
      );
      if (!ws) return false;
      return run.actor === currentUser[ws.authConfigId];
    });

    if (myActivity.length === 0) {
      elements.main.innerHTML = '<p class="empty-state">アクティビティが見つかりませんでした。</p>';
      return;
    }

    renderGroupedItems(myActivity);
  }

  function renderTeamMode() {
    config.workspaces.forEach((ws) => {
      if (!ws.items?.length) return;

      let successCount = 0;
      let failureCount = 0;
      let progressCount = 0;
      let wsStatus = 'success';

      ws.items.forEach((item) => {
        const run = cache.runs[`${item.owner}/${item.repo}/${item.workflowFile}`];
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
      const statusClass =
        wsStatus === 'failure'
          ? 'status-failure'
          : wsStatus === 'progress'
            ? 'status-progress'
            : 'status-success';

      header.innerHTML = `
        <div class="workspace-header-top">
          <div class="status-icon ${statusClass}"></div>
          <div class="ws-name">${escapeHtml(ws.name)}</div>
          <span class="material-symbols-outlined expand-icon">expand_more</span>
        </div>
        <div class="workspace-stats">
          成功: ${successCount}, 失敗: ${failureCount}, 実行中: ${progressCount}
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
            cache.runs[runKey],
            cache.pages[`${item.owner}/${item.repo}`],
            cache.history[runKey],
            auth,
          ),
        );
      });

      content.appendChild(card);
      header.onclick = () => {
        header.classList.toggle('open');
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
      const runA = cache.runs[`${a.owner}/${a.repo}/${a.workflowFile}`];
      const runB = cache.runs[`${b.owner}/${b.repo}/${b.workflowFile}`];
      const dateA = runA?.updated_at ? new Date(runA.updated_at) : new Date(0);
      const dateB = runB?.updated_at ? new Date(runB.updated_at) : new Date(0);
      return dateB - dateA;
    });
    renderGroupedItems(items);
  }

  function renderGroupedItems(items) {
    const groups = [
      { id: 'failure', title: '失敗及びエラー', statuses: ['failure'], open: true },
      { id: 'progress', title: '実行中', statuses: ['progress'], open: true },
      { id: 'success', title: '成功及びキャンセル', statuses: ['success', 'neutral'], open: false },
    ];

    groups.forEach((group) => {
      const groupItems = items.filter((item) => {
        const run = cache.runs[`${item.owner}/${item.repo}/${item.workflowFile}`];
        return group.statuses.includes(getWorkflowStatus(run));
      });

      const section = document.createElement('div');
      section.className = 'workspace-section';

      const header = document.createElement('div');
      header.className = 'accordion-header';
      if (group.open) header.classList.add('open');

      let statusClass = '';
      if (groupItems.length === 0) {
        statusClass = 'status-empty';
      } else {
        if (group.id === 'failure') statusClass = 'status-failure';
        else if (group.id === 'progress') statusClass = 'status-progress';
        else statusClass = 'status-success';
      }

      header.innerHTML = `
        <div class="status-icon ${statusClass}"></div>
        <div class="group-title">${group.title} ${
          groupItems.length === 0
            ? '<span style="font-weight: normal; opacity: 0.6; font-size: 0.9em;">(空)</span>'
            : ''
        }</div>
        <span class="material-symbols-outlined expand-icon">expand_more</span>
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
              cache.runs[runKey],
              cache.pages[`${item.owner}/${item.repo}`],
              cache.history[runKey],
              auth,
            ),
          );
        });
      }

      if (card.childNodes.length > 0) {
        content.appendChild(card);
      }

      header.onclick = () => {
        header.classList.toggle('open');
      };

      section.appendChild(header);
      section.appendChild(content);
      elements.main.appendChild(section);
    });
  }

  function createActionRow(item, ws, run, pages, history, auth) {
    const card = document.createElement('div');
    card.className = 'workflow-row';
    const statusClass =
      run && run.status !== 'none' && run.status !== 'error'
        ? run.status === 'completed'
          ? run.conclusion === 'success'
            ? 'status-success'
            : 'status-failure'
          : 'status-progress'
        : '';

    let runInfoHtml = '<div class="run-info">取得中...</div>';
    if (run) {
      if (run.status === 'none') {
        runInfoHtml = '<div class="run-info">実行履歴がありません</div>';
      } else if (run.status === 'error') {
        runInfoHtml = `<div class="run-info" style="color: var(--md-sys-color-error)">エラー: ${escapeHtml(
          run.error || '取得失敗',
        )}</div>`;
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

    card.innerHTML = `
      <div class="row-main">
        <div class="status-icon ${statusClass}"></div>
        <div class="workflow-name">${escapeHtml(item.alias || item.workflowFile)} <span class="repo-info">(${escapeHtml(item.owner)}/${escapeHtml(item.repo)})</span></div>
        ${run?.conclusion === 'failure' ? '<button class="icon-btn log-toggle">📜</button>' : ''}
      </div>
      <div class="log-area"></div>
      <div class="row-sub">
        <div style="min-width: 0; flex-grow: 1;">${runInfoHtml}</div>
        <div class="history-dots">${[...(history || [])]
          .reverse()
          .map(
            (h) =>
              `<div class="dot ${
                h.status === 'completed'
                  ? h.conclusion === 'success'
                    ? 'status-success'
                    : 'status-failure'
                  : 'status-progress'
              }"></div>`,
          )
          .join('')}</div>
        ${
          pages && run?.conclusion === 'success'
            ? `<div class="pages-badge"><span>🌐</span><span>${
                pages.status === 'deliverable' ? 'Deployed' : 'Processing...'
              }</span></div>`
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

  async function fetchAndShowLogs(run, logArea, auth) {
    logArea.textContent = 'ログを取得中...';
    logArea.style.display = 'block';
    try {
      const res = await fetch(`${run.jobs_url}`, {
        headers: { Authorization: `token ${auth.pat}` },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const failedJob = data.jobs.find((j) => j.conclusion === 'failure');
      if (failedJob) {
        const failedStep = failedJob.steps.find((s) => s.conclusion === 'failure');
        logArea.textContent = `Failed at: ${failedStep?.name || failedJob.name}\n${
          failedJob.html_url
        }`;
      } else {
        logArea.textContent = '失敗ジョブの詳細が見つかりませんでした。';
      }
    } catch {
      logArea.textContent = 'ログの取得に失敗しました。';
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

  async function getCurrentUser(settings) {
    try {
      const res = await fetch(`${settings.baseUrl}/user`, {
        headers: { Authorization: `token ${settings.pat}` },
      });
      if (res.ok) return (await res.json()).login;
    } catch {
      // Ignore authentication errors during initialization
    }
    return null;
  }

  function relativeTime(dateStr) {
    if (!dateStr) return '';
    const diff = Math.round((new Date() - new Date(dateStr)) / 1000);
    if (diff < 60) return 'たった今';
    if (diff < 3600) return `${Math.floor(diff / 60)}分前`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}時間前`;
    return `${Math.floor(diff / 86400)}日前`;
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
