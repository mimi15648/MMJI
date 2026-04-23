/**
 * UI 渲染及交互模块
 */
const UI = {
    // 显示视图
    showView(viewId) {
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.getElementById(viewId).classList.add('active');
    },

    // 吐司提示
    showToast(msg, duration = 2000) {
        const toast = document.getElementById('toast');
        toast.textContent = msg;
        toast.classList.remove('hidden');
        setTimeout(() => toast.classList.add('hidden'), duration);
    },

    // 模态框控制
    showModal(modalId) { document.getElementById(modalId).classList.remove('hidden'); },
    hideModal(modalId) { document.getElementById(modalId).classList.add('hidden'); },

    // 图片转 Base64
    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
            reader.readAsDataURL(file);
        });
    },

  // 渲染角色选择页（首页）
  renderCharSelectList(characters, selectedCharId, onClick, onEdit) {
    const container = document.getElementById('char-select-list');
    container.innerHTML = '';
    if (characters.length === 0) {
      container.innerHTML = '<div style="text-align:center;color:#888;margin-top:20px;">暂无角色，请点击右上角+号创建</div>';
      return;
    }

    characters.forEach(char => {
      const div = document.createElement('div');
      div.className = `list-item ${char.id === selectedCharId ? 'active' : ''}`;

      const avatarHtml = char.avatar
        ? `<div class="avatar ${char.avatarShape || 'circle'}"><img src="${char.avatar}"></div>`
        : `<div class="avatar ${char.avatarShape || 'circle'}">${char.name.charAt(0)}</div>`;

      div.innerHTML = `
        ${avatarHtml}
        <div class="item-info">
          <div class="item-name">${char.name}</div>
          <div class="item-desc">${char.setting ? char.setting.substring(0, 15) + '...' : '暂无设定'}</div>
        </div>
        <div class="item-actions">
          <button class="icon-btn edit-btn" title="编辑">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
          </button>
        </div>
      `;

      div.onclick = () => onClick(char.id);
      div.querySelector('.edit-btn').onclick = (e) => { e.stopPropagation(); onEdit(char.id); };

      container.appendChild(div);
    });
  },

  // 渲染用户面板弹窗列表
  renderUserPanelList(users, activeUserId, onClick, onEdit) {
    const container = document.getElementById('user-panel-list');
    container.innerHTML = '';
    if (users.length === 0) {
      container.innerHTML = '<div style="text-align:center;color:#888;margin-top:10px;">暂无用户，请新建</div>';
      return;
    }

    users.forEach(user => {
      const div = document.createElement('div');
      div.className = `list-item ${user.id === activeUserId ? 'active' : ''}`;

      const avatarHtml = user.avatar
        ? `<div class="avatar ${user.avatarShape || 'circle'}"><img src="${user.avatar}"></div>`
        : `<div class="avatar ${user.avatarShape || 'circle'}">${user.name.charAt(0)}</div>`;

      div.innerHTML = `
        ${avatarHtml}
        <div class="item-info">
          <div class="item-name">${user.name}</div>
          <div class="item-desc">${user.profile ? user.profile.substring(0, 15) + '...' : '暂无设定'}</div>
        </div>
        <div class="item-actions">
          <button class="icon-btn edit-btn" title="编辑">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
          </button>
          <button class="icon-btn select-btn" title="选择">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
          </button>
        </div>
      `;

      div.querySelector('.select-btn').onclick = (e) => { e.stopPropagation(); onClick(user.id); };
      div.querySelector('.edit-btn').onclick = (e) => { e.stopPropagation(); onEdit(user.id); };

      container.appendChild(div);
    });
  },

  // 渲染最近聊天列表（侧边栏）
  renderRecentChatList(recentChats, characters, activeCharId, activeSessionId, onClick, onEdit) {
    const container = document.getElementById('recent-chat-list');
    container.innerHTML = '';
    if (recentChats.length === 0) {
      container.innerHTML = '<div style="text-align:center;color:#888;margin-top:20px;">暂无聊天记录</div>';
      return;
    }

    recentChats.forEach(item => {
      const char = characters.find(c => c.id === item.charId);
      if (!char) return;
      const div = document.createElement('div');
      const isActive = item.charId === activeCharId && item.sessionId === activeSessionId;
      div.className = `list-item ${isActive ? 'active' : ''}`;

      const avatarHtml = char.avatar
        ? `<div class="avatar ${char.avatarShape || 'circle'}"><img src="${char.avatar}"></div>`
        : `<div class="avatar ${char.avatarShape || 'circle'}">${char.name.charAt(0)}</div>`;

      const timeStr = this.formatTime(item.lastTime);
      const lastMsgText = item.lastMsg ? (item.lastMsg.length > 20 ? item.lastMsg.substring(0, 20) + '...' : item.lastMsg) : '';
      const sessionLabel = item.sessionId === 'default' ? '' : ` <span class="session-badge">#${recentChats.filter(r => r.charId === item.charId).indexOf(item) + 1}</span>`;

      div.innerHTML = `
        ${avatarHtml}
        <div class="item-info">
          <div class="item-name">${char.name}${sessionLabel}</div>
          <div class="item-desc">${lastMsgText}</div>
        </div>
        <div class="item-meta">
          <span class="item-time">${timeStr}</span>
          <div class="item-actions">
            <button class="icon-btn edit-btn" title="编辑">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
            </button>
          </div>
        </div>
      `;

      div.onclick = () => onClick(item.charId, item.sessionId);
      div.querySelector('.edit-btn').onclick = (e) => { e.stopPropagation(); onEdit(item.charId); };

      container.appendChild(div);
    });
  },

    // 格式化时间
    formatTime(timestamp) {
        const d = new Date(timestamp);
        return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    },

    // 渲染聊天消息
    renderChats(chats, user, character, onWithdraw) {
        const container = document.getElementById('chat-messages');
        container.innerHTML = '';
        
        if (!chats || chats.length === 0) {
            container.innerHTML = '<div class="welcome-msg">来和 ' + character.name + ' 打个招呼吧~</div>';
            return;
        }

        chats.forEach(msg => {
            const wrapper = document.createElement('div');
            wrapper.className = `msg-wrapper ${msg.role === 'user' ? 'right' : 'left'}`;

    if (msg.isWithdrawn) {
      const who = msg.role === 'user' ? user.name : character.name;
      wrapper.className = 'msg-wrapper msg-withdrawn-center';
      wrapper.innerHTML = `<div class="msg-withdrawn">${who}已撤回一条消息</div>`;
      container.appendChild(wrapper);
      return;
    }

            const isUser = msg.role === 'user';
            const avatarSrc = isUser ? user.avatar : character.avatar;
            const avatarShape = isUser ? (user.avatarShape || 'circle') : (character.avatarShape || 'circle');
            const defaultInitial = isUser ? user.name.charAt(0) : character.name.charAt(0);
            
            const avatarHtml = avatarSrc 
                ? `<div class="avatar msg-avatar ${avatarShape}"><img src="${avatarSrc}"></div>`
                : `<div class="avatar msg-avatar ${avatarShape}">${defaultInitial}</div>`;

            let contentHtml = '';
            
            // 文本消息
            if (msg.type === 'text') {
                contentHtml = `<div class="msg-bubble">${msg.content}</div>`;
            } 
            // 语音消息
            else if (msg.type === 'voice') {
                contentHtml = `
                    <div class="msg-bubble msg-voice">
                        <svg class="voice-icon" viewBox="0 0 24 24"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path></svg>
                        <span>${msg.duration}''</span>
                    </div>
                    <div class="voice-text">${msg.content}</div>
                `;
            }
    // 转账消息
    else if (msg.type === 'transfer') {
      const transferChar = msg.role === 'assistant' ? character : user;
      const transferAvatarHtml = transferChar.avatar
        ? `<img src="${transferChar.avatar}">`
        : `<span class="msg-transfer-avatar-text">${transferChar.name.charAt(0)}</span>`;
      contentHtml = `
      <div class="msg-transfer">
        <div class="msg-transfer-top">
          <div class="msg-transfer-avatar">${transferAvatarHtml}</div>
          <div class="msg-transfer-text">
            <div class="msg-transfer-title">${msg.note || '微信转账'}</div>
            <div class="msg-transfer-amount">¥${parseFloat(msg.amount).toFixed(2)}</div>
          </div>
        </div>
        <div class="msg-transfer-bottom">
          <div class="msg-transfer-sfsn"><svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg></div>
          <span class="msg-transfer-desc">微信转账</span>
        </div>
      </div>
      `;
    }
    // 图片消息
    else if (msg.type === 'image') {
      contentHtml = `<div class="msg-bubble msg-image"><img src="${msg.content}" onclick="UI.previewImage(this.src)"></div>`;
    }

    const timeStr = this.formatTime(msg.timestamp);
    const withdrawHtml = isUser ? `<span class="withdraw-btn">撤回</span>` : '';

    wrapper.innerHTML = `
    <div class="msg-content-row">
      ${avatarHtml}
      <div class="msg-body">
        <div class="msg-bubble-row">
          ${contentHtml}
          <div class="msg-time-side">${timeStr} ${withdrawHtml}</div>
        </div>
      </div>
    </div>
    `;

            if (isUser) {
                const wBtn = wrapper.querySelector('.withdraw-btn');
                if (wBtn) {
                    wBtn.onclick = () => onWithdraw(msg.id);
                }
            }

            container.appendChild(wrapper);
        });

        // 滚动到底部
        container.scrollTop = container.scrollHeight;
    },

  // 切换主题
  setTheme(themeName) {
    document.body.setAttribute('data-theme', themeName);
    document.querySelectorAll('.theme-color').forEach(el => {
      el.classList.toggle('active', el.dataset.themeVal === themeName);
    });
  },

  // 图片预览
  previewImage(src) {
    const overlay = document.createElement('div');
    overlay.className = 'image-preview-overlay';
    overlay.onclick = () => overlay.remove();
    const img = document.createElement('img');
    img.src = src;
    overlay.appendChild(img);
    document.getElementById('app-container').appendChild(overlay);
  }
};