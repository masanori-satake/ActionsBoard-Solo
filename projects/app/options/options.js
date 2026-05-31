/**
 * ActionsBoard-Solo Options Script
 */

document.addEventListener('DOMContentLoaded', async () => {
  const elements = {
    pat: document.getElementById('pat'),
    baseUrl: document.getElementById('baseUrl'),
    saveApiBtn: document.getElementById('save-api'),
    testApiBtn: document.getElementById('test-api'),
    workspaceList: document.getElementById('workspace-list'),
    addWorkspaceBtn: document.getElementById('add-workspace'),
    toast: document.getElementById('toast'),
    modal: document.getElementById('modal'),
    modalTitle: document.getElementById('modal-title'),
    modalContent: document.getElementById('modal-content'),
    modalSave: document.getElementById('modal-save'),
    modalCancel: document.getElementById('modal-cancel'),
  };

  let config = {
    settings: {
      pat: '',
      baseUrl: 'https://api.github.com',
    },
    workspaces: [],
  };

  // --- Initialization ---

  async function loadConfig() {
    const data = await chrome.storage.local.get(['settings', 'workspaces']);
    if (data.settings) {
      config.settings = { ...config.settings, ...data.settings };
      elements.pat.value = config.settings.pat || '';
      elements.baseUrl.value = config.settings.baseUrl || 'https://api.github.com';
    }
    if (data.workspaces) {
      config.workspaces = data.workspaces;
    }
    renderWorkspaces();
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

  elements.saveApiBtn.addEventListener('click', async () => {
    config.settings.pat = elements.pat.value.trim();
    config.settings.baseUrl = elements.baseUrl.value.trim() || 'https://api.github.com';

    await chrome.storage.local.set({ settings: config.settings });
    showToast('認証情報を保存しました。');
  });

  elements.testApiBtn.addEventListener('click', async () => {
    const pat = elements.pat.value.trim();
    const baseUrl = elements.baseUrl.value.trim() || 'https://api.github.com';

    if (!pat) {
      showToast('PAT を入力してください。');
      return;
    }

    elements.testApiBtn.disabled = true;
    elements.testApiBtn.textContent = 'テスト中...';

    try {
      const response = await fetch(`${baseUrl}/user`, {
        headers: {
          Authorization: `token ${pat}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      if (response.ok) {
        const user = await response.json();
        showToast(`接続成功: ${user.login} として認証されました。`);
      } else {
        const err = await response.json();
        showToast(`接続失敗: ${err.message}`);
      }
    } catch (e) {
      showToast(`エラー: ${e.message}`);
    } finally {
      elements.testApiBtn.disabled = false;
      elements.testApiBtn.textContent = '接続テスト';
    }
  });

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

      const header = document.createElement('div');
      header.className = 'workspace-header';
      header.innerHTML = `
        <h3 class="md-sys-typescale-title-medium">${escapeHtml(ws.name)}</h3>
        <div class="button-row" style="margin-top: 0">
          <button class="btn-outline add-item-btn" data-ws-idx="${wsIdx}">追加</button>
          <button class="btn-outline edit-ws-btn" data-ws-idx="${wsIdx}">編集</button>
          <button class="btn-error del-ws-btn" data-ws-idx="${wsIdx}">削除</button>
        </div>
      `;
      card.appendChild(header);

      const itemList = document.createElement('div');
      itemList.className = 'item-list';

      (ws.items || []).forEach((item, itemIdx) => {
        const row = document.createElement('div');
        row.className = 'item-row';
        row.innerHTML = `
          <span class="badge-fav">${item.isFavorite ? '★' : '☆'}</span>
          <span style="flex-grow: 1;">
            <strong>${escapeHtml(item.alias || item.workflowFile)}</strong>
            <small>(${escapeHtml(item.owner)}/${escapeHtml(item.repo)})</small>
          </span>
          <button class="btn-outline edit-item-btn" data-ws-idx="${wsIdx}" data-item-idx="${itemIdx}">編集</button>
          <button class="btn-error del-item-btn" data-ws-idx="${wsIdx}" data-item-idx="${itemIdx}">削除</button>
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
    elements.modalTitle.textContent = isEdit ? 'ワークスペース編集' : '新規ワークスペース追加';
    const ws = isEdit ? config.workspaces[index] : { name: '' };

    elements.modalContent.innerHTML = `
      <div class="field">
        <label>ワークスペース名</label>
        <input type="text" id="modal-ws-name" value="${escapeHtml(
          ws.name,
        )}" placeholder="例: 認証サブシステム" />
      </div>
    `;

    elements.modalSave.onclick = async () => {
      const name = document.getElementById('modal-ws-name').value.trim();
      if (!name) return;

      if (isEdit) {
        config.workspaces[index].name = name;
      } else {
        config.workspaces.push({ id: Date.now().toString(), name, items: [] });
      }

      await saveWorkspaces();
      elements.modal.close();
    };

    elements.modal.showModal();
  }

  function openItemModal(wsIdx, itemIdx = -1) {
    const isEdit = itemIdx !== -1;
    elements.modalTitle.textContent = isEdit ? '監視項目の編集' : '監視項目の追加';
    const item = isEdit
      ? config.workspaces[wsIdx].items[itemIdx]
      : { owner: '', repo: '', workflowFile: '', alias: '', isFavorite: false };

    elements.modalContent.innerHTML = `
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

    elements.modalSave.onclick = async () => {
      const newItem = {
        owner: document.getElementById('m-owner').value.trim(),
        repo: document.getElementById('m-repo').value.trim(),
        workflowFile: document.getElementById('m-workflow').value.trim(),
        alias: document.getElementById('m-alias').value.trim(),
        isFavorite: document.getElementById('m-fav').checked,
      };

      if (!newItem.owner || !newItem.repo || !newItem.workflowFile) {
        showToast('必須項目を入力してください。');
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
    renderWorkspaces();
  }

  elements.addWorkspaceBtn.onclick = () => openWorkspaceModal();
  elements.modalCancel.onclick = () => elements.modal.close();

  // --- Config Management ---

  document.getElementById('reset-config').onclick = async () => {
    if (confirm('すべての設定を初期化します。よろしいですか？')) {
      await chrome.storage.local.clear();
      location.reload();
    }
  };

  document.getElementById('export-config').onclick = () => {
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
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
    input.onchange = (e) => {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = async (re) => {
        try {
          const imported = JSON.parse(re.target.result);
          if (imported.settings || imported.workspaces) {
            await chrome.storage.local.set(imported);
            location.reload();
          } else {
            alert('無効な設定ファイルです。');
          }
        } catch (err) {
          alert('ファイルの読み込みに失敗しました。');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  // --- Utils ---

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
