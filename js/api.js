/**
 * API 调用模块
 */
const Api = {
    // 基础对话请求
  async chat(messages, settings, segmentCount) {
    if (!settings.apiUrl || !settings.apiKey) {
      throw new Error("请先在全局设置中配置 API URL 和 API Key");
    }

    const segs = Math.max(1, parseInt(segmentCount) || 1);
    const segNote = segs > 1
      ? `\n\n[系统指令：请将你的回复分成${segs}段发送，每段之间用特殊分隔符【SEGMENT】隔开。例如：第一段内容【SEGMENT】第二段内容【SEGMENT】第三段内容。请务必使用【SEGMENT】作为分隔符。]`
      : '';

    const lastMsg = messages[messages.length - 1];
    const patchedMessages = [...messages.slice(0, -1)];
    if (lastMsg) {
      patchedMessages.push({
        ...lastMsg,
        content: lastMsg.content + segNote
      });
    }

    const payload = {
      model: settings.model || "gpt-3.5-turbo",
      messages: patchedMessages,
      stream: false
    };

        try {
            const response = await fetch(settings.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${settings.apiKey}`
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error?.message || "API 请求失败");
            }

            const data = await response.json();
            return data.choices[0].message.content;
        } catch (error) {
            console.error("API Chat Error:", error);
            throw error;
        }
    },

    // 总结记忆请求
    async summarize(chats, memoryFormat, settings) {
        if (!settings.apiUrl || !settings.apiKey) return null;

        const systemPrompt = `你是一个优秀的记忆总结助手。请根据以下记忆格式要求，总结提供的对话记录。
记忆格式要求：\n${memoryFormat || '提取关键信息并简明扼要地总结'}`;
        
        const chatText = chats.map(c => `${c.role === 'user' ? '用户' : '角色'}: ${c.content}`).join('\n');
        
        const messages = [
            { role: "system", content: systemPrompt },
            { role: "user", content: `请总结以下对话：\n${chatText}` }
        ];

        try {
            return await this.chat(messages, settings, 1);
        } catch (error) {
            console.error("API Summarize Error:", error);
            return null;
        }
    },

    async fetchModels(apiUrl, apiKey) {
    try {
      const urlObj = new URL(apiUrl);
      const candidates = [];

      const pathname = urlObj.pathname.replace(/\/+$/, '');
      const baseWithV1 = `${urlObj.origin}/v1/models`;
      const baseOrigin = `${urlObj.origin}/models`;

      if (/\/v1\/chat\/completions\/?$/i.test(pathname)) {
        candidates.push(`${urlObj.origin}/v1/models`);
      } else if (/\/chat\/completions\/?$/i.test(pathname)) {
        candidates.push(`${urlObj.origin}/v1/models`, `${urlObj.origin}/models`);
      } else if (/\/v1\/?$/i.test(pathname)) {
        candidates.push(`${urlObj.origin}/v1/models`);
      } else {
        candidates.push(`${urlObj.origin}/v1/models`, `${urlObj.origin}/models`);
      }

      const uniqueCandidates = [...new Set(candidates)];
      let lastError = null;

      for (const url of uniqueCandidates) {
        try {
          const response = await fetch(url, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${apiKey}` }
          });

          if (response.ok) {
            const data = await response.json();
            if (data.data && Array.isArray(data.data)) {
              return data.data.map(m => m.id).sort();
            }
          }
          lastError = new Error(`HTTP ${response.status}`);
        } catch (err) {
          lastError = err;
        }
      }

      throw lastError || new Error("无法获取模型列表");
    } catch (error) {
      console.error("API Fetch Models Error:", error);
      throw error;
    }
  },

  // 格式化历史消息用于请求
    formatHistory(userProfile, charSetting, charWorldbook, charMemory, chats) {
        const messages = [];
        
        // 构造 System Prompt
        let systemContent = "你正在扮演一个角色与用户进行对话。请严格遵守角色设定，保持人物性格，以角色的口吻回复，不要提及你是一个AI模型。";
        
        if (charSetting) systemContent += `\n\n【角色设定】\n${charSetting}`;
        if (charWorldbook) systemContent += `\n\n【世界书】\n${charWorldbook}`;
        if (userProfile) systemContent += `\n\n【用户设定】\n用户是这样描述自己的：\n${userProfile}`;
        if (charMemory) systemContent += `\n\n【近期记忆】\n${charMemory}`;
        
        messages.push({ role: "system", content: systemContent });

        // 拼接历史记录 (只取最近的轮数避免超token，这里简单处理)
        const recentChats = chats.slice(-20); // 取最近20条
        recentChats.forEach(c => {
      if (!c.isWithdrawn) {
        let msgContent;
        if (c.type === 'transfer') {
          msgContent = `[系统提示：${c.role === 'user' ? '用户' : '角色'}发送了一笔转账：${c.amount}元，备注：${c.note}]`;
        } else if (c.type === 'voice') {
          msgContent = `[系统提示：${c.role === 'user' ? '用户' : '角色'}发送了一条语音消息，内容是：${c.content}]`;
        } else if (c.type === 'image') {
          msgContent = `[系统提示：${c.role === 'user' ? '用户' : '角色'}发送了一张图片]`;
        } else {
          msgContent = c.content;
        }
        messages.push({
          role: c.role === 'user' ? 'user' : 'assistant',
          content: msgContent
        });
      }
        });

        return messages;
    }
};