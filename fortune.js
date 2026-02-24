/**
 * 情姻緣測算 — Fortune.js
 * 八字命理 + 紫微斗數 + 易經卦象 + 姓名學 + Gemini AI 分析
 */

const API_BASE = window.location.origin;

// ===== Chinese Calendar Data =====
const TIANGAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const DIZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const SHENGXIAO = ['鼠', '牛', '虎', '兔', '龍', '蛇', '馬', '羊', '猴', '雞', '狗', '豬'];
const WUXING_TG = ['木', '木', '火', '火', '土', '土', '金', '金', '水', '水'];
const WUXING_DZ = ['水', '土', '木', '木', '土', '火', '火', '土', '金', '金', '土', '水'];
const SHICHEN_NAMES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

// 紫微主星
const ZIWEI_STARS = [
    '紫微', '天機', '太陽', '武曲', '天同', '廉貞',
    '天府', '太陰', '貪狼', '巨門', '天相', '天梁',
    '七殺', '破軍'
];

// 易經六十四卦
const YIJING_GUA = [
    { name: '乾', symbol: '☰☰', meaning: '天行健，君子以自強不息' },
    { name: '坤', symbol: '☷☷', meaning: '地勢坤，君子以厚德載物' },
    { name: '屯', symbol: '☵☳', meaning: '雷雨之動滿盈，宜建侯' },
    { name: '蒙', symbol: '☶☵', meaning: '蒙以養正，聖功也' },
    { name: '需', symbol: '☵☰', meaning: '需者，飲食之道也' },
    { name: '訟', symbol: '☰☵', meaning: '訟，有孚窒惕' },
    { name: '師', symbol: '☷☵', meaning: '師者，眾也' },
    { name: '比', symbol: '☵☷', meaning: '比，輔也' },
    { name: '小畜', symbol: '☴☰', meaning: '風行天上，蓄養' },
    { name: '履', symbol: '☰☱', meaning: '履虎尾，不咥人' },
    { name: '泰', symbol: '☷☰', meaning: '天地交泰，萬物通' },
    { name: '否', symbol: '☰☷', meaning: '天地不交，否' },
    { name: '同人', symbol: '☰☲', meaning: '同人於野，亨' },
    { name: '大有', symbol: '☲☰', meaning: '火在天上，大有' },
    { name: '謙', symbol: '☷☶', meaning: '謙亨，君子有終' },
    { name: '豫', symbol: '☳☷', meaning: '豫，利建侯行師' },
    { name: '隨', symbol: '☱☳', meaning: '隨，元亨利貞' },
    { name: '蠱', symbol: '☶☴', meaning: '蠱元亨，利涉大川' },
    { name: '臨', symbol: '☷☱', meaning: '臨，元亨利貞' },
    { name: '觀', symbol: '☴☷', meaning: '觀，盥而不荐' },
    { name: '噬嗑', symbol: '☲☳', meaning: '噬嗑，亨利用獄' },
    { name: '賁', symbol: '☶☲', meaning: '賁亨，柔來而文剛' },
    { name: '剝', symbol: '☶☷', meaning: '剝，不利有攸往' },
    { name: '復', symbol: '☷☳', meaning: '復亨，剛反' },
    { name: '無妄', symbol: '☰☳', meaning: '無妄，元亨利貞' },
    { name: '大畜', symbol: '☶☰', meaning: '大畜利貞' },
    { name: '頤', symbol: '☶☳', meaning: '頤，貞吉' },
    { name: '大過', symbol: '☱☴', meaning: '大過，棟橈' },
    { name: '坎', symbol: '☵☵', meaning: '習坎，有孚' },
    { name: '離', symbol: '☲☲', meaning: '離，利貞亨' },
    { name: '咸', symbol: '☱☶', meaning: '咸亨利貞，取女吉' },
    { name: '恆', symbol: '☳☴', meaning: '恆亨無咎，利貞' },
    { name: '遯', symbol: '☰☶', meaning: '遯亨，小利貞' },
    { name: '大壯', symbol: '☳☰', meaning: '大壯利貞' },
    { name: '晉', symbol: '☲☷', meaning: '晉，康侯用錫馬' },
    { name: '明夷', symbol: '☷☲', meaning: '明夷利艱貞' },
    { name: '家人', symbol: '☴☲', meaning: '家人利女貞' },
    { name: '睽', symbol: '☲☱', meaning: '睽小事吉' },
    { name: '蹇', symbol: '☵☶', meaning: '蹇利西南' },
    { name: '解', symbol: '☳☵', meaning: '解利西南' },
    { name: '損', symbol: '☶☱', meaning: '損有孚' },
    { name: '益', symbol: '☴☳', meaning: '益利有攸往' },
    { name: '夬', symbol: '☱☰', meaning: '夬揚于王庭' },
    { name: '姤', symbol: '☰☴', meaning: '姤，女壯' },
    { name: '萃', symbol: '☱☷', meaning: '萃亨' },
    { name: '升', symbol: '☷☴', meaning: '升元亨' },
    { name: '困', symbol: '☱☵', meaning: '困亨貞' },
    { name: '井', symbol: '☵☴', meaning: '井改邑不改井' },
    { name: '革', symbol: '☱☲', meaning: '革，已日乃孚' },
    { name: '鼎', symbol: '☲☴', meaning: '鼎元吉亨' },
    { name: '震', symbol: '☳☳', meaning: '震亨' },
    { name: '艮', symbol: '☶☶', meaning: '艮其背' },
    { name: '漸', symbol: '☴☶', meaning: '漸女歸吉' },
    { name: '歸妹', symbol: '☳☱', meaning: '歸妹征凶' },
    { name: '豐', symbol: '☳☲', meaning: '豐亨' },
    { name: '旅', symbol: '☲☶', meaning: '旅小亨' },
    { name: '巽', symbol: '☴☴', meaning: '巽小亨' },
    { name: '兌', symbol: '☱☱', meaning: '兌亨利貞' },
    { name: '渙', symbol: '☴☵', meaning: '渙亨' },
    { name: '節', symbol: '☵☱', meaning: '節亨' },
    { name: '中孚', symbol: '☴☱', meaning: '中孚豚魚吉' },
    { name: '小過', symbol: '☳☶', meaning: '小過亨利貞' },
    { name: '既濟', symbol: '☵☲', meaning: '既濟亨小' },
    { name: '未濟', symbol: '☲☵', meaning: '未濟亨' },
];

// ===== Calculation Functions =====

// 年柱
function getYearPillar(year) {
    const tgIdx = (year - 4) % 10;
    const dzIdx = (year - 4) % 12;
    return { tg: TIANGAN[tgIdx], dz: DIZHI[dzIdx], wuxing_tg: WUXING_TG[tgIdx], wuxing_dz: WUXING_DZ[dzIdx] };
}

// 月柱 (simplified)
function getMonthPillar(year, month) {
    const yearTgIdx = (year - 4) % 10;
    const monthTgBase = (yearTgIdx % 5) * 2;
    const tgIdx = (monthTgBase + month - 1) % 10;
    const dzIdx = (month + 1) % 12;
    return { tg: TIANGAN[tgIdx], dz: DIZHI[dzIdx], wuxing_tg: WUXING_TG[tgIdx], wuxing_dz: WUXING_DZ[dzIdx] };
}

// 日柱 (simplified calculation)
function getDayPillar(year, month, day) {
    const base = new Date(1900, 0, 1);
    const target = new Date(year, month - 1, day);
    const diff = Math.floor((target - base) / 86400000);
    const tgIdx = (diff + 10) % 10;
    const dzIdx = (diff + 12) % 12;
    return { tg: TIANGAN[tgIdx], dz: DIZHI[dzIdx], wuxing_tg: WUXING_TG[tgIdx], wuxing_dz: WUXING_DZ[dzIdx] };
}

// 時柱
function getHourPillar(dayTgIdx, hour) {
    const hourTgBase = (dayTgIdx % 5) * 2;
    const tgIdx = (hourTgBase + hour) % 10;
    return { tg: TIANGAN[tgIdx], dz: DIZHI[hour], wuxing_tg: WUXING_TG[tgIdx], wuxing_dz: WUXING_DZ[hour] };
}

// 完整八字
function getBazi(year, month, day, hour) {
    const yearP = getYearPillar(year);
    const monthP = getMonthPillar(year, month);
    const dayP = getDayPillar(year, month, day);
    const dayTgIdx = TIANGAN.indexOf(dayP.tg);
    const hourP = getHourPillar(dayTgIdx, hour);

    const pillars = [yearP, monthP, dayP, hourP];
    const wuxingCount = { '金': 0, '木': 0, '水': 0, '火': 0, '土': 0 };
    pillars.forEach(p => {
        wuxingCount[p.wuxing_tg]++;
        wuxingCount[p.wuxing_dz]++;
    });

    return {
        year: yearP, month: monthP, day: dayP, hour: hourP,
        text: `${yearP.tg}${yearP.dz} ${monthP.tg}${monthP.dz} ${dayP.tg}${dayP.dz} ${hourP.tg}${hourP.dz}`,
        wuxing: wuxingCount,
        riGan: dayP.tg,
    };
}

// 生肖
function getShengxiao(year) {
    return SHENGXIAO[(year - 4) % 12];
}

// 納音五行 (simplified)
function getNayin(year) {
    const nayinList = ['海中金', '爐中火', '大林木', '路旁土', '劍鋒金', '山頭火',
        '澗下水', '城頭土', '白蠟金', '楊柳木', '泉中水', '屋上土',
        '霹靂火', '松柏木', '長流水', '砂石金', '山下火', '平地木',
        '壁上土', '金箔金', '覆燈火', '天河水', '大驛土', '釵釧金',
        '桑柘木', '大溪水', '沙中土', '天上火', '石榴木', '大海水'];
    return nayinList[((year - 4) / 2 | 0) % 30];
}

// 紫微主星 (simplified)
function getZiweiStar(year, month, day, hour) {
    const seed = year * 31 + month * 17 + day * 13 + hour * 7;
    return ZIWEI_STARS[seed % ZIWEI_STARS.length];
}

// 紫微命宮
function getZiweiPalace(month, hour) {
    const palaceIdx = (12 + month - hour) % 12;
    return DIZHI[palaceIdx] + '宮';
}

// 易經占卦 (based on current moment + names)
function getYijingGua(nameA, nameB) {
    const now = new Date();
    const seed = now.getFullYear() + now.getMonth() * 31 + now.getDate() * 17 +
        now.getHours() * 13 + now.getMinutes() * 7 + now.getSeconds() * 3;
    const nameHash = (nameA + nameB).split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const idx = (seed + nameHash) % 64;
    return YIJING_GUA[idx];
}

// 生肖配對
function getShengxiaoCompat(animalA, animalB) {
    const sixHarmony = [['鼠', '牛'], ['虎', '豬'], ['兔', '狗'], ['龍', '雞'], ['蛇', '猴'], ['馬', '羊']];
    const sixClash = [['鼠', '馬'], ['牛', '羊'], ['虎', '猴'], ['兔', '雞'], ['龍', '狗'], ['蛇', '豬']];
    const threeHarmony = [['猴', '鼠', '龍'], ['虎', '馬', '狗'], ['蛇', '雞', '牛'], ['豬', '兔', '羊']];

    for (const pair of sixHarmony) {
        if (pair.includes(animalA) && pair.includes(animalB)) return { level: '六合', desc: '天作之合，緣分極深', score: 95 };
    }
    for (const trio of threeHarmony) {
        if (trio.includes(animalA) && trio.includes(animalB)) return { level: '三合', desc: '志同道合，感情穩固', score: 85 };
    }
    for (const pair of sixClash) {
        if (pair.includes(animalA) && pair.includes(animalB)) return { level: '六沖', desc: '性格差異大，需要磨合', score: 40 };
    }
    return { level: '普通', desc: '平淡中見真情', score: 65 };
}

// 五行相生相剋
function getWuxingRelation(wuxingA, wuxingB) {
    const sheng = { '木': '火', '火': '土', '土': '金', '金': '水', '水': '木' };
    const ke = { '木': '土', '土': '水', '水': '火', '火': '金', '金': '木' };

    const mainA = Object.entries(wuxingA).sort((a, b) => b[1] - a[1])[0][0];
    const mainB = Object.entries(wuxingB).sort((a, b) => b[1] - a[1])[0][0];

    if (sheng[mainA] === mainB || sheng[mainB] === mainA) {
        return { relation: '相生', mainA, mainB, desc: `${mainA}與${mainB}相生，互相扶持`, score: 90 };
    }
    if (ke[mainA] === mainB || ke[mainB] === mainA) {
        return { relation: '相剋', mainA, mainB, desc: `${mainA}與${mainB}相剋，需注意包容`, score: 45 };
    }
    if (mainA === mainB) {
        return { relation: '比和', mainA, mainB, desc: `同屬${mainA}，心意相通`, score: 75 };
    }
    return { relation: '中和', mainA, mainB, desc: `${mainA}與${mainB}，平穩相處`, score: 70 };
}

// ===== DOM & Events =====
const formSection = document.getElementById('formSection');
const resultsSection = document.getElementById('resultsSection');
const submitBtn = document.getElementById('submitBtn');
const btnLoading = document.getElementById('btnLoading');
const apiKeyInput = document.getElementById('apiKeyInput');
const saveKeyBtn = document.getElementById('saveKeyBtn');
const apiNotice = document.getElementById('apiNotice');
const speakBtn = document.getElementById('speakBtn');
const speakAllBtn = document.getElementById('speakAllBtn');
const backBtn = document.getElementById('backBtn');

let synth = window.speechSynthesis;
let fullAnalysisText = '';

// Load saved API key
const savedKey = localStorage.getItem('gemini_api_key');
if (savedKey) {
    apiKeyInput.value = savedKey;
}

// Gender toggle
document.querySelectorAll('.gender-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const person = btn.dataset.person;
        document.querySelectorAll(`.gender-btn[data-person="${person}"]`).forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('gender' + person).value = btn.dataset.gender;
    });
});

// Save API key
saveKeyBtn.addEventListener('click', () => {
    const key = apiKeyInput.value.trim();
    if (key) {
        localStorage.setItem('gemini_api_key', key);
        saveKeyBtn.textContent = '✓ 已儲存';
        setTimeout(() => { saveKeyBtn.textContent = '儲存'; }, 1500);
    }
});

// Back button
backBtn.addEventListener('click', () => {
    resultsSection.classList.add('hidden');
    formSection.classList.remove('hidden');
    synth.cancel();
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

// Submit
submitBtn.addEventListener('click', async () => {
    const nameA = document.getElementById('nameA').value.trim();
    const nameB = document.getElementById('nameB').value.trim();
    const birthdayA = document.getElementById('birthdayA').value;
    const birthdayB = document.getElementById('birthdayB').value;
    const timeA = document.getElementById('timeA').value;
    const timeB = document.getElementById('timeB').value;
    const genderA = document.getElementById('genderA').value;
    const genderB = document.getElementById('genderB').value;
    const isDisconnected = document.getElementById('isDisconnected').checked;

    // Validate
    if (!nameA || !nameB || !birthdayA || !birthdayB || timeA === '' || timeB === '') {
        showToast('請填寫所有欄位');
        return;
    }

    const apiKey = apiKeyInput.value.trim() || localStorage.getItem('gemini_api_key');
    if (!apiKey) {
        showToast('請先輸入 Google AI API Key');
        return;
    }

    // Parse dates
    const [yA, mA, dA] = birthdayA.split('-').map(Number);
    const [yB, mB, dB] = birthdayB.split('-').map(Number);
    const hourA = parseInt(timeA);
    const hourB = parseInt(timeB);

    // Calculate everything
    const baziA = getBazi(yA, mA, dA, hourA);
    const baziB = getBazi(yB, mB, dB, hourB);
    const animalA = getShengxiao(yA);
    const animalB = getShengxiao(yB);
    const nayinA = getNayin(yA);
    const nayinB = getNayin(yB);
    const ziweiStarA = getZiweiStar(yA, mA, dA, hourA);
    const ziweiStarB = getZiweiStar(yB, mB, dB, hourB);
    const ziweiPalaceA = getZiweiPalace(mA, hourA);
    const ziweiPalaceB = getZiweiPalace(mB, hourB);
    const yijing = getYijingGua(nameA, nameB);
    const animalCompat = getShengxiaoCompat(animalA, animalB);
    const wuxingRelation = getWuxingRelation(baziA.wuxing, baziB.wuxing);

    // Overall score
    const score = Math.round((animalCompat.score + wuxingRelation.score + 70) / 3);

    // Show loading
    submitBtn.disabled = true;
    document.querySelector('.btn-text').classList.add('hidden');
    btnLoading.classList.remove('hidden');

    // Build info for Gemini
    const fortuneData = {
        personA: { name: nameA, gender: genderA, birthday: birthdayA, shichen: SHICHEN_NAMES[hourA] + '時', bazi: baziA.text, riGan: baziA.riGan, shengxiao: animalA, nayin: nayinA, wuxing: baziA.wuxing, ziweiStar: ziweiStarA, ziweiPalace: ziweiPalaceA },
        personB: { name: nameB, gender: genderB, birthday: birthdayB, shichen: SHICHEN_NAMES[hourB] + '時', bazi: baziB.text, riGan: baziB.riGan, shengxiao: animalB, nayin: nayinB, wuxing: baziB.wuxing, ziweiStar: ziweiStarB, ziweiPalace: ziweiPalaceB },
        compatibility: { animalCompat, wuxingRelation, score },
        yijing: yijing,
        isDisconnected: isDisconnected,
    };

    try {
        const response = await fetch(`${API_BASE}/api/fortune`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-auth-token': localStorage.getItem('auth_token') || '',
            },
            body: JSON.stringify({ fortuneData, dynamicApiKey: apiKey }),
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || `HTTP ${response.status}`);
        }

        const data = await response.json();
        showResults(fortuneData, data.reply, score);
    } catch (err) {
        console.error('Fortune error:', err);
        showToast(err.message || '分析失敗，請稍後再試');
    } finally {
        submitBtn.disabled = false;
        document.querySelector('.btn-text').classList.remove('hidden');
        btnLoading.classList.add('hidden');
    }
});

// ===== Show Results =====
function showResults(data, analysis, score) {
    formSection.classList.add('hidden');
    resultsSection.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Couple names
    document.getElementById('coupleNames').textContent = `${data.personA.name} ❤ ${data.personB.name}`;

    // Score animation
    const scoreEl = document.getElementById('scoreNumber');
    const scorePath = document.getElementById('scorePath');
    const circumference = 2 * Math.PI * 52;

    // Add gradient definition
    const svg = scorePath.closest('svg');
    if (!svg.querySelector('#scoreGradient')) {
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        defs.innerHTML = `<linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#d4a853"/><stop offset="100%" style="stop-color:#c43a3a"/></linearGradient>`;
        svg.prepend(defs);
    }

    setTimeout(() => {
        const offset = circumference - (score / 100) * circumference;
        scorePath.style.strokeDashoffset = offset;
        animateNumber(scoreEl, 0, score, 1500);
    }, 300);

    // Info cards
    const cardsEl = document.getElementById('infoCards');
    const cards = [
        { icon: '🐲', title: '生肖配對', value: `${data.personA.shengxiao} · ${data.personB.shengxiao}`, sub: data.compatibility.animalCompat.level },
        { icon: '☯', title: '五行關係', value: `${data.compatibility.wuxingRelation.mainA} · ${data.compatibility.wuxingRelation.mainB}`, sub: data.compatibility.wuxingRelation.relation },
        { icon: '⭐', title: '紫微主星', value: `${data.personA.ziweiStar} · ${data.personB.ziweiStar}`, sub: `${data.personA.ziweiPalace}/${data.personB.ziweiPalace}` },
        { icon: '☰', title: '易經卦象', value: `${data.yijing.name}卦`, sub: data.yijing.symbol },
        { icon: '📜', title: '甲方八字', value: data.personA.bazi, sub: data.personA.nayin },
        { icon: '📜', title: '乙方八字', value: data.personB.bazi, sub: data.personB.nayin },
    ];

    cardsEl.innerHTML = cards.map((c, i) =>
        `<div class="info-card" style="animation-delay:${i * 0.1}s">
      <div class="card-icon">${c.icon}</div>
      <div class="card-title">${c.title}</div>
      <div class="card-value">${c.value}</div>
      <div class="card-sub">${c.sub}</div>
    </div>`
    ).join('');

    // Analysis
    document.getElementById('analysisBody').textContent = analysis;
    fullAnalysisText = analysis;

    // Reconnect section
    if (data.isDisconnected) {
        document.getElementById('reconnectCard').classList.remove('hidden');
        // Extract reconnect part if present
        const reconnectIdx = analysis.indexOf('斷聯');
        if (reconnectIdx > -1) {
            const reconnectText = analysis.substring(reconnectIdx);
            document.getElementById('reconnectBody').textContent = reconnectText;
        }
    }
}

function animateNumber(el, start, end, duration) {
    const range = end - start;
    const startTime = performance.now();
    function update(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.round(start + range * eased);
        if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
}

// ===== TTS =====
speakBtn.addEventListener('click', () => toggleSpeak());
speakAllBtn.addEventListener('click', () => toggleSpeak());

function toggleSpeak() {
    if (synth.speaking) {
        synth.cancel();
        speakBtn.classList.remove('speaking');
        return;
    }

    if (!fullAnalysisText) return;

    const cleanText = fullAnalysisText.replace(/[*_`#]/g, '').replace(/\n+/g, '。 ').trim();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'zh-TW';
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    const voices = synth.getVoices();
    const zhVoice = voices.find(v => v.lang.startsWith('zh'));
    if (zhVoice) utterance.voice = zhVoice;

    speakBtn.classList.add('speaking');
    utterance.onend = () => speakBtn.classList.remove('speaking');
    utterance.onerror = () => speakBtn.classList.remove('speaking');

    synth.speak(utterance);
}

// ===== Toast =====
function showToast(msg) {
    const existing = document.querySelector('.error-toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = 'error-toast';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Load voices
if (synth.onvoiceschanged !== undefined) {
    synth.onvoiceschanged = () => synth.getVoices();
}
