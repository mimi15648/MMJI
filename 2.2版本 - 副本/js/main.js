/**
* 主逻辑入口
*/
document.addEventListener('DOMContentLoaded', () => {
// 状态管理
let currentUser = null;
let currentCharacter = null;
let currentSessionId = null;
let pendingCharId = null;
  let isVoiceMode = false;
  let voiceRecordingInterval = null;
  let voiceSeconds = 0;
  let isAiResponding = false;
  const EMOJI_LIST = [
    '😀','😁','😂','🤣','😃','😄','😅','😆',
    '😉','😊','😋','😎','😍','🥰','😘','😗',
    '😑','😐','😶','😏','😒','🙄','😬','🤥',
    '😌','😔','😪','😴','😷','🤒','🤕','🤢',
    '🤮','😵','🤯','🤠','🥳','😎','🤓','🧐',
    '😢','😭','😤','😡','🤬','😬','😰','😱',
    '👋','🤚','🖐','✋','🖖','👌','🤌','🤏',
    '👍','👎','👊','✊','🤛','🤜','👏','🙌',
    '👐','🤲','🤝','🙏','✍','💅','🤳','💪',
    '❤️','🧡','💛','💚','💙','💜','🖤','🤍',
    '💔','💕','💞','💓','💗','💖','💘','💝',
    '🌹','🌸','🌺','🌻','🌷','💐','🍄','🌰',
    '🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼',
    '🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓',
    '⭐','🌟','✨','💫','🔥','💯','🎉','🎊',
    '🎀','🎁','🏆','🥇','🎯','🎲','🎪','🎨'
  ];

// 初始化设置
const settings = Store.getSettings();
UI.setTheme(settings.theme || 'purple');

// --- DOM 元素引用 ---
const e = {
viewCharSelect: document.getElementById('view-char-select'),
viewMain: document.getElementById('view-main'),
sidebar: document.getElementById('sidebar'),

// 角色选择页
charSelectList: document.getElementById('char-select-list'),
btnConfirmChar: document.getElementById('btn-confirm-char'),
btnCreateCharHome: document.getElementById('btn-create-char-home'),
btnGlobalSettingsHome: document.getElementById('btn-global-settings-home'),

// 聊天头部
chatTitle: document.getElementById('current-chat-title'),
btnMenu: document.getElementById('btn-menu'),
btnCloseSidebar: document.getElementById('btn-close-sidebar'),
  btnUserPanel: document.getElementById('btn-user-panel'),

// 底部输入区
chatInput: document.getElementById('chat-input'),
btnSend: document.getElementById('btn-send'),
btnVoiceMode: document.getElementById('btn-voice-mode'),
btnVoiceRecord: document.getElementById('btn-voice-record'),
    btnTransferMenu: document.getElementById('btn-transfer-menu'),
    voiceOverlay: document.getElementById('voice-overlay'),
    btnEmoji: document.getElementById('btn-emoji'),
    emojiPickerPanel: document.getElementById('modal-emoji-picker-panel') || document.getElementById('emoji-picker-panel'),
    emojiGrid: document.getElementById('emoji-grid'),
    photoUploadInput: document.getElementById('photo-upload-input'),

// 用户面板弹窗
modalUserPanel: document.getElementById('modal-user-panel'),
btnCloseUserPanel: document.getElementById('btn-close-user-panel'),
userPanelList: document.getElementById('user-panel-list'),

// 用户创建/编辑弹窗
modalUser: document.getElementById('modal-user'),
btnCreateUser: document.getElementById('btn-create-user'),
btnSaveUser: document.getElementById('btn-save-user'),
btnCancelUser: document.getElementById('btn-cancel-user'),
userAvatarUpload: document.getElementById('user-avatar-upload'),

  // 角色弹窗
  modalChar: document.getElementById('modal-character'),
  btnSaveChar: document.getElementById('btn-save-character'),
btnCancelChar: document.getElementById('btn-cancel-character'),
btnDeleteChar: document.getElementById('btn-delete-character'),
charAvatarUpload: document.getElementById('char-avatar-upload'),

// 全局设置弹窗
modalSettings: document.getElementById('modal-global-settings'),
btnSaveSettings: document.getElementById('btn-save-settings'),
btnCancelSettings: document.getElementById('btn-cancel-settings'),
btnClearAll: document.getElementById('btn-clear-all'),

// 转账弹窗
modalTransfer: document.getElementById('modal-transfer'),
btnSendTransfer: document.getElementById('btn-send-transfer'),
btnCancelTransfer: document.getElementById('btn-cancel-transfer')
};

// --- 初始化渲染 ---
function init() {
refreshCharSelectList();
const users = Store.getUsers();
if (users.length === 0) {
const defaultUser = { name: '默认用户', profile: '', avatar: null, avatarShape: 'circle' };
Store.addUser(defaultUser);
currentUser = Store.getUsers()[0];
}
}

// --- 角色选择页（首页） ---
function refreshCharSelectList() {
const chars = Store.getCharacters();
UI.renderCharSelectList(chars, pendingCharId, handleCharSelectOnHome, handleCharEdit);
e.btnConfirmChar.disabled = !pendingCharId;
}

function handleCharSelectOnHome(charId) {
pendingCharId = charId;
refreshCharSelectList();
}

  e.btnConfirmChar.onclick = () => {
  if (!pendingCharId) return UI.showToast("请先选择角色");
  currentCharacter = Store.getCharacters().find(c => c.id === pendingCharId);
  if (!currentUser) {
    const users = Store.getUsers();
    if (users.length > 0) currentUser = users[0];
  }
  currentSessionId = Store.getDefaultSessionId(currentUser.id, currentCharacter.id);
  e.chatTitle.innerHTML = `${currentCharacter.name} <code>↔</code> ${currentUser.name}`;
  UI.showView('view-main');
  e.viewCharSelect.classList.add('hidden-view');
  refreshChats();
  UI.showToast(`已进入与 ${currentCharacter.name} 的聊天`);
};

e.btnCreateCharHome.onclick = () => openCharModal(null);

e.btnGlobalSettingsHome.onclick = () => openGlobalSettings();

// --- 用户面板（从聊天界面打开） ---
e.btnUserPanel.onclick = () => {
refreshUserPanelList();
UI.showModal('modal-user-panel');
};

  e.btnCloseUserPanel.onclick = () => UI.hideModal('modal-user-panel');

  document.getElementById('btn-open-global-settings').onclick = () => {
    UI.hideModal('modal-user-panel');
    setTimeout(() => openGlobalSettings(), 300);
  };

function refreshUserPanelList() {
const users = Store.getUsers();
UI.renderUserPanelList(users, currentUser ? currentUser.id : null, handleUserSelect, handleUserEdit);
}

  function handleUserSelect(userId) {
  currentUser = Store.getUsers().find(u => u.id === userId);
  UI.hideModal('modal-user-panel');
  UI.showToast(`已切换为用户: ${currentUser.name}`);
  if (currentCharacter) {
    currentSessionId = Store.getDefaultSessionId(currentUser.id, currentCharacter.id);
    e.chatTitle.innerHTML = `${currentCharacter.name} <code>↔</code> ${currentUser.name}`;
  }
  refreshChats();
}

e.btnCreateUser.onclick = () => {
UI.hideModal('modal-user-panel');
setTimeout(() => openUserModal(null), 300);
};

// --- 侧边栏最近聊天列表 ---
  function refreshSidebarChatList() {
  if (!currentUser) return;
  const recentChats = Store.getRecentChats(currentUser.id);
  const chars = Store.getCharacters();
  UI.renderRecentChatList(recentChats, chars, currentCharacter ? currentCharacter.id : null, currentSessionId, handleCharSelect, handleCharEdit);
}

  function handleCharSelect(charId, sessionId) {
  currentCharacter = Store.getCharacters().find(c => c.id === charId);
  currentSessionId = sessionId || Store.getDefaultSessionId(currentUser.id, currentCharacter.id);
  e.chatTitle.innerHTML = `${currentCharacter.name} <code>↔</code> ${currentUser.name}`;
  e.sidebar.classList.remove('open');
  refreshChats();
}

// --- 聊天刷新 ---
  function refreshChats() {
  if (!currentUser || !currentCharacter) return;
  const chats = Store.getChats(currentUser.id, currentCharacter.id, currentSessionId);
  UI.renderChats(chats, currentUser, currentCharacter, handleWithdraw);
}

// --- 用户管理 ---
let editingUserId = null;
let tempUserAvatar = null;

function openUserModal(userId) {
editingUserId = userId;
const u = userId ? Store.getUsers().find(u => u.id === userId) : null;
document.getElementById('modal-user-title').textContent = u ? '编辑用户' : '新建用户';
document.getElementById('user-name').value = u ? u.name : '';
document.getElementById('user-profile').value = u ? u.profile : '';
document.getElementById('user-avatar-shape').value = u ? (u.avatarShape || 'circle') : 'circle';
tempUserAvatar = u ? u.avatar : null;
updatePreview('user-avatar-preview', tempUserAvatar);
UI.showModal('modal-user');
}

e.btnCancelUser.onclick = () => {
UI.hideModal('modal-user');
refreshUserPanelList();
setTimeout(() => UI.showModal('modal-user-panel'), 300);
};

e.userAvatarUpload.onchange = async (ev) => {
if (ev.target.files[0]) {
tempUserAvatar = await UI.fileToBase64(ev.target.files[0]);
updatePreview('user-avatar-preview', tempUserAvatar);
}
};

e.btnSaveUser.onclick = () => {
const name = document.getElementById('user-name').value.trim();
if (!name) return UI.showToast("用户名不能为空");

const userData = {
id: editingUserId,
name: name,
profile: document.getElementById('user-profile').value.trim(),
avatar: tempUserAvatar,
avatarShape: document.getElementById('user-avatar-shape').value
};

if (editingUserId) {
Store.updateUser(userData);
if (currentUser && currentUser.id === editingUserId) currentUser = userData;
} else {
Store.addUser(userData);
}

UI.hideModal('modal-user');
refreshUserPanelList();
setTimeout(() => UI.showModal('modal-user-panel'), 300);
if (currentUser) refreshChats();
};

function handleUserEdit(userId) {
UI.hideModal('modal-user-panel');
setTimeout(() => openUserModal(userId), 300);
}

// --- 角色管理 ---
let editingCharId = null;
let tempCharAvatar = null;

function openCharModal(charId) {
editingCharId = charId;
const c = charId ? Store.getCharacters().find(c => c.id === charId) : null;
document.getElementById('modal-character-title').textContent = c ? '编辑角色' : '新建角色';
document.getElementById('char-name').value = c ? c.name : '';
document.getElementById('char-setting').value = c ? c.setting : '';
document.getElementById('char-worldbook').value = c ? (c.worldbook || '') : '';
document.getElementById('char-memory-format').value = c ? (c.memoryFormat || '') : '';
document.getElementById('char-memory-storage').value = c ? (c.memoryStorage || '') : '';
document.getElementById('char-avatar-shape').value = c ? (c.avatarShape || 'circle') : 'circle';

tempCharAvatar = c ? c.avatar : null;
updatePreview('char-avatar-preview', tempCharAvatar);

if (c) e.btnDeleteChar.classList.remove('hidden');
else e.btnDeleteChar.classList.add('hidden');

UI.showModal('modal-character');
}

  e.btnCancelChar.onclick = () => UI.hideModal('modal-character');

e.charAvatarUpload.onchange = async (ev) => {
if (ev.target.files[0]) {
tempCharAvatar = await UI.fileToBase64(ev.target.files[0]);
updatePreview('char-avatar-preview', tempCharAvatar);
}
};

e.btnSaveChar.onclick = () => {
const name = document.getElementById('char-name').value.trim();
if (!name) return UI.showToast("角色名称不能为空");

const charData = {
id: editingCharId,
name: name,
setting: document.getElementById('char-setting').value.trim(),
worldbook: document.getElementById('char-worldbook').value.trim(),
memoryFormat: document.getElementById('char-memory-format').value.trim(),
memoryStorage: document.getElementById('char-memory-storage').value.trim(),
avatar: tempCharAvatar,
avatarShape: document.getElementById('char-avatar-shape').value
};

if (editingCharId) {
Store.updateCharacter(charData);
    if (currentCharacter && currentCharacter.id === editingCharId) {
    currentCharacter = charData;
    e.chatTitle.innerHTML = `${currentCharacter.name} <code>↔</code> ${currentUser.name}`;
}
} else {
Store.addCharacter(charData);
}

  UI.hideModal('modal-character');
  refreshCharSelectList();
  refreshSidebarChatList();
  if (currentCharacter) refreshChats();
};

e.btnDeleteChar.onclick = () => {
  if (confirm("确定要删除此角色及其所有聊天记录吗？")) {
    Store.deleteCharacter(editingCharId);
    if (currentCharacter && currentCharacter.id === editingCharId) {
      currentCharacter = null;
      e.chatTitle.textContent = "请选择角色";
      document.getElementById('chat-messages').innerHTML = '';
    }
    UI.hideModal('modal-character');
    refreshCharSelectList();
    refreshSidebarChatList();
  }
};

function handleCharEdit(charId) { openCharModal(charId); }

function updatePreview(elementId, base64) {
const el = document.getElementById(elementId);
if (base64) el.style.backgroundImage = `url(${base64})`;
else el.style.backgroundImage = 'none';
}

// --- 全局设置 ---
function openGlobalSettings() {
const s = Store.getSettings();
document.getElementById('setting-api-url').value = s.apiUrl || '';
document.getElementById('setting-api-key').value = s.apiKey || '';
document.getElementById('setting-model').value = s.model || 'gpt-3.5-turbo';

const rc = document.getElementById('setting-reply-count');
rc.value = s.replyCount || 1;
document.getElementById('reply-count-val').textContent = rc.value;

document.getElementById('setting-auto-summary').checked = s.autoSummary || false;

document.querySelectorAll('.theme-color').forEach(el => {
el.classList.toggle('active', el.dataset.themeVal === (s.theme || 'purple'));
});

UI.showModal('modal-global-settings');
}

  e.btnCancelSettings.onclick = () => UI.hideModal('modal-global-settings');

  document.getElementById('btn-fetch-models').onclick = async () => {
    const apiUrl = document.getElementById('setting-api-url').value.trim();
    const apiKey = document.getElementById('setting-api-key').value.trim();
    if (!apiUrl || !apiKey) return UI.showToast("请先填写 API URL 和 API Key");

    const btn = document.getElementById('btn-fetch-models');
    const listContainer = document.getElementById('model-list-container');
    btn.classList.add('fetching');
    listContainer.innerHTML = '<div class="model-loading">检索中...</div>';
    listContainer.classList.remove('hidden');

    try {
      const models = await Api.fetchModels(apiUrl, apiKey);
      if (models.length === 0) {
        listContainer.innerHTML = '<div class="model-empty">未检索到可用模型</div>';
        return;
      }
      const currentModel = document.getElementById('setting-model').value.trim();
      listContainer.innerHTML = models.map(m =>
        `<div class="model-item${m === currentModel ? ' active' : ''}" data-model="${m}">${m}</div>`
      ).join('');

      listContainer.querySelectorAll('.model-item').forEach(item => {
        item.onclick = () => {
          document.getElementById('setting-model').value = item.dataset.model;
          listContainer.querySelectorAll('.model-item').forEach(i => i.classList.remove('active'));
          item.classList.add('active');
        };
      });
    } catch (error) {
      listContainer.innerHTML = `<div class="model-error">检索失败: ${error.message}</div>`;
    } finally {
      btn.classList.remove('fetching');
    }
  };

document.getElementById('setting-reply-count').oninput = (ev) => {
document.getElementById('reply-count-val').textContent = ev.target.value;
};

document.querySelectorAll('.theme-color').forEach(el => {
el.onclick = () => {
const theme = el.dataset.themeVal;
UI.setTheme(theme);
document.querySelectorAll('.theme-color').forEach(c => c.classList.remove('active'));
el.classList.add('active');
};
});

e.btnSaveSettings.onclick = () => {
const s = {
apiUrl: document.getElementById('setting-api-url').value.trim(),
apiKey: document.getElementById('setting-api-key').value.trim(),
model: document.getElementById('setting-model').value.trim(),
replyCount: parseInt(document.getElementById('setting-reply-count').value),
autoSummary: document.getElementById('setting-auto-summary').checked,
theme: document.querySelector('.theme-color.active')?.dataset.themeVal || 'purple'
};
Store.updateSettings(s);
UI.hideModal('modal-global-settings');
UI.showToast("设置已保存");
};

e.btnClearAll.onclick = () => {
if (confirm("警告：此操作将清除所有用户、角色和聊天记录数据！是否继续？")) {
Store.clearAll();
location.reload();
}
};

// --- 聊天交互 ---
  e.btnMenu.onclick = () => {
    refreshSidebarChatList();
    e.sidebar.classList.add('open');
  };
e.btnCloseSidebar.onclick = () => e.sidebar.classList.remove('open');

document.getElementById('btn-back-home').onclick = () => {
e.sidebar.classList.remove('open');
currentCharacter = null;
pendingCharId = null;
e.chatTitle.textContent = "请选择角色";
document.getElementById('chat-messages').innerHTML = '';
UI.showView('view-char-select');
e.viewCharSelect.classList.remove('hidden-view');
refreshCharSelectList();
};

e.chatInput.oninput = () => {
e.chatInput.style.height = 'auto';
e.chatInput.style.height = (e.chatInput.scrollHeight > 100 ? 100 : Math.max(40, e.chatInput.scrollHeight)) + 'px';
};

  function handleWithdraw(msgId) {
  if (Store.withdrawMsg(currentUser.id, currentCharacter.id, msgId, currentSessionId)) {
    refreshChats();
  }
}

  // --- 发送消息逻辑 ---
  async function sendMessage(type, content, extra = {}) {
  if (!currentUser || !currentCharacter) return UI.showToast("请先选择角色");
  if (!content) return;

  if (!currentSessionId) {
    currentSessionId = Store.getDefaultSessionId(currentUser.id, currentCharacter.id);
  }
  const userMsg = { role: 'user', type: type, content: content, timestamp: Date.now(), ...extra };
  Store.addChatMsg(currentUser.id, currentCharacter.id, userMsg, currentSessionId);
  Store.updateSessionTime(currentUser.id, currentCharacter.id, currentSessionId);
  refreshChats();
}

  async function triggerAiReply() {
    if (!currentUser || !currentCharacter) return UI.showToast("请先选择角色");
    if (isAiResponding) return;

    const s = Store.getSettings();
    if (!s.apiUrl || !s.apiKey) {
      return UI.showToast("请先在全局设置中配置API");
    }

    isAiResponding = true;
    setSendBtnState('loading');

    const chats = Store.getChats(currentUser.id, currentCharacter.id);
    const messages = Api.formatHistory(
      currentUser.profile,
      currentCharacter.setting,
      currentCharacter.worldbook,
      currentCharacter.memoryStorage,
      chats
    );

    try {
      e.chatTitle.innerHTML = `${currentCharacter.name} <code>↔</code> ${currentUser.name} <span class="typing-indicator"><span class="typing-dots"><span>.</span><span>.</span><span>.</span></span></span>`;

      const segCount = s.replyCount || 1;
      const reply = await Api.chat(messages, s, segCount);
      if (reply) {
        const segments = reply.split('【SEGMENT】').filter(seg => seg.trim());
        if (segments.length === 0) segments.push(reply);
        segments.forEach((seg, idx) => {
          const aiMsg = {
            role: 'assistant',
            type: 'text',
            content: seg.trim(),
            timestamp: Date.now() + idx
          };
          Store.addChatMsg(currentUser.id, currentCharacter.id, aiMsg, currentSessionId);
        });
        Store.updateSessionTime(currentUser.id, currentCharacter.id, currentSessionId);
        refreshChats();
      }
    } catch (error) {
      UI.showToast("API\u8bf7\u6c42\u51fa\u9519: " + error.message);
    } finally {
      isAiResponding = false;
      setSendBtnState('default');
      e.chatTitle.innerHTML = `${currentCharacter.name} <code>↔</code> ${currentUser.name}`;
    }

    if (s.autoSummary && chats.length % 10 === 0) {
      triggerSummary(chats, s);
    }
  }

  function setSendBtnState(state) {
    if (state === 'loading') {
      e.btnSend.disabled = true;
      e.btnSend.classList.add('btn-loading');
      e.btnSend.innerHTML = `<span class="loading-dots"><span>.</span><span>.</span><span>.</span></span>`;
    } else {
      e.btnSend.disabled = false;
      e.btnSend.classList.remove('btn-loading');
      e.btnSend.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>`;
    }
  }

async function triggerSummary(chats, settings) {
if (!currentCharacter.memoryFormat) return;
try {
const summary = await Api.summarize(chats.slice(-20), currentCharacter.memoryFormat, settings);
if (summary) {
currentCharacter.memoryStorage = summary;
Store.updateCharacter(currentCharacter);
console.log("Memory updated");
}
} catch (e) { console.error("Summary failed", e); }
}

  e.btnSend.onclick = () => {
    if (isAiResponding) return;
    const text = e.chatInput.value.trim();
    if (text) {
      sendMessage('text', text);
      e.chatInput.value = '';
      e.chatInput.style.height = 'auto';
    } else {
    const chats = Store.getChats(currentUser.id, currentCharacter.id, currentSessionId);
      const lastMsg = chats.length > 0 ? chats[chats.length - 1] : null;
      if (lastMsg && lastMsg.role === 'user') {
        triggerAiReply();
      }
    }
  };
e.chatInput.onkeypress = (ev) => {
if (ev.key === 'Enter' && !ev.shiftKey) {
ev.preventDefault();
e.btnSend.click();
}
};

// --- 语音模拟 ---
e.btnVoiceMode.onclick = () => {
isVoiceMode = !isVoiceMode;
if (isVoiceMode) {
e.chatInput.classList.add('hidden');
e.btnVoiceRecord.classList.remove('hidden');
e.btnVoiceMode.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7V4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3"></path><path d="M4 17v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"></path><path d="M9 22V2h6v20H9z"></path></svg>`;
} else {
e.chatInput.classList.remove('hidden');
e.btnVoiceRecord.classList.add('hidden');
e.btnVoiceMode.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>`;
}
};

function startRecording() {
voiceSeconds = 0;
e.voiceOverlay.classList.remove('hidden');
e.btnVoiceRecord.textContent = "松开 发送";
voiceRecordingInterval = setInterval(() => {
voiceSeconds++;
}, 1000);
}

function stopRecording() {
e.voiceOverlay.classList.add('hidden');
e.btnVoiceRecord.textContent = "按住 说话";
clearInterval(voiceRecordingInterval);

if (voiceSeconds > 0) {
const mockTexts = ["嗨，你好呀！", "嗯，对的。", "哈哈哈，好搞笑。", "等一下我马上好。"];
const text = mockTexts[Math.floor(Math.random() * mockTexts.length)];
sendMessage('voice', text, { duration: voiceSeconds });
}
voiceSeconds = 0;
}

e.btnVoiceRecord.addEventListener('mousedown', startRecording);
e.btnVoiceRecord.addEventListener('touchstart', (ev) => { ev.preventDefault(); startRecording(); });
window.addEventListener('mouseup', () => { if(voiceSeconds>0) stopRecording(); });
window.addEventListener('touchend', () => { if(voiceSeconds>0) stopRecording(); });

// --- 转账模拟 ---
e.btnTransferMenu.onclick = () => {
if (!currentUser || !currentCharacter) return UI.showToast("请先选择角色");
document.getElementById('transfer-amount').value = '';
document.getElementById('transfer-note').value = '';
UI.showModal('modal-transfer');
};
e.btnCancelTransfer.onclick = () => UI.hideModal('modal-transfer');

  e.btnSendTransfer.onclick = () => {
    const amount = document.getElementById('transfer-amount').value;
    const note = document.getElementById('transfer-note').value;

    if (!amount || amount <= 0) return UI.showToast("金额不正确");

  sendMessage('transfer', note || '微信转账', { amount: amount, note: note || '微信转账' });
  UI.hideModal('modal-transfer');
};

// --- 聊天更多操作菜单 ---
const chatMoreMenu = document.getElementById('chat-more-menu');

e.btnChatMore = document.getElementById('btn-chat-more');
e.btnChatMore.onclick = (ev) => {
  ev.stopPropagation();
  chatMoreMenu.classList.toggle('hidden');
};

document.addEventListener('click', (ev) => {
  if (!chatMoreMenu.contains(ev.target) && ev.target !== e.btnChatMore) {
    chatMoreMenu.classList.add('hidden');
  }
});

document.getElementById('btn-clear-chat').onclick = () => {
  chatMoreMenu.classList.add('hidden');
  if (!currentUser || !currentCharacter) return;
  if (confirm("确定要清空当前聊天所有内容吗？")) {
    Store.clearChats(currentUser.id, currentCharacter.id, currentSessionId);
    refreshChats();
    UI.showToast("聊天内容已清空");
  }
};

  document.getElementById('btn-new-chat').onclick = () => {
    chatMoreMenu.classList.add('hidden');
    if (!currentUser || !currentCharacter) return;
    const newSessionId = Store.addSession(currentUser.id, currentCharacter.id);
    currentSessionId = newSessionId;
    refreshChats();
    refreshSidebarChatList();
    UI.showToast("已开启新聊天");
  };

  // --- 表情/图片选择面板 ---
  function initEmojiGrid() {
    const grid = e.emojiGrid;
    grid.innerHTML = '';
    EMOJI_LIST.forEach(emoji => {
      const btn = document.createElement('button');
      btn.className = 'emoji-item';
      btn.textContent = emoji;
      btn.onclick = () => {
        const start = e.chatInput.selectionStart;
        const end = e.chatInput.selectionEnd;
        const text = e.chatInput.value;
        e.chatInput.value = text.substring(0, start) + emoji + text.substring(end);
        e.chatInput.selectionStart = e.chatInput.selectionEnd = start + emoji.length;
        e.chatInput.focus();
        e.chatInput.dispatchEvent(new Event('input'));
      };
      grid.appendChild(btn);
    });
  }
  initEmojiGrid();

  e.btnEmoji.onclick = (ev) => {
    ev.stopPropagation();
    const panel = document.getElementById('emoji-picker-panel');
    const isHidden = panel.classList.contains('hidden');
    if (isHidden) {
      panel.classList.remove('hidden');
      e.btnEmoji.classList.add('active');
    } else {
      panel.classList.add('hidden');
      e.btnEmoji.classList.remove('active');
    }
  };

  document.querySelectorAll('.emoji-tab').forEach(tab => {
    tab.onclick = () => {
      document.querySelectorAll('.emoji-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.emoji-tab-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      const target = tab.dataset.tab;
      if (target === 'emoji') {
        document.querySelector('.emoji-tab-emoji').classList.add('active');
      } else {
        document.querySelector('.emoji-tab-photo').classList.add('active');
      }
    };
  });

  e.photoUploadInput.onchange = async (ev) => {
    const files = ev.target.files;
    if (!files || files.length === 0) return;
    if (!currentUser || !currentCharacter) return UI.showToast("请先选择角色");

    for (const file of files) {
      if (!file.type.startsWith('image/')) continue;
      const base64 = await UI.fileToBase64(file);
      sendMessage('image', base64);
    }
    document.getElementById('emoji-picker-panel').classList.add('hidden');
    e.btnEmoji.classList.remove('active');
    ev.target.value = '';
  };

  document.addEventListener('click', (ev) => {
    const panel = document.getElementById('emoji-picker-panel');
    if (!panel.classList.contains('hidden') && !panel.contains(ev.target) && ev.target !== e.btnEmoji && !e.btnEmoji.contains(ev.target)) {
      panel.classList.add('hidden');
      e.btnEmoji.classList.remove('active');
    }
  });

// 启动
init();
});
