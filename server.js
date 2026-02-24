/**
 * Gemini 語音對話助手 — Backend Server
 * Express server with Google Gemini API integration.
 */

const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname)));

// System prompt for Gemini
const SYSTEM_PROMPT = `你是一個友善且有幫助的語音對話助手。使用者透過語音和你對話，所以請注意以下幾點：
1. 回覆要簡潔自然，適合朗讀。
2. 避免使用過長的段落、表格或 markdown 格式（因為會被朗讀出來）。
3. 使用口語化的表達方式。
4. 如果使用者用中文，請用中文回覆；如果用英文，請用英文回覆。
5. 適當使用語氣詞讓對話更自然。
6. 回覆保持在 2-4 句話左右，不要太長。`;

// POST /api/chat — Send message to Gemini
app.post('/api/chat', async (req, res) => {
    const { message, history = [], model = 'gemini-3-flash-preview', dynamicApiKey } = req.body;

    const activeKey = dynamicApiKey || process.env.GOOGLE_AI_API_KEY || '';

    if (!activeKey) {
        return res.status(400).json({
            error: '請先設定 Google AI API Key。你可以在設定面板中輸入，或在 aistudio.google.com 取得免費 API Key。',
        });
    }

    if (!message || !message.trim()) {
        return res.status(400).json({ error: '訊息不能為空。' });
    }

    try {
        const genAI = new GoogleGenerativeAI(activeKey);
        const genModel = genAI.getGenerativeModel({
            model: model,
            systemInstruction: SYSTEM_PROMPT,
        });

        // Build chat history for multi-turn conversation
        const chatHistory = history.map((h) => ({
            role: h.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: h.text }],
        }));

        const chat = genModel.startChat({
            history: chatHistory,
        });

        const result = await chat.sendMessage(message);
        const response = result.response;
        const assistantReply = response.text();

        res.json({
            reply: assistantReply,
            model: model,
        });
    } catch (err) {
        console.error('Gemini API error:', err.message);

        if (err.message.includes('API_KEY_INVALID') || err.message.includes('API key not valid')) {
            return res.status(401).json({ error: 'API Key 無效，請檢查你的 Google AI API Key。' });
        }
        if (err.message.includes('RATE_LIMIT') || err.message.includes('429')) {
            return res.status(429).json({ error: '請求太頻繁，請稍後再試。免費版有每分鐘請求限制。' });
        }
        if (err.message.includes('SAFETY')) {
            return res.status(400).json({ error: '回覆被安全過濾器攔截，請換個話題。' });
        }

        res.status(500).json({ error: `伺服器錯誤: ${err.message}` });
    }
});

// POST /api/fortune — Fortune analysis with Gemini
app.post('/api/fortune', async (req, res) => {
    const { fortuneData, dynamicApiKey } = req.body;
    const activeKey = dynamicApiKey || process.env.GOOGLE_AI_API_KEY || '';

    if (!activeKey) {
        return res.status(400).json({ error: '請先設定 Google AI API Key。' });
    }

    const FORTUNE_PROMPT = `你是一位精通中國傳統命理的大師，擅長八字命理、紫微斗數、易經占卜、姓名學。
你要根據以下資料，為兩位緣主進行詳細的姻緣配對分析。

分析要求：
1. 用溫暖且專業的語調，像是面對面跟人說話
2. 內容要有條理，但避免使用表格和 markdown 格式（結果會被語音朗讀）
3. 回覆用繁體中文
4. 分析需涵蓋以下面向：
   - 八字合婚分析（天干地支、五行互補）
   - 紫微斗數分析（主星特質、命宮互動）
   - 易經卦象指引（當下卦象的啟示）
   - 生肖配對（相合相沖）
   - 綜合姻緣建議
5. 如果對方已斷聯，需要特別分析是否還有回頭的機會，以及建議的做法
6. 回覆約 300-500 字，適合朗讀`;

    const p = fortuneData.personA;
    const q = fortuneData.personB;
    const compat = fortuneData.compatibility;
    const yijing = fortuneData.yijing;

    let userMessage = `請分析以下兩位緣主的姻緣配對：

【甲方】${p.name}（${p.gender === 'male' ? '男' : '女'}）
生日：${p.birthday}，${p.shichen}
八字：${p.bazi}
日主：${p.riGan}
納音：${p.nayin}
生肖：${p.shengxiao}
五行分佈：金${p.wuxing['金']} 木${p.wuxing['木']} 水${p.wuxing['水']} 火${p.wuxing['火']} 土${p.wuxing['土']}
紫微主星：${p.ziweiStar}，命宮在${p.ziweiPalace}

【乙方】${q.name}（${q.gender === 'male' ? '男' : '女'}）
生日：${q.birthday}，${q.shichen}
八字：${q.bazi}
日主：${q.riGan}
納音：${q.nayin}
生肖：${q.shengxiao}
五行分佈：金${q.wuxing['金']} 木${q.wuxing['木']} 水${q.wuxing['水']} 火${q.wuxing['火']} 土${q.wuxing['土']}
紫微主星：${q.ziweiStar}，命宮在${q.ziweiPalace}

【配對資訊】
生肖配對：${compat.animalCompat.level}（${compat.animalCompat.desc}）
五行關係：${compat.wuxingRelation.relation}（${compat.wuxingRelation.desc}）
易經卦象：${yijing.name}卦 ${yijing.symbol}（${yijing.meaning}）
姻緣指數：${compat.score}分`;

    if (fortuneData.isDisconnected) {
        userMessage += `\n\n【特別分析】兩人目前已斷聯。請根據以上命理資訊，特別分析：
1. 兩人的緣分是否已盡，還是只是暫時的考驗？
2. 是否還有回頭、復合的機會？
3. 如果想挽回，從命理角度給出具體建議和時機`;
    }

    try {
        const genAI = new GoogleGenerativeAI(activeKey);
        const model = genAI.getGenerativeModel({
            model: 'gemini-3-flash-preview',
            systemInstruction: FORTUNE_PROMPT,
        });

        const result = await model.generateContent(userMessage);
        const reply = result.response.text();

        res.json({ reply });
    } catch (err) {
        console.error('Fortune API error:', err.message);
        if (err.message.includes('API_KEY_INVALID') || err.message.includes('API key not valid')) {
            return res.status(401).json({ error: 'API Key 無效。' });
        }
        res.status(500).json({ error: `分析失敗: ${err.message}` });
    }
});

// GET /api/health
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Start server
app.listen(PORT, () => {
    const hasKey = !!process.env.GOOGLE_AI_API_KEY;
    console.log(`\n🎤 Gemini 語音對話助手已啟動`);
    console.log(`📡 伺服器運行在 http://localhost:${PORT}`);
    console.log(`🔑 API Key: ${hasKey ? '已設定 (環境變數)' : '未設定 (請在 UI 中輸入)'}`);
    console.log(`💡 免費取得 API Key: https://aistudio.google.com\n`);
});
