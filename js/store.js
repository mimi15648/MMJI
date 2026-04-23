/**
 * 数据存储模块 (localStorage 操作)
 */
const Store = {
    // 默认数据结构
  defaultData: {
    users: [],
    characters: [],
    chats: {}, // 格式: userId_charId_sessionId: []
    sessions: {}, // 格式: userId_charId: [{sessionId, createdAt, lastTime}]
    settings: {
            theme: 'purple',
            apiUrl: '',
            apiKey: '',
            model: 'gpt-3.5-turbo',
            replyCount: 1,
            autoSummary: false
        }
    },

    getData() {
        const data = localStorage.getItem('ai_chat_simulator_data');
        if (!data) return JSON.parse(JSON.stringify(this.defaultData));
        try {
            return JSON.parse(data);
        } catch (e) {
            console.error("Local storage data parse error:", e);
            return JSON.parse(JSON.stringify(this.defaultData));
        }
    },

    saveData(data) {
        localStorage.setItem('ai_chat_simulator_data', JSON.stringify(data));
    },

    // --- 用户操作 ---
    getUsers() {
        return this.getData().users;
    },
    addUser(user) {
        const data = this.getData();
        user.id = 'user_' + Date.now();
        data.users.push(user);
        this.saveData(data);
        return user;
    },
    updateUser(updatedUser) {
        const data = this.getData();
        const index = data.users.findIndex(u => u.id === updatedUser.id);
        if (index > -1) {
            data.users[index] = updatedUser;
            this.saveData(data);
        }
    },
    deleteUser(userId) {
        const data = this.getData();
        data.users = data.users.filter(u => u.id !== userId);
        // 清理相关聊天记录
        for (let key in data.chats) {
            if (key.startsWith(userId + '_')) {
                delete data.chats[key];
            }
        }
        this.saveData(data);
    },

    // --- 角色操作 ---
    getCharacters() {
        return this.getData().characters;
    },
    addCharacter(char) {
        const data = this.getData();
        char.id = 'char_' + Date.now();
        data.characters.push(char);
        this.saveData(data);
        return char;
    },
    updateCharacter(updatedChar) {
        const data = this.getData();
        const index = data.characters.findIndex(c => c.id === updatedChar.id);
        if (index > -1) {
            data.characters[index] = updatedChar;
            this.saveData(data);
        }
    },
    deleteCharacter(charId) {
        const data = this.getData();
        data.characters = data.characters.filter(c => c.id !== charId);
        // 清理相关聊天记录
        for (let key in data.chats) {
            if (key.endsWith('_' + charId)) {
                delete data.chats[key];
            }
        }
        this.saveData(data);
    },

  // --- 聊天记录操作 ---
  getChatKey(userId, charId, sessionId) {
    if (!sessionId) sessionId = this.getDefaultSessionId(userId, charId);
    return `${userId}_${charId}_${sessionId}`;
  },

  getDefaultSessionId(userId, charId) {
    const sessions = this.getSessions(userId, charId);
    if (sessions.length > 0) {
      sessions.sort((a, b) => b.lastTime - a.lastTime);
      return sessions[0].sessionId;
    }
    this.ensureDefaultSession(userId, charId);
    return 'default';
  },

  ensureDefaultSession(userId, charId) {
    const data = this.getData();
    if (!data.sessions) data.sessions = {};
    const key = `${userId}_${charId}`;
    if (!data.sessions[key]) data.sessions[key] = [];
    const hasDefault = data.sessions[key].some(s => s.sessionId === 'default');
    if (!hasDefault) {
      const chatKey = `${userId}_${charId}_default`;
      const existingChats = data.chats[chatKey] || [];
      const lastTime = existingChats.length > 0 ? existingChats[existingChats.length - 1].timestamp : Date.now();
      data.sessions[key].push({ sessionId: 'default', createdAt: lastTime, lastTime: lastTime });
      this.saveData(data);
    }
  },

  getSessions(userId, charId) {
    const data = this.getData();
    const key = `${userId}_${charId}`;
    return data.sessions?.[key] || [];
  },

  addSession(userId, charId) {
    const data = this.getData();
    if (!data.sessions) data.sessions = {};
    const key = `${userId}_${charId}`;
    if (!data.sessions[key]) data.sessions[key] = [];
    const sessionId = 's_' + Date.now();
    data.sessions[key].push({ sessionId, createdAt: Date.now(), lastTime: Date.now() });
    this.saveData(data);
    return sessionId;
  },

  updateSessionTime(userId, charId, sessionId) {
    const data = this.getData();
    const key = `${userId}_${charId}`;
    if (data.sessions?.[key]) {
      const session = data.sessions[key].find(s => s.sessionId === sessionId);
      if (session) {
        session.lastTime = Date.now();
        this.saveData(data);
      }
    }
  },

  getChats(userId, charId, sessionId) {
    const data = this.getData();
    const key = this.getChatKey(userId, charId, sessionId);
    return data.chats[key] || [];
  },
  getRecentChats(userId) {
    const data = this.getData();
    const results = [];

    for (let sessionKey in (data.sessions || {})) {
      if (!sessionKey.startsWith(userId + '_')) continue;
      const charId = sessionKey.substring(userId.length + 1);
      const charExists = data.characters.some(c => c.id === charId);
      if (!charExists) continue;

      const sessions = data.sessions[sessionKey] || [];
      for (const session of sessions) {
        const chatKey = this.getChatKey(userId, charId, session.sessionId);
        const msgs = data.chats[chatKey] || [];
        if (msgs.length === 0) continue;
        const lastMsg = msgs[msgs.length - 1];
        results.push({
          charId: charId,
          sessionId: session.sessionId,
          lastMsg: lastMsg.content,
          lastTime: msgs[msgs.length - 1].timestamp,
          msgCount: msgs.length
        });
      }
    }

    for (let key in data.chats) {
      if (!key.startsWith(userId + '_')) continue;
      if (data.chats[key] && data.chats[key].length > 0) {
        const alreadyListed = results.some(r => key === this.getChatKey(userId, r.charId, r.sessionId));
        if (alreadyListed) continue;

        const lastUnderscoreIdx = key.lastIndexOf('_');
        const sessionId = key.substring(lastUnderscoreIdx + 1);
        const mainPart = key.substring(0, lastUnderscoreIdx);
        const charId = mainPart.substring(userId.length + 1);

        if (sessionId === 'default' && !results.some(r => r.charId === charId && r.sessionId === 'default')) {
          const msgs = data.chats[key];
          const lastMsg = msgs[msgs.length - 1];
          results.push({
            charId: charId,
            sessionId: 'default',
            lastMsg: lastMsg.content,
            lastTime: lastMsg.timestamp,
            msgCount: msgs.length
          });
        }
      }
    }

    results.sort((a, b) => b.lastTime - a.lastTime);
    return results;
  },
  addChatMsg(userId, charId, msg, sessionId) {
    const data = this.getData();
    if (!sessionId) sessionId = this.getDefaultSessionId(userId, charId);
    const key = this.getChatKey(userId, charId, sessionId);
    if (!data.chats[key]) data.chats[key] = [];
    msg.id = 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
    data.chats[key].push(msg);
    this.saveData(data);
    return msg;
  },
  withdrawMsg(userId, charId, msgId, sessionId) {
    const data = this.getData();
    if (!sessionId) sessionId = this.getDefaultSessionId(userId, charId);
    const key = this.getChatKey(userId, charId, sessionId);
    if (data.chats[key]) {
      const index = data.chats[key].findIndex(m => m.id === msgId);
      if (index > -1) {
        data.chats[key][index].isWithdrawn = true;
        data.chats[key][index].withdrawnBy = data.chats[key][index].role;
        data.chats[key][index].content = "";
        this.saveData(data);
        return true;
      }
    }
    return false;
  },
  clearChats(userId, charId, sessionId) {
    const data = this.getData();
    const key = this.getChatKey(userId, charId, sessionId);
    if (data.chats[key]) {
      delete data.chats[key];
      this.saveData(data);
    }
  },

    // --- 设置操作 ---
    getSettings() {
        return this.getData().settings;
    },
    updateSettings(newSettings) {
        const data = this.getData();
        data.settings = { ...data.settings, ...newSettings };
        this.saveData(data);
    },
    
    // 清除所有数据
    clearAll() {
        localStorage.removeItem('ai_chat_simulator_data');
    }
};