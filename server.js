/**
 * Gemini 語音對話助手 + 情姻緣測算 — Backend Server
 * Express server with security: password protection, rate limiting, env-based API key.
 */

const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// ===== Configuration from Environment =====
const GOOGLE_AI_KEY = process.env.GOOGLE_AI_API_KEY || '';
const APP_PASSWORD = process.env.APP_PASSWORD || 'love2025'; // Default for local dev
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

// ===== Middleware =====
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// ===== Rate Limiting (in-memory) =====
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 15; // max requests per minute per IP

function rateLimit(req, res, next) {
    const ip = req.headers['x-forwarded-for'] || req.ip || 'unknown';
    const now = Date.now();
    const entry = rateLimitMap.get(ip) || { count: 0, firstRequest: now };

    if (now - entry.firstRequest > RATE_LIMIT_WINDOW) {
        entry.count = 1;
        entry.firstRequest = now;
    } else {
        entry.count++;
    }

    rateLimitMap.set(ip, entry);

    if (entry.count > RATE_LIMIT_MAX) {
        return res.status(429).json({ error: '請求太頻繁，請稍後再試。' });
    }
    next();
}

// Clean up rate limit map every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of rateLimitMap) {
        if (now - entry.firstRequest > RATE_LIMIT_WINDOW * 5) {
            rateLimitMap.delete(ip);
        }
    }
}, 5 * 60 * 1000);

// ===== Session Management (simple token-based) =====
const validTokens = new Set();

function generateToken() {
    const token = crypto.randomBytes(48).toString('hex');
    validTokens.add(token);
    return token;
}

// Auth check middleware - skip for login page and static auth assets
function authMiddleware(req, res, next) {
    // Allow login endpoint
    if (req.path === '/api/login') return next();

    // Allow login page
    if (req.path === '/login.html') return next();

    // Check token in cookie or header
    const token = req.headers['x-auth-token'] || parseCookie(req.headers.cookie, 'auth_token');

    if (!token || !validTokens.has(token)) {
        // If requesting HTML page, redirect to login
        if (req.accepts('html') && !req.path.startsWith('/api/')) {
            return res.redirect('/login.html');
        }
        return res.status(401).json({ error: '請先登入。' });
    }

    next();
}

function parseCookie(cookieStr, name) {
    if (!cookieStr) return null;
    const match = cookieStr.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
    return match ? match[1] : null;
}

// Apply auth middleware before static files
app.use(authMiddleware);
app.use(express.static(path.join(__dirname)));

// ===== Login Endpoint =====
app.post('/api/login', express.json(), (req, res) => {
    const { password } = req.body;

    if (password === APP_PASSWORD) {
        const token = generateToken();
        res.cookie('auth_token', token, {
            httpOnly: false, // Need JS access
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });
        res.json({ success: true, token });
    } else {
        res.status(401).json({ error: '密碼錯誤' });
    }
});

// ===== System Prompts =====
const CHAT_PROMPT = `你是一個友善且有幫助的語音對話助手。使用者透過語音和你對話，所以請注意以下幾點：
1. 回覆要簡潔自然，適合朗讀。
2. 避免使用過長的段落、表格或 markdown 格式。
3. 使用口語化的表達方式。
4. 回覆保持在 2-4 句話左右。`;

const FORTUNE_PROMPT = `你是一位精通中國傳統命理的大師，擅長八字命理、紫微斗數、易經占卜、姓名學。
你要根據以下資料，為兩位緣主進行詳細的姻緣配對分析。

分析要求：
1. 用溫暖且專業的語調，像是面對面跟人說話
2. 避免使用表格和 markdown 格式（結果會被語音朗讀）
3. 回覆用繁體中文
4. 分析涵蓋：八字合婚、紫微斗數、易經卦象、生肖配對、綜合建議
5. 如果已斷聯，分析復合機會和建議
6. 回覆約 300-500 字，適合朗讀`;

// ===== Helper: Get API Key =====
function getApiKey(dynamicKey) {
    // Prefer server-side env var, fallback to dynamic key from frontend
    return GOOGLE_AI_KEY || dynamicKey || '';
}

// ===== POST /api/chat =====
app.post('/api/chat', rateLimit, async (req, res) => {
    const { message, history = [], model = 'gemini-3-flash-preview', dynamicApiKey } = req.body;
    const activeKey = getApiKey(dynamicApiKey);

    if (!activeKey) {
        return res.status(400).json({ error: '未設定 API Key，請聯繫管理員。' });
    }

    if (!message || !message.trim()) {
        return res.status(400).json({ error: '訊息不能為空。' });
    }

    try {
        const genAI = new GoogleGenerativeAI(activeKey);
        const genModel = genAI.getGenerativeModel({ model, systemInstruction: CHAT_PROMPT });

        const chatHistory = history.map(h => ({
            role: h.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: h.text }],
        }));

        const chat = genModel.startChat({ history: chatHistory });
        const result = await chat.sendMessage(message);
        const reply = result.response.text();

        res.json({ reply, model });
    } catch (err) {
        console.error('Chat API error:', err.message);
        handleGeminiError(err, res);
    }
});

// ===== POST /api/fortune =====
app.post('/api/fortune', rateLimit, async (req, res) => {
    const { fortuneData, dynamicApiKey } = req.body;
    const activeKey = getApiKey(dynamicApiKey);

    if (!activeKey) {
        return res.status(400).json({ error: '未設定 API Key，請聯繫管理員。' });
    }

    const p = fortuneData.personA;
    const q = fortuneData.personB;
    const compat = fortuneData.compatibility;
    const yijing = fortuneData.yijing;

    let userMessage = `請分析以下兩位緣主的姻緣配對：

【甲方】${p.name}（${p.gender === 'male' ? '男' : '女'}）
生日：${p.birthday}，${p.shichen}
八字：${p.bazi}，日主：${p.riGan}，納音：${p.nayin}
生肖：${p.shengxiao}
五行：金${p.wuxing['金']} 木${p.wuxing['木']} 水${p.wuxing['水']} 火${p.wuxing['火']} 土${p.wuxing['土']}
紫微主星：${p.ziweiStar}，命宮：${p.ziweiPalace}

【乙方】${q.name}（${q.gender === 'male' ? '男' : '女'}）
生日：${q.birthday}，${q.shichen}
八字：${q.bazi}，日主：${q.riGan}，納音：${q.nayin}
生肖：${q.shengxiao}
五行：金${q.wuxing['金']} 木${q.wuxing['木']} 水${q.wuxing['水']} 火${q.wuxing['火']} 土${q.wuxing['土']}
紫微主星：${q.ziweiStar}，命宮：${q.ziweiPalace}

【配對】生肖：${compat.animalCompat.level}，五行：${compat.wuxingRelation.relation}
易經：${yijing.name}卦（${yijing.meaning}），姻緣指數：${compat.score}分`;

    if (fortuneData.isDisconnected) {
        userMessage += `\n\n【特別分析】兩人已斷聯，請分析復合機會及建議時機和做法。`;
    }

    try {
        const genAI = new GoogleGenerativeAI(activeKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview', systemInstruction: FORTUNE_PROMPT });
        const result = await model.generateContent(userMessage);
        res.json({ reply: result.response.text() });
    } catch (err) {
        console.error('Fortune API error:', err.message);
        handleGeminiError(err, res);
    }
});

// ===== Error Handler =====
function handleGeminiError(err, res) {
    if (err.message.includes('API_KEY_INVALID') || err.message.includes('API key not valid')) {
        return res.status(401).json({ error: 'API Key 無效。' });
    }
    if (err.message.includes('RATE_LIMIT') || err.message.includes('429')) {
        return res.status(429).json({ error: '請求太頻繁，請稍後再試。' });
    }
    if (err.message.includes('SAFETY')) {
        return res.status(400).json({ error: '回覆被安全過濾器攔截。' });
    }
    res.status(500).json({ error: `伺服器錯誤: ${err.message}` });
}

// ===== Health =====
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', hasEnvKey: !!GOOGLE_AI_KEY });
});

// ===== Start =====
app.listen(PORT, () => {
    console.log(`\n🎤 Gemini 語音對話助手已啟動`);
    console.log(`📡 http://localhost:${PORT}`);
    console.log(`🔒 密碼保護：已啟用 (密碼: ${APP_PASSWORD})`);
    console.log(`🔑 API Key: ${GOOGLE_AI_KEY ? '✅ 環境變數' : '⚠️ 需從前端輸入'}`);
    console.log(`⚡ 速率限制：${RATE_LIMIT_MAX} 次/分鐘\n`);
});
