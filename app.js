/**
 * Gemini 語音對話助手 — Frontend App
 * Connects to the Node.js backend to chat with Gemini via voice.
 */

// ===== Configuration =====
const API_BASE = window.location.origin;

// ===== DOM Elements =====
const chatMessages = document.getElementById('chatMessages');
const chatArea = document.getElementById('chatArea');
const welcomeSection = document.getElementById('welcomeSection');
const micButton = document.getElementById('micButton');
const micIcon = document.getElementById('micIcon');
const stopIcon = document.getElementById('stopIcon');
const micRipple = document.getElementById('micRipple');
const statusBadge = document.getElementById('statusBadge');
const transcriptPreview = document.getElementById('transcriptPreview');
const transcriptText = document.getElementById('transcriptText');
const hintText = document.getElementById('hintText');
const visualizerContainer = document.getElementById('visualizerContainer');
const waveformCanvas = document.getElementById('waveformCanvas');
const clearBtn = document.getElementById('clearBtn');
const settingsBtn = document.getElementById('settingsBtn');
const settingsPanel = document.getElementById('settingsPanel');
const closeSettings = document.getElementById('closeSettings');
const langSelect = document.getElementById('langSelect');
const voiceSelect = document.getElementById('voiceSelect');
const rateRange = document.getElementById('rateRange');
const rateValue = document.getElementById('rateValue');
const pitchRange = document.getElementById('pitchRange');
const pitchValue = document.getElementById('pitchValue');
const apiKeyInput = document.getElementById('apiKeyInput');
const apiKeyHint = document.getElementById('apiKeyHint');
const toggleKeyVisibility = document.getElementById('toggleKeyVisibility');
const modelSelect = document.getElementById('modelSelect');

// ===== State =====
let isListening = false;
let recognition = null;
let synth = window.speechSynthesis;
let audioContext = null;
let analyser = null;
let microphone = null;
let animationFrameId = null;
let conversationHistory = [];
let currentTranscript = '';
let isProcessing = false;

// ===== Load saved settings =====
function loadSettings() {
    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) {
        apiKeyInput.value = savedKey;
    }
    const savedModel = localStorage.getItem('gemini_model');
    if (savedModel) {
        modelSelect.value = savedModel;
    }
    const savedLang = localStorage.getItem('voice_lang');
    if (savedLang) {
        langSelect.value = savedLang;
    }
    const savedRate = localStorage.getItem('voice_rate');
    if (savedRate) {
        rateRange.value = savedRate;
        rateValue.textContent = parseFloat(savedRate).toFixed(1) + 'x';
    }
    const savedPitch = localStorage.getItem('voice_pitch');
    if (savedPitch) {
        pitchRange.value = savedPitch;
        pitchValue.textContent = parseFloat(savedPitch).toFixed(1);
    }
}

function saveSettings() {
    if (apiKeyInput.value.trim()) {
        localStorage.setItem('gemini_api_key', apiKeyInput.value.trim());
    }
    localStorage.setItem('gemini_model', modelSelect.value);
    localStorage.setItem('voice_lang', langSelect.value);
    localStorage.setItem('voice_rate', rateRange.value);
    localStorage.setItem('voice_pitch', pitchRange.value);
}

// ===== Speech Recognition =====
function initRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        showNotSupported();
        return;
    }

    recognition = new SpeechRecognition();
    recognition.lang = langSelect.value;
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
        isListening = true;
        updateUI('listening');
    };

    recognition.onresult = (event) => {
        let interim = '';
        let final = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                final += transcript;
            } else {
                interim += transcript;
            }
        }

        if (final) {
            currentTranscript = final;
            transcriptText.textContent = final;
        } else if (interim) {
            currentTranscript = interim;
            transcriptText.textContent = interim;
        }
    };

    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
            hintText.textContent = '請允許麥克風權限';
        }
        stopListening();
    };

    recognition.onend = () => {
        if (isListening) {
            if (currentTranscript.trim()) {
                processUserMessage(currentTranscript.trim());
            }
            stopListening();
        }
    };
}

function showNotSupported() {
    hintText.textContent = '你的瀏覽器不支援語音辨識，請使用 Chrome';
    micButton.disabled = true;
    micButton.style.opacity = '0.5';
}

// ===== Audio Visualization =====
async function startAudioVisualization() {
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        microphone = audioContext.createMediaStreamSource(stream);
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.8;
        microphone.connect(analyser);

        visualizerContainer.classList.add('active');
        resizeCanvas();
        drawWaveform();
    } catch (err) {
        console.error('Audio visualization error:', err);
    }
}

function stopAudioVisualization() {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
    if (microphone) {
        microphone.disconnect();
        microphone = null;
    }
    if (audioContext) {
        audioContext.close();
        audioContext = null;
    }
    visualizerContainer.classList.remove('active');
}

function resizeCanvas() {
    const rect = visualizerContainer.getBoundingClientRect();
    waveformCanvas.width = rect.width * window.devicePixelRatio;
    waveformCanvas.height = rect.height * window.devicePixelRatio;
    waveformCanvas.style.width = rect.width + 'px';
    waveformCanvas.style.height = rect.height + 'px';
}

function drawWaveform() {
    if (!analyser) return;

    const ctx = waveformCanvas.getContext('2d');
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    function draw() {
        animationFrameId = requestAnimationFrame(draw);
        analyser.getByteFrequencyData(dataArray);

        const width = waveformCanvas.width;
        const height = waveformCanvas.height;
        ctx.clearRect(0, 0, width, height);

        const barCount = 64;
        const barWidth = width / barCount;
        const gap = 2 * window.devicePixelRatio;

        for (let i = 0; i < barCount; i++) {
            const dataIndex = Math.floor((i * bufferLength) / barCount);
            const value = dataArray[dataIndex] / 255;
            const barHeight = Math.max(2 * window.devicePixelRatio, value * height * 0.8);

            const x = i * barWidth + gap / 2;
            const y = (height - barHeight) / 2;

            const hue = 240 + (i / barCount) * 60;
            const saturation = 70 + value * 30;
            const lightness = 50 + value * 20;
            ctx.fillStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${0.4 + value * 0.6})`;
            ctx.beginPath();
            ctx.roundRect(x, y, barWidth - gap, barHeight, 2 * window.devicePixelRatio);
            ctx.fill();
        }
    }

    draw();
}

// ===== Listening Control =====
async function startListening() {
    if (isListening || isProcessing) return;

    currentTranscript = '';
    transcriptText.textContent = '';

    initRecognition();
    if (!recognition) return;

    try {
        recognition.start();
        await startAudioVisualization();
    } catch (err) {
        console.error('Start listening error:', err);
    }
}

function stopListening() {
    isListening = false;

    if (recognition) {
        try {
            recognition.stop();
        } catch (e) {
            /* ignore */
        }
    }

    stopAudioVisualization();
    if (!isProcessing) {
        updateUI('idle');
    }
    currentTranscript = '';
}

// ===== Message Processing =====
async function processUserMessage(text) {
    if (isProcessing) return;
    isProcessing = true;

    // Check for API key
    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
        showErrorToast('請先在設定中輸入 Google AI API Key（免費）');
        isProcessing = false;
        updateUI('idle');
        settingsPanel.classList.remove('hidden');
        return;
    }

    // Hide welcome section
    if (welcomeSection) {
        welcomeSection.style.display = 'none';
    }

    // Add user message
    addMessage('user', text);
    updateUI('processing');

    // Show typing indicator
    showTypingIndicator();

    try {
        const response = await fetch(`${API_BASE}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: text,
                history: conversationHistory.slice(-20), // Last 20 messages for context
                model: modelSelect.value,
                dynamicApiKey: apiKey,
            }),
        });

        removeTypingIndicator();

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const data = await response.json();
        const reply = data.reply;

        addMessage('assistant', reply);

        // Speak the reply
        speakText(reply);
    } catch (err) {
        removeTypingIndicator();
        console.error('Chat error:', err);

        const errorMsg = err.message || '連線失敗，請確認伺服器是否運行中（npm start）';
        showErrorToast(errorMsg);
        addMessage('assistant', `⚠️ ${errorMsg}`);
        updateUI('idle');
    } finally {
        isProcessing = false;
    }
}

function addMessage(role, text) {
    const time = new Date().toLocaleTimeString('zh-TW', {
        hour: '2-digit',
        minute: '2-digit',
    });
    const avatar = role === 'user' ? '👤' : '✨';

    const messageEl = document.createElement('div');
    messageEl.className = `message ${role}`;
    messageEl.innerHTML = `
    <div class="message-avatar">${avatar}</div>
    <div>
      <div class="message-content">${escapeHtml(text)}</div>
      <div class="message-time">${time}</div>
    </div>
  `;

    chatMessages.appendChild(messageEl);
    scrollToBottom();

    conversationHistory.push({ role, text, time });
}

function showTypingIndicator() {
    const typingEl = document.createElement('div');
    typingEl.className = 'message assistant';
    typingEl.id = 'typingIndicator';
    typingEl.innerHTML = `
    <div class="message-avatar">✨</div>
    <div class="message-content">
      <div class="typing-indicator">
        <span></span><span></span><span></span>
      </div>
    </div>
  `;
    chatMessages.appendChild(typingEl);
    scrollToBottom();
}

function removeTypingIndicator() {
    const el = document.getElementById('typingIndicator');
    if (el) el.remove();
}

function scrollToBottom() {
    requestAnimationFrame(() => {
        chatArea.scrollTop = chatArea.scrollHeight;
    });
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ===== Error Toast =====
function showErrorToast(message) {
    // Remove existing toast
    const existing = document.querySelector('.error-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'error-toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// ===== Text-to-Speech =====
function speakText(text) {
    // Clean markdown-like formatting for speech
    const cleanText = text
        .replace(/[*_`#]/g, '')
        .replace(/\n+/g, '。 ')
        .trim();

    synth.cancel();
    updateUI('speaking');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = langSelect.value;
    utterance.rate = parseFloat(rateRange.value);
    utterance.pitch = parseFloat(pitchRange.value);

    // Pick matching voice
    const voices = synth.getVoices();
    const selectedVoice = voiceSelect.value;
    if (selectedVoice) {
        const voice = voices.find((v) => v.name === selectedVoice);
        if (voice) utterance.voice = voice;
    } else {
        const langVoice = voices.find((v) =>
            v.lang.startsWith(langSelect.value.split('-')[0])
        );
        if (langVoice) utterance.voice = langVoice;
    }

    utterance.onend = () => {
        updateUI('idle');
        isProcessing = false;
    };
    utterance.onerror = () => {
        updateUI('idle');
        isProcessing = false;
    };

    synth.speak(utterance);
}

// ===== UI Updates =====
function updateUI(state) {
    const badge = statusBadge;
    const text = badge.querySelector('.status-text');

    badge.className = 'status-badge';

    switch (state) {
        case 'listening':
            badge.classList.add('listening');
            text.textContent = '聆聽中...';
            micButton.classList.add('recording');
            micIcon.classList.add('hidden');
            stopIcon.classList.remove('hidden');
            micRipple.classList.add('animating');
            transcriptPreview.classList.add('active');
            hintText.textContent = '正在聆聽，再次點擊結束';
            break;

        case 'processing':
            badge.classList.add('processing');
            text.textContent = 'Gemini 思考中...';
            transcriptPreview.classList.remove('active');
            hintText.textContent = 'Gemini 正在回覆...';
            micButton.classList.remove('recording');
            micIcon.classList.remove('hidden');
            stopIcon.classList.add('hidden');
            micRipple.classList.remove('animating');
            break;

        case 'speaking':
            badge.classList.add('speaking');
            text.textContent = '回覆中...';
            hintText.textContent = 'Gemini 正在說話...';
            break;

        case 'idle':
        default:
            text.textContent = '準備就緒';
            micButton.classList.remove('recording');
            micIcon.classList.remove('hidden');
            stopIcon.classList.add('hidden');
            micRipple.classList.remove('animating');
            transcriptPreview.classList.remove('active');
            transcriptText.textContent = '';
            hintText.textContent = '點擊麥克風開始對話';
            break;
    }
}

// ===== Voice List =====
function loadVoices() {
    const voices = synth.getVoices();
    voiceSelect.innerHTML = '<option value="">系統預設</option>';

    voices.forEach((voice) => {
        const opt = document.createElement('option');
        opt.value = voice.name;
        opt.textContent = `${voice.name} (${voice.lang})`;
        voiceSelect.appendChild(opt);
    });

    // Restore saved voice
    const savedVoice = localStorage.getItem('voice_name');
    if (savedVoice) {
        voiceSelect.value = savedVoice;
    }
}

// ===== Event Listeners =====
micButton.addEventListener('click', () => {
    if (isProcessing) return;

    if (isListening) {
        if (currentTranscript.trim()) {
            processUserMessage(currentTranscript.trim());
        }
        stopListening();
    } else {
        startListening();
    }
});

clearBtn.addEventListener('click', () => {
    chatMessages.innerHTML = '';
    conversationHistory = [];

    // Re-add welcome
    const welcome = document.createElement('div');
    welcome.className = 'welcome-section';
    welcome.id = 'welcomeSection';
    welcome.innerHTML = `
    <div class="welcome-icon">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="url(#welcomeGrad)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <defs>
          <linearGradient id="welcomeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#818cf8"/>
            <stop offset="100%" style="stop-color:#c084fc"/>
          </linearGradient>
        </defs>
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
        <line x1="12" y1="19" x2="12" y2="23"/>
        <line x1="8" y1="23" x2="16" y2="23"/>
      </svg>
    </div>
    <h2>你好！我是 Gemini</h2>
    <p>點擊下方麥克風按鈕，用語音和我對話</p>
    <div class="feature-chips">
      <span class="chip">🎤 語音輸入</span>
      <span class="chip">✨ Gemini AI</span>
      <span class="chip">🔊 語音回覆</span>
    </div>
  `;
    chatMessages.appendChild(welcome);
});

settingsBtn.addEventListener('click', () => {
    settingsPanel.classList.remove('hidden');
});

closeSettings.addEventListener('click', () => {
    saveSettings();
    settingsPanel.classList.add('hidden');
});

settingsPanel.addEventListener('click', (e) => {
    if (e.target === settingsPanel) {
        saveSettings();
        settingsPanel.classList.add('hidden');
    }
});

// API Key visibility toggle
toggleKeyVisibility.addEventListener('click', () => {
    const input = apiKeyInput;
    if (input.type === 'password') {
        input.type = 'text';
    } else {
        input.type = 'password';
    }
});

// Save API key on change
apiKeyInput.addEventListener('change', () => {
    const key = apiKeyInput.value.trim();
    if (key) {
        localStorage.setItem('gemini_api_key', key);
        apiKeyHint.textContent = '✓ 已儲存';
        apiKeyHint.className = 'setting-hint success';
        setTimeout(() => {
            apiKeyHint.textContent = '🆓 免費取得：aistudio.google.com';
            apiKeyHint.className = 'setting-hint';
        }, 2000);
    }
});

modelSelect.addEventListener('change', () => {
    localStorage.setItem('gemini_model', modelSelect.value);
});

langSelect.addEventListener('change', () => {
    if (recognition) {
        recognition.lang = langSelect.value;
    }
    saveSettings();
});

voiceSelect.addEventListener('change', () => {
    localStorage.setItem('voice_name', voiceSelect.value);
});

rateRange.addEventListener('input', () => {
    rateValue.textContent = parseFloat(rateRange.value).toFixed(1) + 'x';
});

pitchRange.addEventListener('input', () => {
    pitchValue.textContent = parseFloat(pitchRange.value).toFixed(1);
});

// Load voices
if (synth.onvoiceschanged !== undefined) {
    synth.onvoiceschanged = loadVoices;
}

// Handle canvas resize
window.addEventListener('resize', () => {
    if (visualizerContainer.classList.contains('active')) {
        resizeCanvas();
    }
});

// Keyboard shortcut: Space to toggle recording
document.addEventListener('keydown', (e) => {
    if (
        e.code === 'Space' &&
        e.target === document.body &&
        !isProcessing
    ) {
        e.preventDefault();
        micButton.click();
    }
});

// ===== Initialize =====
loadSettings();
loadVoices();
updateUI('idle');

console.log('🎤 Gemini 語音對話助手已啟動');
