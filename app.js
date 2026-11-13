(() => {
  const GAS_URL_STORAGE_KEY = 'alex_site_gas_url';

  // Mobile nav toggle
  const navToggle = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');
  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      navLinks.classList.toggle('open');
    });
    navLinks.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => navLinks.classList.remove('open'));
    });
  }

  // Chatbot DOM elements
  const chatbotPanel = document.getElementById('chatbotPanel');
  const chatbotFab = document.getElementById('chatbotFab');
  const chatbotCloseBtn = document.getElementById('chatbotCloseBtn');
  const chatbotClearBtn = document.getElementById('chatbotClearBtn');
  const chatbotSettingsBtn = document.getElementById('chatbotSettingsBtn');
  const chatbotSettings = document.getElementById('chatbotSettings');
  const openChatFromHero = document.getElementById('openChatFromHero');

  const gasUrlInput = document.getElementById('gasUrlInput');
  const saveGasUrlBtn = document.getElementById('saveGasUrlBtn');
  const testGasUrlBtn = document.getElementById('testGasUrlBtn');
  const clearGasUrlBtn = document.getElementById('clearGasUrlBtn');
  const settingsFeedback = document.getElementById('settingsFeedback');

  const chatbotStatus = document.getElementById('chatbotStatus');
  const chatbotStatusText = document.getElementById('chatbotStatusText');
  const chatbotMessages = document.getElementById('chatbotMessages');
  const chatbotForm = document.getElementById('chatbotForm');
  const chatbotInput = document.getElementById('chatbotInput');
  const chatbotSendBtn = document.getElementById('chatbotSendBtn');
  const quickPrompts = document.getElementById('quickPrompts');

  // Multi-turn history sent to GAS -> OpenRouter (preserves reasoning_details)
  let conversationHistory = [];
  let isSending = false;

  function getSavedGasUrl() {
    return (localStorage.getItem(GAS_URL_STORAGE_KEY) || '').trim();
  }

  function updateConnectionStatus() {
    const url = getSavedGasUrl();
    if (url) {
      chatbotStatus.classList.add('connected');
      chatbotStatusText.textContent = '已連線 GAS 後端';
      gasUrlInput.value = url;
    } else {
      chatbotStatus.classList.remove('connected');
      chatbotStatusText.textContent = '尚未設定 GAS 網址';
      gasUrlInput.value = '';
    }
  }

  function appendMessage(text, role = 'bot') {
    const div = document.createElement('div');
    div.className = `msg ${role}`;
    div.textContent = text;
    chatbotMessages.appendChild(div);
    chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
    return div;
  }

  function initWelcomeMessage() {
    chatbotMessages.innerHTML = '';
    appendMessage(
      '你好！我是總裁 CEO 菁菁 Tang 的網站 AI 小客服 🤖\n你可以問我關於她的背景、代表專案或合作方式。',
      'bot'
    );
    if (!getSavedGasUrl()) {
      appendMessage(
        '提示：請先點擊右上角「⚙️ 設定」按鈕，填入您部署的 Google Apps Script (GAS) 網址即可開始對話。',
        'system-hint'
      );
    }
  }

  function setPanelOpen(open) {
    chatbotPanel.classList.toggle('open', open);
    chatbotPanel.setAttribute('aria-hidden', String(!open));
    if (open) {
      chatbotInput.focus();
    }
  }

  function toggleSettings(forceState) {
    const shouldOpen =
      typeof forceState === 'boolean' ? forceState : chatbotSettings.hidden;
    chatbotSettings.hidden = !shouldOpen;
    chatbotSettingsBtn.classList.toggle('active', shouldOpen);
    settingsFeedback.textContent = '';
    settingsFeedback.className = 'settings-feedback';
  }

  function showSettingsFeedback(message, isError = false) {
    settingsFeedback.textContent = message;
    settingsFeedback.className = `settings-feedback ${isError ? 'err' : 'ok'}`;
  }

  function isValidGasUrl(url) {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'https:' || parsed.protocol === 'http:';
    } catch {
      return false;
    }
  }

  // Event listeners for panel & settings
  chatbotFab.addEventListener('click', () => {
    setPanelOpen(!chatbotPanel.classList.contains('open'));
  });

  if (openChatFromHero) {
    openChatFromHero.addEventListener('click', () => {
      setPanelOpen(true);
    });
  }

  chatbotCloseBtn.addEventListener('click', () => setPanelOpen(false));
  chatbotSettingsBtn.addEventListener('click', () => toggleSettings());

  chatbotClearBtn.addEventListener('click', () => {
    conversationHistory = [];
    initWelcomeMessage();
  });

  saveGasUrlBtn.addEventListener('click', () => {
    const url = gasUrlInput.value.trim();
    if (!url) {
      showSettingsFeedback('請輸入 GAS Web App 網址。', true);
      return;
    }
    if (!isValidGasUrl(url)) {
      showSettingsFeedback('網址格式不正確，請確認以 https:// 開頭。', true);
      return;
    }
    localStorage.setItem(GAS_URL_STORAGE_KEY, url);
    updateConnectionStatus();
    showSettingsFeedback('已儲存 GAS 網址！');
    if (conversationHistory.length === 0) {
      initWelcomeMessage();
    }
  });

  clearGasUrlBtn.addEventListener('click', () => {
    localStorage.removeItem(GAS_URL_STORAGE_KEY);
    updateConnectionStatus();
    showSettingsFeedback('已清除儲存的網址。');
    if (conversationHistory.length === 0) {
      initWelcomeMessage();
    }
  });

  testGasUrlBtn.addEventListener('click', async () => {
    const url = gasUrlInput.value.trim() || getSavedGasUrl();
    if (!isValidGasUrl(url)) {
      showSettingsFeedback('請先輸入有效的 GAS 網址。', true);
      return;
    }
    showSettingsFeedback('正在測試連線...');
    try {
      const res = await fetch(url, { method: 'GET' });
      const data = await res.json();
      if (res.ok && data && data.ok) {
        showSettingsFeedback(`連線成功！(${data.message || 'GAS 運作正常'})`);
      } else {
        showSettingsFeedback(`連線失敗：${(data && data.error) || res.status}`, true);
      }
    } catch (err) {
      showSettingsFeedback(`無法連線：${err.message}`, true);
    }
  });

  // Quick prompts
  if (quickPrompts) {
    quickPrompts.querySelectorAll('.quick-chip').forEach((btn) => {
      btn.addEventListener('click', () => {
        const prompt = btn.getAttribute('data-prompt') || '';
        if (prompt) {
          sendUserMessage(prompt);
        }
      });
    });
  }

  // Send message to GAS
  async function sendUserMessage(text) {
    const trimmed = text.trim();
    if (!trimmed || isSending) return;

    const gasUrl = getSavedGasUrl();
    if (!gasUrl) {
      toggleSettings(true);
      showSettingsFeedback('請先貼上 GAS 網址並儲存，再開始對話。', true);
      appendMessage('尚未設定 GAS 網址，請先在上方設定欄貼上網址並儲存。', 'system-hint');
      return;
    }

    isSending = true;
    chatbotSendBtn.disabled = true;
    chatbotInput.value = '';

    appendMessage(trimmed, 'user');
    conversationHistory.push({ role: 'user', content: trimmed });

    const typingNode = appendMessage('思考中...', 'bot');

    try {
      // Use text/plain to avoid CORS preflight OPTIONS issues with Google Apps Script Web Apps
      const response = await fetch(gasUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify({
          messages: conversationHistory
        })
      });

      const data = await response.json();

      if (!response.ok || !data || data.error) {
        const errMsg = (data && data.error) || `HTTP ${response.status}`;
        typingNode.textContent = `抱歉，發生錯誤：${errMsg}`;
        conversationHistory.pop();
        return;
      }

      const replyText = data.content || '（無回覆內容）';
      typingNode.textContent = replyText;

      // Preserve reasoning_details unmodified for multi-turn OpenRouter reasoning
      const assistantMessage = {
        role: 'assistant',
        content: replyText
      };
      if (data.reasoning_details !== undefined && data.reasoning_details !== null) {
        assistantMessage.reasoning_details = data.reasoning_details;
      }
      conversationHistory.push(assistantMessage);
    } catch (err) {
      typingNode.textContent = `連線失敗，請確認 GAS 網址與部署權限是否設為「所有人」：${err.message}`;
      conversationHistory.pop();
    } finally {
      isSending = false;
      chatbotSendBtn.disabled = false;
      chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
    }
  }

  chatbotForm.addEventListener('submit', (e) => {
    e.preventDefault();
    sendUserMessage(chatbotInput.value);
  });

  // Init
  updateConnectionStatus();
  initWelcomeMessage();
})();
