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
    const favorites = allItems.filter((item) => item.isFavorite);
    if (favorites.length) renderSection('お気に入り / ピン留め', favorites);
    if (myActivity.length) renderSection('マイ・アクティビティ', myActivity);
    else if (!favorites.length)
      elements.main.innerHTML +=
        '<p class="empty-state">アクティビティが見つかりませんでした。</p>';
  }

  function renderTeamMode() {
    config.workspaces.forEach((ws) => ws.items?.length && renderSection(ws.name, ws.items));
  }

  function renderOperationsMode() {
    renderSection('全リポジトリ監視 (Pages同期)', getAllItems());
  }

  function renderSection(title, items) {
    const section = document.createElement('div');
    section.className = 'workspace-section';
    section.innerHTML = `<div class="workspace-title">${escapeHtml(title)}</div>`;

    const wsCard = document.createElement('div');
    wsCard.className = 'workspace-card';

    items.forEach((item) => {
      const runKey = `${item.owner}/${item.repo}/${item.workflowFile}`;
      const ws = config.workspaces.find((w) =>
        w.items?.some(
          (i) =>
            i.owner === item.owner && i.repo === item.repo && i.workflowFile === item.workflowFile,
        ),
      );
      const auth = config.authConfigs.find((a) => a.id === ws?.authConfigId);

      wsCard.appendChild(
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
    section.appendChild(wsCard);
    elements.main.appendChild(section);
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
