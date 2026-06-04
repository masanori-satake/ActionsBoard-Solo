/**
 * ActionsBoard-Solo Options Script
 */

document.addEventListener('DOMContentLoaded', async () => {
  const elements = {
    authList: document.getElementById('auth-list'),
    addAuthBtn: document.getElementById('add-auth'),
    workspaceList: document.getElementById('workspace-list'),
    addWorkspaceBtn: document.getElementById('add-workspace'),
    addWorkspaceRepoBtn: document.getElementById('add-workspace-repo'),
    toast: document.getElementById('toast'),
    modal: document.getElementById('modal'),
    modalTitle: document.getElementById('modal-title'),
    errorMsg: document.getElementById('error-msg'),
    modalContent: document.getElementById('modal-content'),
    modalSave: document.getElementById('modal-save'),
    modalCancel: document.getElementById('modal-cancel'),
    notifScope: document.getElementById('notif-scope'),
    notifWorkspacesContainer: document.getElementById('notif-workspaces-container'),
    notifWorkspacesList: document.getElementById('notif-workspaces-list'),
    notifEventFailure: document.getElementById('notif-event-failure'),
    notifEventPages: document.getElementById('notif-event-pages'),
    versionDisplay: document.getElementById('version-display'),
  };

  // Display version from manifest
  const manifest = chrome.runtime.getManifest();
  if (elements.versionDisplay) {
    elements.versionDisplay.textContent = `v${manifest.version}`;
  }

  let config = {
    authConfigs: [],
    workspaces: [],
    notificationSettings: {
      scope: 'all', // all, my-activity, workspaces
      workspaces: [], // list of workspace IDs
      events: ['failure'], // failure, pages
    },
  };

  const DEFAULT_API_URL = 'https://api.github.com';

  // --- Initialization ---

  async function loadConfig() {
    const data = await chrome.storage.local.get([
      'authConfigs',
      'settings',
      'workspaces',
      'notificationSettings',
    ]);

    // Migration
    if (data.authConfigs) {
      config.authConfigs = data.authConfigs;
    } else if (data.settings?.pat) {
      config.authConfigs = [
        {
          id: 'default',
          name: 'デフォルト',
          pat: data.settings.pat,
          baseUrl: data.settings.baseUrl || DEFAULT_API_URL,
        },
      ];
      await chrome.storage.local.set({ authConfigs: config.authConfigs });
    }

    if (data.workspaces) {
      config.workspaces = data.workspaces;
      // Ensure all workspaces have an authConfigId
      let changed = false;
      config.workspaces.forEach((ws) => {
        if (!ws.authConfigId && config.authConfigs.length > 0) {
          ws.authConfigId = config.authConfigs[0].id;
          changed = true;
        }
      });
      if (changed) {
        await chrome.storage.local.set({ workspaces: config.workspaces });
      }
    }

    if (data.notificationSettings) {
      config.notificationSettings = {
        ...config.notificationSettings,
        ...data.notificationSettings,
      };
    }

    renderAuthConfigs();
    renderWorkspaces();
    renderNotificationSettings();
  }

  await loadConfig();

  // --- UI Helpers ---

  function showToast(message, duration = 3000) {
    elements.toast.textContent = message;
    elements.toast.style.display = 'block';
    setTimeout(() => {
      elements.toast.style.display = 'none';
    }, duration);
  }

  // --- API Settings Logic ---

  function renderAuthConfigs() {
    elements.authList.innerHTML = '';
    if (config.authConfigs.length === 0) {
      elements.authList.innerHTML =
        '<p class="md-sys-typescale-body-large" style="text-align: center; opacity: 0.6; padding: var(--md-sys-spacing-2);">認証設定が登録されていません。</p>';
      return;
    }

    config.authConfigs.forEach((auth, idx) => {
      const card = document.createElement('div');
      card.className = 'auth-card';
      card.innerHTML = `
        <div style="flex-grow: 1;">
          <div class="md-sys-typescale-title-medium">${escapeHtml(auth.name)}</div>
          <div class="hint">${escapeHtml(auth.baseUrl)}</div>
        </div>
        <div class="button-row" style="margin-top: 0">
          <button class="btn-icon-m3 test-auth-btn" data-idx="${idx}" data-tooltip="テスト"><span class="material-symbols-outlined">sync</span></button>
          <button class="btn-icon-m3 edit-auth-btn" data-idx="${idx}" data-tooltip="編集"><span class="material-symbols-outlined">edit</span></button>
          <button class="btn-icon-m3 del-auth-btn btn-error" data-idx="${idx}" data-tooltip="削除" data-tooltip-align="right"><span class="material-symbols-outlined">delete_sweep</span></button>
        </div>
      `;
      elements.authList.appendChild(card);
    });

    document.querySelectorAll('.test-auth-btn').forEach((btn) => {
      btn.onclick = async () => {
        const auth = config.authConfigs[parseInt(btn.dataset.idx)];
        showToast(`${auth.name} の接続テスト中...`);
        const result = await testAuthConfig(auth);
        if (result.success) {
          showToast(`接続成功: ${result.login} として認証されました。`);
        } else {
          showToast(result.message);
        }
      };
    });
    document.querySelectorAll('.edit-auth-btn').forEach((btn) => {
      btn.onclick = () => openAuthModal(parseInt(btn.dataset.idx));
    });
    document.querySelectorAll('.del-auth-btn').forEach((btn) => {
      btn.onclick = () => deleteAuthConfig(parseInt(btn.dataset.idx));
    });
  }

  async function testAuthConfig(auth) {
    // Request host permission if not already granted (e.g., GHE domains)
    if (auth.baseUrl !== DEFAULT_API_URL) {
      try {
        const origin = new URL(auth.baseUrl).origin + '/*';
        const granted = await chrome.permissions.request({ origins: [origin] });
        if (!granted) {
          return { success: false, message: 'APIへのアクセス権限が拒否されました。' };
        }
      } catch {
        return { success: false, message: '無効な API ベース URL です。' };
      }
    }

    try {
      const response = await fetch(`${auth.baseUrl}/user`, {
        headers: {
          Authorization: `token ${auth.pat}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      if (response.ok) {
        const user = await response.json();
        return { success: true, login: user.login };
      } else {
        let errMsg = `${response.status} ${response.statusText}`;
        try {
          const err = await response.json();
          errMsg = err.message || errMsg;
        } catch {
          /* ignore */
        }
        return { success: false, message: `接続失敗: ${errMsg}` };
      }
    } catch (err) {
      return { success: false, message: `エラー: ${err?.message || err}` };
    }
  }

  function openAuthModal(index = -1) {
    const isEdit = index !== -1;
    elements.modalTitle.textContent = isEdit ? 'アカウント編集' : 'アカウント追加';
    elements.errorMsg.style.display = 'none';
    elements.modalSave.textContent = 'テスト&保存';

    const auth = isEdit
      ? config.authConfigs[index]
      : { name: '', pat: '', baseUrl: DEFAULT_API_URL };

    elements.modalContent.innerHTML = `
      <div class="field">
        <label>設定名</label>
        <input type="text" id="m-auth-name" value="${escapeHtml(
          auth.name,
        )}" placeholder="例: パブリックGitHub" />
      </div>
      <div class="field">
        <label>個人アクセストークン (PAT)</label>
        <input type="password" id="m-auth-pat" value="${escapeHtml(
          auth.pat,
        )}" placeholder="ghp_..." />
        <div class="hint">\`repo\`, \`workflow\`, \`notifications\` 権限が必要です。</div>
      </div>
      <div class="field" style="flex-direction: row; align-items: center; gap: 10px; margin-bottom: 8px;">
        <input type="checkbox" id="m-auth-public" ${
          auth.baseUrl === DEFAULT_API_URL ? 'checked' : ''
        } style="width: 18px; height: 18px;" />
        <label for="m-auth-public" style="margin-bottom: 0;">パブリックな GitHub (github.com) を使用</label>
      </div>
      <div class="field">
        <label>API ベース URL</label>
        <input type="text" id="m-auth-url" value="${escapeHtml(auth.baseUrl)}" ${
          auth.baseUrl === DEFAULT_API_URL ? 'disabled' : ''
        } />
        <div class="hint">GHE の場合は \`https://{hostname}/api/v3\` を入力してください。</div>
      </div>
    `;

    const publicCheck = document.getElementById('m-auth-public');
    const urlInput = document.getElementById('m-auth-url');
    publicCheck.onchange = () => {
      if (publicCheck.checked) {
        urlInput.value = DEFAULT_API_URL;
        urlInput.disabled = true;
      } else {
        urlInput.disabled = false;
      }
    };

    elements.modalSave.onclick = async () => {
      elements.errorMsg.style.display = 'none';
      const name = document.getElementById('m-auth-name').value.trim();
      const pat = document.getElementById('m-auth-pat').value.trim();
      const baseUrl = document.getElementById('m-auth-url').value.trim() || DEFAULT_API_URL;

      if (!name || !pat) {
        elements.errorMsg.textContent = '設定名とPATを入力してください。';
        elements.errorMsg.style.display = 'block';
        return;
      }

      elements.modalSave.disabled = true;
      elements.modalSave.textContent = 'テスト中...';

      const testResult = await testAuthConfig({ name, pat, baseUrl });

      if (!testResult.success) {
        elements.errorMsg.textContent = testResult.message;
        elements.errorMsg.style.display = 'block';
        elements.modalSave.disabled = false;
        elements.modalSave.textContent = 'テスト&保存';
        return;
      }

      if (isEdit) {
        config.authConfigs[index] = { ...config.authConfigs[index], name, pat, baseUrl };
      } else {
        config.authConfigs.push({ id: Date.now().toString(), name, pat, baseUrl });
      }

      await chrome.storage.local.set({ authConfigs: config.authConfigs, currentUser: null });
      chrome.runtime.sendMessage({ action: 'poll' });
      renderAuthConfigs();
      elements.modal.close();
      showToast(`${testResult.login} として保存しました。`);
      elements.modalSave.disabled = false;
    };

    elements.modal.showModal();
  }

  async function deleteAuthConfig(index) {
    const auth = config.authConfigs[index];
    const isUsed = config.workspaces.some((ws) => ws.authConfigId === auth.id);
    if (isUsed) {
      alert('この認証設定はワークスペースで使用されているため、削除できません。');
      return;
    }

    if (confirm(`認証設定「${auth.name}」を削除してもよろしいですか？`)) {
      config.authConfigs.splice(index, 1);
      await chrome.storage.local.set({ authConfigs: config.authConfigs });
      renderAuthConfigs();
    }
  }

  elements.addAuthBtn.onclick = () => openAuthModal();

  // --- Workspace Logic ---

  function renderWorkspaces() {
    elements.workspaceList.innerHTML = '';

    if (config.workspaces.length === 0) {
      elements.workspaceList.innerHTML =
        '<p class="md-sys-typescale-body-large" style="text-align: center; opacity: 0.6; padding: var(--md-sys-spacing-4);">ワークスペースが登録されていません。</p>';
      return;
    }

    config.workspaces.forEach((ws, wsIdx) => {
      const card = document.createElement('div');
      card.className = 'workspace-card';
      card.draggable = true;
      card.dataset.wsIdx = wsIdx;

      const header = document.createElement('div');
      header.className = 'workspace-header';
      header.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
          <span class="material-symbols-outlined drag-handle ws-drag-handle">drag_indicator</span>
          <h3 class="md-sys-typescale-title-medium" style="margin: 0;">${escapeHtml(ws.name)}</h3>
        </div>
        <div class="button-row" style="margin-top: 0">
          <button class="btn-icon-m3 add-item-btn" data-ws-idx="${wsIdx}" data-tooltip="追加"><span class="material-symbols-outlined">add</span></button>
          <button class="btn-icon-m3 edit-ws-btn" data-ws-idx="${wsIdx}" data-tooltip="編集"><span class="material-symbols-outlined">edit</span></button>
          <button class="btn-icon-m3 del-ws-btn btn-error" data-ws-idx="${wsIdx}" data-tooltip="削除" data-tooltip-align="right"><span class="material-symbols-outlined">delete_sweep</span></button>
        </div>
      `;
      card.appendChild(header);

      const itemList = document.createElement('div');
      itemList.className = 'item-list';
      itemList.dataset.wsIdx = wsIdx;

      (ws.items || []).forEach((item, itemIdx) => {
        const row = document.createElement('div');
        row.className = 'item-row';
        row.draggable = true;
        row.dataset.wsIdx = wsIdx;
        row.dataset.itemIdx = itemIdx;
        row.innerHTML = `
          <span class="material-symbols-outlined drag-handle item-drag-handle" style="font-size: 20px;">drag_indicator</span>
          <span class="badge-fav">${item.isFavorite ? '★' : '☆'}</span>
          <div style="flex-grow: 1; min-width: 0;">
            <div class="item-name">${escapeHtml(item.alias || item.workflowFile)}</div>
            <div class="item-repo">${escapeHtml(item.owner)}/${escapeHtml(item.repo)}</div>
          </div>
          <button class="btn-icon-m3 edit-item-btn" data-ws-idx="${wsIdx}" data-item-idx="${itemIdx}" data-tooltip="編集"><span class="material-symbols-outlined">edit</span></button>
          <button class="btn-icon-m3 del-item-btn btn-error" data-ws-idx="${wsIdx}" data-item-idx="${itemIdx}" data-tooltip="削除" data-tooltip-align="right"><span class="material-symbols-outlined">delete_sweep</span></button>
        `;
        itemList.appendChild(row);
      });

      card.appendChild(itemList);
      elements.workspaceList.appendChild(card);
    });

    // Attach events to dynamically rendered buttons
    attachDynamicEvents();
  }

  function attachDynamicEvents() {
    // Drag and Drop for Workspaces
    const workspaceCards = document.querySelectorAll('.workspace-card');
    workspaceCards.forEach((card) => {
      card.addEventListener('dragstart', (e) => {
        e.stopPropagation();
        e.dataTransfer.setData('text/plain', `ws:${card.dataset.wsIdx}`);
        card.classList.add('dragging');
      });
      card.addEventListener('dragend', () => {
        card.classList.remove('dragging');
        workspaceCards.forEach((c) => c.classList.remove('drag-over'));
      });
      card.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        card.classList.add('drag-over');
      });
      card.addEventListener('dragleave', () => {
        card.classList.remove('drag-over');
      });
      card.addEventListener('drop', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        card.classList.remove('drag-over');
        const data = e.dataTransfer.getData('text/plain');
        if (data.startsWith('ws:')) {
          const fromIdx = parseInt(data.split(':')[1], 10);
          const toIdx = parseInt(card.dataset.wsIdx, 10);
          if (
            !isNaN(fromIdx) &&
            !isNaN(toIdx) &&
            fromIdx !== toIdx &&
            fromIdx >= 0 &&
            fromIdx < config.workspaces.length &&
            toIdx >= 0 &&
            toIdx < config.workspaces.length
          ) {
            const moved = config.workspaces.splice(fromIdx, 1)[0];
            config.workspaces.splice(toIdx, 0, moved);
            await saveWorkspaces();
          }
        }
      });
    });

    // Drag and Drop for Items
    const itemRows = document.querySelectorAll('.item-row');
    itemRows.forEach((row) => {
      row.addEventListener('dragstart', (e) => {
        e.stopPropagation();
        e.dataTransfer.setData('text/plain', `item:${row.dataset.wsIdx}:${row.dataset.itemIdx}`);
        row.classList.add('dragging');
      });
      row.addEventListener('dragend', () => {
        row.classList.remove('dragging');
        itemRows.forEach((r) => r.classList.remove('drag-over'));
      });
      row.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        row.classList.add('drag-over');
      });
      row.addEventListener('dragleave', () => {
        row.classList.remove('drag-over');
      });
      row.addEventListener('drop', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        row.classList.remove('drag-over');
        const data = e.dataTransfer.getData('text/plain');
        if (data.startsWith('item:')) {
          const parts = data.split(':');
          const fromWsIdx = parseInt(parts[1], 10);
          const fromItemIdx = parseInt(parts[2], 10);
          const toWsIdx = parseInt(row.dataset.wsIdx, 10);
          const toItemIdx = parseInt(row.dataset.itemIdx, 10);

          if (isNaN(fromWsIdx) || isNaN(fromItemIdx) || isNaN(toWsIdx) || isNaN(toItemIdx)) return;

          const fromWs = config.workspaces[fromWsIdx];
          const toWs = config.workspaces[toWsIdx];
          if (!fromWs || !toWs || !fromWs.items || !toWs.items) return;
          if (
            fromItemIdx < 0 ||
            fromItemIdx >= fromWs.items.length ||
            toItemIdx < 0 ||
            toItemIdx >= toWs.items.length
          )
            return;

          if (fromWsIdx === toWsIdx && fromItemIdx !== toItemIdx) {
            const moved = fromWs.items.splice(fromItemIdx, 1)[0];
            toWs.items.splice(toItemIdx, 0, moved);
            await saveWorkspaces();
          } else if (fromWsIdx !== toWsIdx) {
            const moved = fromWs.items.splice(fromItemIdx, 1)[0];
            toWs.items.splice(toItemIdx, 0, moved);
            await saveWorkspaces();
          }
        }
      });
    });

    // Support dropping items into empty workspaces or end of list
    const itemLists = document.querySelectorAll('.item-list');
    itemLists.forEach((list) => {
      list.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        list.classList.add('drag-over');
      });
      list.addEventListener('dragleave', () => {
        list.classList.remove('drag-over');
      });
      list.addEventListener('drop', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        list.classList.remove('drag-over');
        const data = e.dataTransfer.getData('text/plain');
        if (data.startsWith('item:')) {
          if (e.target.closest('.item-row')) return;

          const parts = data.split(':');
          const fromWsIdx = parseInt(parts[1], 10);
          const fromItemIdx = parseInt(parts[2], 10);
          const toWsIdx = parseInt(list.dataset.wsIdx, 10);

          if (isNaN(fromWsIdx) || isNaN(fromItemIdx) || isNaN(toWsIdx)) return;

          const fromWs = config.workspaces[fromWsIdx];
          const toWs = config.workspaces[toWsIdx];
          if (!fromWs || !toWs || !fromWs.items) return;
          if (fromItemIdx < 0 || fromItemIdx >= fromWs.items.length) return;

          if (!toWs.items) {
            toWs.items = [];
          }

          const moved = fromWs.items.splice(fromItemIdx, 1)[0];
          toWs.items.push(moved);
          await saveWorkspaces();
        }
      });
    });

    document.querySelectorAll('.edit-ws-btn').forEach((btn) => {
      btn.onclick = () => openWorkspaceModal(parseInt(btn.dataset.wsIdx));
    });
    document.querySelectorAll('.del-ws-btn').forEach((btn) => {
      btn.onclick = () => deleteWorkspace(parseInt(btn.dataset.wsIdx));
    });
    document.querySelectorAll('.add-item-btn').forEach((btn) => {
      btn.onclick = () => openItemModal(parseInt(btn.dataset.wsIdx));
    });
    document.querySelectorAll('.edit-item-btn').forEach((btn) => {
      btn.onclick = () => openItemModal(parseInt(btn.dataset.wsIdx), parseInt(btn.dataset.itemIdx));
    });
    document.querySelectorAll('.del-item-btn').forEach((btn) => {
      btn.onclick = () => deleteItem(parseInt(btn.dataset.wsIdx), parseInt(btn.dataset.itemIdx));
    });
  }

  // --- Modal Logic ---

  function openWorkspaceModal(index = -1) {
    const isEdit = index !== -1;
    elements.modalTitle.textContent = isEdit ? 'ワークスペース編集' : 'ワークスペース追加';
    elements.errorMsg.style.display = 'none';
    elements.modalSave.textContent = '保存';
    const ws = isEdit
      ? config.workspaces[index]
      : { name: '', authConfigId: config.authConfigs[0]?.id || '' };

    let authOptions = config.authConfigs
      .map(
        (auth) =>
          `<option value="${auth.id}" ${auth.id === ws.authConfigId ? 'selected' : ''}>${escapeHtml(
            auth.name,
          )}</option>`,
      )
      .join('');

    elements.modalContent.innerHTML = `
      <div class="field">
        <label>ワークスペース名</label>
        <input type="text" id="modal-ws-name" value="${escapeHtml(
          ws.name,
        )}" placeholder="例: 認証サブシステム" />
      </div>
      <div class="field">
        <label>使用する認証設定</label>
        <select id="modal-ws-auth">
          ${authOptions}
        </select>
      </div>
    `;

    elements.modalSave.onclick = async () => {
      const name = document.getElementById('modal-ws-name').value.trim();
      const authConfigId = document.getElementById('modal-ws-auth').value;
      if (!name || !authConfigId) {
        elements.errorMsg.textContent = '必須項目を入力してください。';
        elements.errorMsg.style.display = 'block';
        return;
      }

      if (isEdit) {
        config.workspaces[index].name = name;
        config.workspaces[index].authConfigId = authConfigId;
      } else {
        config.workspaces.push({ id: Date.now().toString(), name, authConfigId, items: [] });
      }

      await saveWorkspaces();
      elements.modal.close();
    };

    elements.modal.showModal();
  }

  function openItemModal(wsIdx, itemIdx = -1) {
    const isEdit = itemIdx !== -1;
    elements.modalTitle.textContent = isEdit ? '監視項目の編集' : '監視項目の追加';
    elements.errorMsg.style.display = 'none';
    elements.modalSave.textContent = '保存';
    const item = isEdit
      ? config.workspaces[wsIdx].items[itemIdx]
      : { owner: '', repo: '', workflowFile: '', alias: '', isFavorite: false };

    elements.modalContent.innerHTML = `
      <div class="field">
        <label>URL (一括入力)</label>
        <input type="text" id="m-url-shortcut" placeholder="例: https://github.com/owner/repo/actions/workflows/ci.yml" />
        <div class="hint">URLを入力すると下の項目が自動入力されます。</div>
      </div>
      <hr style="border: none; border-top: 1px dashed var(--md-sys-color-outline-variant); margin: 16px 0;" />
      <div class="field">
        <label>リポジトリ所有者 (Owner)</label>
        <input type="text" id="m-owner" value="${escapeHtml(
          item.owner,
        )}" placeholder="例: facebook" />
      </div>
      <div class="field">
        <label>リポジトリ名 (Repo)</label>
        <input type="text" id="m-repo" value="${escapeHtml(item.repo)}" placeholder="例: react" />
      </div>
      <div class="field">
        <label>ワークフロー YAML ファイル名</label>
        <input type="text" id="m-workflow" value="${escapeHtml(
          item.workflowFile,
        )}" placeholder="例: ci.yml" />
      </div>
      <div class="field">
        <label>表示エイリアス (任意)</label>
        <input type="text" id="m-alias" value="${escapeHtml(
          item.alias,
        )}" placeholder="例: 【本番】CIチェック" />
      </div>
      <div class="field" style="flex-direction: row; align-items: center; gap: 10px;">
        <input type="checkbox" id="m-fav" ${
          item.isFavorite ? 'checked' : ''
        } style="width: 20px; height: 20px;" />
        <label for="m-fav" style="margin-bottom: 0;">お気に入り (☆) に設定</label>
      </div>
    `;

    const urlShortcut = document.getElementById('m-url-shortcut');
    const ownerInput = document.getElementById('m-owner');
    const repoInput = document.getElementById('m-repo');
    const workflowInput = document.getElementById('m-workflow');

    urlShortcut.oninput = () => {
      const parsed = parseGitHubUrl(urlShortcut.value.trim());
      if (parsed) {
        ownerInput.value = parsed.owner;
        repoInput.value = parsed.repo;
        if (parsed.workflowFile) {
          workflowInput.value = parsed.workflowFile;
        }
      }
    };

    elements.modalSave.onclick = async () => {
      const ws = config.workspaces[wsIdx];
      const authConfig = config.authConfigs.find((c) => c.id === ws.authConfigId);
      const urlVal = urlShortcut.value.trim();

      if (urlVal) {
        const parsed = parseGitHubUrl(urlVal);
        if (parsed) {
          if (!authConfig) {
            elements.errorMsg.textContent = 'ワークスペースの認証設定が見つかりません。';
            elements.errorMsg.style.display = 'block';
            return;
          }
          if (!validateUrlWithAuth(parsed, authConfig)) {
            elements.errorMsg.textContent = `URLのドメインがワークスペースの認証設定 (${authConfig.name}) と一致しません。`;
            elements.errorMsg.style.display = 'block';
            return;
          }
        }
      }

      const newItem = {
        owner: ownerInput.value.trim(),
        repo: repoInput.value.trim(),
        workflowId:
          workflowInput.value.trim() === item.workflowFile ? item.workflowId || null : null,
        workflowFile: workflowInput.value.trim(),
        alias: document.getElementById('m-alias').value.trim(),
        isFavorite: document.getElementById('m-fav').checked,
      };

      if (!newItem.owner || !newItem.repo || !newItem.workflowFile) {
        elements.errorMsg.textContent = '必須項目を入力してください。';
        elements.errorMsg.style.display = 'block';
        return;
      }

      if (isEdit) {
        config.workspaces[wsIdx].items[itemIdx] = newItem;
      } else {
        config.workspaces[wsIdx].items.push(newItem);
      }

      await saveWorkspaces();
      elements.modal.close();
    };

    elements.modal.showModal();
  }

  async function deleteWorkspace(index) {
    if (confirm('このワークスペースを削除してもよろしいですか？')) {
      config.workspaces.splice(index, 1);
      await saveWorkspaces();
    }
  }

  async function deleteItem(wsIdx, itemIdx) {
    if (confirm('この監視項目を削除してもよろしいですか？')) {
      config.workspaces[wsIdx].items.splice(itemIdx, 1);
      await saveWorkspaces();
    }
  }

  async function saveWorkspaces() {
    await chrome.storage.local.set({ workspaces: config.workspaces });
    chrome.runtime.sendMessage({ action: 'poll' });
    renderWorkspaces();
    renderNotificationSettings(); // Refresh workspace list in notification settings
  }

  elements.addWorkspaceBtn.onclick = () => openWorkspaceModal();
  elements.addWorkspaceRepoBtn.onclick = () => openRepoWorkspaceModal();
  elements.modalCancel.onclick = () => elements.modal.close();

  function openRepoWorkspaceModal() {
    elements.modalTitle.textContent = 'リポジトリから新規ワークスペースを追加';
    elements.errorMsg.style.display = 'none';
    elements.modalSave.textContent = '保存';

    let authOptions = config.authConfigs
      .map((auth) => `<option value="${auth.id}">${escapeHtml(auth.name)}</option>`)
      .join('');

    elements.modalContent.innerHTML = `
      <div class="field">
        <label>リポジトリ (URL または Owner/Repo)</label>
        <input type="text" id="modal-repo-path" placeholder="例: https://github.com/facebook/react" />
        <div class="hint">指定されたリポジトリのワークフローを自動的に取得して登録します。</div>
      </div>
      <div class="field">
        <label>使用する認証設定</label>
        <select id="modal-repo-auth">
          ${authOptions}
        </select>
      </div>
    `;

    elements.modalSave.onclick = async () => {
      elements.errorMsg.style.display = 'none';
      const inputVal = document.getElementById('modal-repo-path').value.trim();
      const authConfigId = document.getElementById('modal-repo-auth').value;

      if (!inputVal || !authConfigId) {
        elements.errorMsg.textContent = '必須項目を入力してください。';
        elements.errorMsg.style.display = 'block';
        return;
      }

      const authConfig = config.authConfigs.find((c) => c.id === authConfigId);
      const parsed = parseGitHubUrl(inputVal);

      if (parsed) {
        if (!validateUrlWithAuth(parsed, authConfig)) {
          elements.errorMsg.textContent = `URLのドメインが選択した認証設定 (${authConfig.name}) と一致しません。`;
          elements.errorMsg.style.display = 'block';
          return;
        }
      }

      let owner, repo;
      if (parsed) {
        owner = parsed.owner;
        repo = parsed.repo;
      } else if (inputVal.includes('/')) {
        [owner, repo] = inputVal.split('/');
      } else {
        elements.errorMsg.textContent = '正確なURLまたは Owner/Repo 形式で入力してください。';
        elements.errorMsg.style.display = 'block';
        return;
      }

      elements.modalSave.disabled = true;
      elements.modalSave.textContent = '取得中...';

      try {
        const response = await fetch(
          `${authConfig.baseUrl}/repos/${owner}/${repo}/actions/workflows`,
          {
            headers: {
              Authorization: `token ${authConfig.pat}`,
              Accept: 'application/vnd.github.v3+json',
            },
          },
        );

        if (!response.ok) {
          let errMsg = 'ワークフローの取得に失敗しました。';
          try {
            const err = await response.json();
            errMsg = err.message || errMsg;
          } catch {
            errMsg = `${response.status} ${response.statusText}`;
          }
          throw new Error(errMsg);
        }

        const data = await response.json();
        if (!data.workflows || data.workflows.length === 0) {
          throw new Error('ワークフローが見つかりませんでした。');
        }

        const items = data.workflows.map((wf) => {
          // path is usually something like ".github/workflows/main.yml"
          const workflowFile = (wf.path && wf.path.split('/').pop()) || wf.id.toString();
          return {
            owner,
            repo,
            workflowId: wf.id,
            workflowFile,
            alias: wf.name,
            isFavorite: false,
          };
        });

        config.workspaces.push({
          id: Date.now().toString(),
          name: repo,
          authConfigId: authConfig.id,
          items,
        });

        await saveWorkspaces();
        elements.modal.close();
        showToast(`ワークスペース「${repo}」を追加しました。`);
      } catch (err) {
        elements.errorMsg.textContent = `エラー: ${err?.message || err}`;
        elements.errorMsg.style.display = 'block';
      } finally {
        elements.modalSave.disabled = false;
        elements.modalSave.textContent = '保存';
      }
    };

    elements.modal.showModal();
  }

  // --- Config Management ---

  document.getElementById('reset-config').onclick = async () => {
    if (confirm('すべての設定を初期化します。よろしいですか？')) {
      await chrome.storage.local.clear();
      location.reload();
    }
  };

  document.getElementById('export-config').onclick = () => {
    // Exclude PAT from export for security
    const exportConfig = JSON.parse(JSON.stringify(config));
    if (exportConfig.authConfigs) {
      exportConfig.authConfigs.forEach((auth) => delete auth.pat);
    }
    // Also remove legacy settings if any
    delete exportConfig.settings;

    const blob = new Blob([JSON.stringify(exportConfig, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `actionsboard-solo-config-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  document.getElementById('import-config').onclick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (event) => {
      const file = event.target.files[0];
      const reader = new FileReader();
      reader.onload = async (re) => {
        try {
          const imported = JSON.parse(re.target.result);
          if (imported.settings || imported.authConfigs || imported.workspaces) {
            // Merge authConfigs, preserving PATs if they match by ID or legacy structure
            const existingAuth = await chrome.storage.local.get(['authConfigs', 'settings']);
            let importedAuths = imported.authConfigs;

            // Legacy import migration
            if (!importedAuths && imported.settings) {
              importedAuths = [
                {
                  id: 'default',
                  name: 'デフォルト',
                  baseUrl: imported.settings.baseUrl || DEFAULT_API_URL,
                },
              ];
            }

            const mergedAuth = (importedAuths || []).map((impAuth) => {
              let existingPat = '';
              const ext = (existingAuth.authConfigs || []).find((e) => e.id === impAuth.id);
              if (ext && ext.pat) {
                existingPat = ext.pat;
              } else if (impAuth.id === 'default' && existingAuth.settings?.pat) {
                existingPat = existingAuth.settings.pat;
              }

              if (existingPat && !impAuth.pat) {
                return { ...impAuth, pat: existingPat };
              }
              return impAuth;
            });

            await chrome.storage.local.set({
              authConfigs: mergedAuth,
              workspaces: imported.workspaces || [],
            });
            location.reload();
          } else {
            alert('無効な設定ファイルです。');
          }
        } catch {
          alert('ファイルの読み込みに失敗しました。');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  // --- Notification Settings Logic ---

  function renderNotificationSettings() {
    const ns = config.notificationSettings;
    elements.notifScope.value = ns.scope;
    elements.notifEventFailure.checked = ns.events.includes('failure');
    elements.notifEventPages.checked = ns.events.includes('pages');

    if (ns.scope === 'workspaces') {
      // Clean up deleted workspaces from settings
      const validWsIds = config.workspaces.map((ws) => ws.id);
      config.notificationSettings.workspaces = ns.workspaces.filter((id) =>
        validWsIds.includes(id),
      );

      elements.notifWorkspacesContainer.style.display = 'block';
      elements.notifWorkspacesList.innerHTML = '';
      if (config.workspaces.length === 0) {
        elements.notifWorkspacesList.innerHTML =
          '<div class="hint">ワークスペースがありません</div>';
      } else {
        config.workspaces.forEach((ws) => {
          const div = document.createElement('div');
          div.style.display = 'flex';
          div.style.alignItems = 'center';
          div.style.gap = '8px';
          const escapedId = escapeHtml(ws.id);
          const checked = ns.workspaces.includes(ws.id);
          div.innerHTML = `
            <input type="checkbox" id="ns-ws-${escapedId}" ${checked ? 'checked' : ''} data-id="${escapedId}" style="width: 16px; height: 16px;">
            <label for="ns-ws-${escapedId}" style="margin-bottom: 0; font-weight: normal;">${escapeHtml(ws.name)}</label>
          `;
          div.querySelector('input').onchange = (e) => {
            if (e.target.checked) {
              if (!ns.workspaces.includes(ws.id)) ns.workspaces.push(ws.id);
            } else {
              config.notificationSettings.workspaces = ns.workspaces.filter((id) => id !== ws.id);
            }
            saveNotificationSettings();
          };
          elements.notifWorkspacesList.appendChild(div);
        });
      }
    } else {
      elements.notifWorkspacesContainer.style.display = 'none';
    }
  }

  async function saveNotificationSettings() {
    await chrome.storage.local.set({ notificationSettings: config.notificationSettings });
  }

  elements.notifScope.onchange = () => {
    config.notificationSettings.scope = elements.notifScope.value;
    renderNotificationSettings();
    saveNotificationSettings();
  };

  const onEventChange = () => {
    const events = [];
    if (elements.notifEventFailure.checked) events.push('failure');
    if (elements.notifEventPages.checked) events.push('pages');
    config.notificationSettings.events = events;
    saveNotificationSettings();
  };

  elements.notifEventFailure.onchange = onEventChange;
  elements.notifEventPages.onchange = onEventChange;

  // --- Utils ---

  /**
   * Parse GitHub browse URL to extract owner, repo, and workflow file.
   * Supports:
   * - https://github.com/owner/repo
   * - https://github.com/owner/repo/actions/workflows/ci.yml
   * - https://github.com/owner/repo/blob/main/.github/workflows/ci.yml
   */
  function parseGitHubUrl(urlStr) {
    try {
      const url = new URL(urlStr);
      const parts = url.pathname.split('/').filter((p) => p);
      if (parts.length < 2) return null;

      const owner = parts[0];
      const repo = parts[1];
      let workflowFile = '';

      // Check if it's a workflow URL
      if (parts[2] === 'actions' && parts[3] === 'workflows') {
        workflowFile = parts[4];
      } else if (parts[2] === 'blob' && url.pathname.includes('/.github/workflows/')) {
        workflowFile = parts[parts.length - 1];
      }

      return { hostname: url.hostname, owner, repo, workflowFile };
    } catch {
      return null;
    }
  }

  function validateUrlWithAuth(parsed, auth) {
    if (!parsed) return true; // Not a URL, allow Owner/Repo format
    const authHost = new URL(auth.baseUrl).hostname;
    // For github.com, hostname might be github.com while API is api.github.com
    if (auth.baseUrl === DEFAULT_API_URL) {
      return parsed.hostname === 'github.com';
    }
    // For GHE, typically hostname is the same
    return parsed.hostname === authHost;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(
      /[&<>"']/g,
      (m) =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;',
        })[m],
    );
  }
});
