
// ==========================================
// 治安局端末 OS - コアモジュール (js/core.js)
// 共通データ定義、状態管理、ゲームループ
// ==========================================

// --- 初期設定マスター (数式定数はここに集約) ---
const DEFAULT_CONFIG = {
    base_cps: 0.1,
    base_mps: 0.05,
    slum: { C0: 4, K_cost: 7.0, P0: 0.1, K_prod: 5.5, baseR: 1.15, softcap_thresh: 100, softcap_exp: 0.85 },
    gov:  { C0: 15, K_cost: 6.5, P0: 0.05, K_prod: 5.2, baseR: 1.15, inflation_rate: 0.001 },
    synergy_rate_per_level: 0.02,
    arena: {
        beta: 1.35,
        h: 0.08,
        minOdds: 1.05,
        maxOdds: 30.0,
        bribeRate: 0.10, // 罠使用時の利益1割控除
        restRecovery: 15
    }
};

const DEFAULT_MILESTONES = [
    { level: 10, mult: 2.0 }, { level: 25, mult: 2.0 }, { level: 50, mult: 2.5 },
    { level: 100, mult: 4.0 }, { level: 200, mult: 5.0 }
];

const DEFAULT_FACILITIES = {
    slum: [
        "手製ろ過器の貸与", "配給横流し露店", "廃ドラム缶の密造酒場",
        "違法ガラクタ修理工房", "地下サイコロ賭場", "粗悪ケミカルラボ"
    ],
    gov: [
        "巡回ルートの担当変更", "倉庫管理係への付届", "廃棄物資の偽装廃棄許可",
        "副巡回長のポスト買収", "配給監査ログの改ざん枠", "査察船燃料の抜き取り枠"
    ]
};

const INITIAL_FIGHTERS = [
    {
        id: "f_01", name: "アレクセイ・カイン", title: "錆びついた元王者", gender: "male", bodyType: "cyborg_part",
        baseStats: { hp: 200, patk: 100, pdef: 100, matk: 100, mdef: 100, spd: 100 },
        partDurability: { head: 100, body: 100, arms: 100, legs: 100 },
        recentResults: [1, 0, 1, 0, 1], equip: null
    },
    {
        id: "f_02", name: "ゴライアス", title: "廃棄区画の巨獣", gender: "male", bodyType: "flesh",
        baseStats: { hp: 320, patk: 150, pdef: 140, matk: 30, mdef: 40, spd: 60 },
        partDurability: { head: 100, body: 100, arms: 100, legs: 100 },
        recentResults: [1, 1, 1, 1, 0], equip: null
    },
    {
        id: "f_03", name: "Dr. ジル", title: "走る実験体", gender: "male", bodyType: "cyborg_part",
        baseStats: { hp: 140, patk: 50, pdef: 40, matk: 160, mdef: 130, spd: 120 },
        partDurability: { head: 100, body: 100, arms: 100, legs: 100 },
        recentResults: [0, 1, 0, 1, 0], equip: null
    },
    {
        id: "f_04", name: "レン", title: "残影の逃亡忍", gender: "female", bodyType: "flesh",
        baseStats: { hp: 160, patk: 130, pdef: 120, matk: 40, mdef: 50, spd: 140 },
        partDurability: { head: 100, body: 100, arms: 100, legs: 100 },
        recentResults: [1, 1, 0, 1, 1], equip: null
    },
    {
        id: "f_05", name: "セラフィム", title: "殺戮のメイドユニット", gender: "female", bodyType: "cyborg_full",
        baseStats: { hp: 260, patk: 40, pdef: 60, matk: 150, mdef: 140, spd: 90 },
        partDurability: { head: 100, body: 100, arms: 100, legs: 100 },
        recentResults: [0, 0, 1, 1, 0], equip: null
    }
];

const DEFAULT_ITEMS = [
    { id: "it_ration", name: "合成レーション「脂身風味」", buy: 15, sell: 5, category: "need", target: "食欲", amount: 60 },
    { id: "it_hack_tool", name: "闇暗号化スクリプト", buy: 50, sell: 15, category: "player_stat", target: "cheatSkill", amount: 5 },
    { id: "it_drug_patk", name: "工業用筋肥大ペプチド", buy: 60, sell: 20, category: "drug_stat", target: "patk", amount: 15 },
    { id: "it_drug_pdef_down", name: "カルシウム溶解酸シロップ", buy: 40, sell: 12, category: "drug_stat", target: "pdef", amount: -15 },
    { id: "it_part_heal_arm", name: "アクチュエータ冷却グリス", buy: 40, sell: 10, category: "drug_part", target: "arms", amount: 25 },
    { id: "it_eq_blade", name: "超振動ブレード義手", buy: 100, sell: 30, category: "equip", target: "patk", amount: 25 },
    { id: "it_eq_fake_ballast", name: "偽装用鈍重バラスト", buy: 50, sell: 15, category: "equip", target: "spd", amount: -25 },
    { id: "it_trap_emp", name: "広帯域ミリ波EMPディスラプター", buy: 80, sell: 25, category: "trap", target: "matk", amount: 30 }
];

const NEED_KEYS = ["食欲", "性欲", "睡眠欲", "娯楽欲", "攻撃欲"];

// --- プレイヤー状態（State） ---
let state = {
    money: parseFloat(localStorage.getItem('gov_money')) || 0.0,
    supply: parseFloat(localStorage.getItem('gov_supply')) || 0.0,
    cheatSkill: parseInt(localStorage.getItem('gov_cheat_skill'), 10) || 10,
    needs: JSON.parse(localStorage.getItem('gov_needs')) || { "食欲":100, "性欲":100, "睡眠欲":100, "娯楽欲":100, "攻撃欲":100 },
    facilityLevels: JSON.parse(localStorage.getItem('gov_fac_levels')) || { slum: [0,0,0,0,0,0], gov: [0,0,0,0,0,0] },
    facilityNames: JSON.parse(localStorage.getItem('gov_fac_names')) || DEFAULT_FACILITIES,
    sysConfig: JSON.parse(localStorage.getItem('gov_sys_config')) || DEFAULT_CONFIG,
    milestones: JSON.parse(localStorage.getItem('gov_milestones')) || DEFAULT_MILESTONES,
    items: JSON.parse(localStorage.getItem('gov_items')) || DEFAULT_ITEMS,
    inventory: JSON.parse(localStorage.getItem('gov_inventory')) || {},
    fighters: JSON.parse(localStorage.getItem('gov_fighters')) || INITIAL_FIGHTERS,
    currentMatch: JSON.parse(localStorage.getItem('gov_match')) || null
};

// --- セーブ関数 ---
function saveData() {
    localStorage.setItem('gov_money', state.money);
    localStorage.setItem('gov_supply', state.supply);
    localStorage.setItem('gov_cheat_skill', state.cheatSkill);
    localStorage.setItem('gov_needs', JSON.stringify(state.needs));
    localStorage.setItem('gov_fac_levels', JSON.stringify(state.facilityLevels));
    localStorage.setItem('gov_fac_names', JSON.stringify(state.facilityNames));
    localStorage.setItem('gov_sys_config', JSON.stringify(state.sysConfig));
    localStorage.setItem('gov_milestones', JSON.stringify(state.milestones));
    localStorage.setItem('gov_items', JSON.stringify(state.items));
    localStorage.setItem('gov_inventory', JSON.stringify(state.inventory));
    localStorage.setItem('gov_fighters', JSON.stringify(state.fighters));
    localStorage.setItem('gov_match', JSON.stringify(state.currentMatch));
}

// --- ログ記録 ---
function addLog(text) {
    const logEl = document.getElementById('log-content');
    if (!logEl) return;
    const time = new Date().toLocaleTimeString('ja-JP', { hour12: false });
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.textContent = `[${time}] ${text}`;
    logEl.prepend(entry);
}

// --- メインタブ切り替え ---
function switchTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    event.target.classList.add('active');
    document.getElementById(`tab-${tabId}`).classList.add('active');

    if (tabId === 'biz' && window.renderBiz) renderBiz();
    if (tabId === 'arena' && window.renderArenaTop) renderArenaTop();
    if (tabId === 'shop' && window.renderShop) renderShop();
    if (tabId === 'inventory' && window.renderInventory) renderInventory();
    if (tabId === 'dev' && window.renderDevMenu) renderDevMenu();
}

// --- メイン画面描画 ---
function renderMain() {
    const rates = window.getTotalRates ? getTotalRates() : { cps: state.sysConfig.base_cps, mps: state.sysConfig.base_mps };
    document.getElementById('money-display').textContent = state.money.toFixed(1);
    document.getElementById('supply-display').textContent = state.supply.toFixed(1);
    document.getElementById('cps-display').textContent = `+${rates.cps.toFixed(2)} CR/秒`;
    document.getElementById('mps-display').textContent = `+${rates.mps.toFixed(2)} MPS/秒`;
    document.getElementById('cheat-skill-display').textContent = state.cheatSkill;

    const container = document.getElementById('needs-container');
    container.innerHTML = '';
    NEED_KEYS.forEach(key => {
        const val = state.needs[key];
        const pct = Math.min(100, (val / 1000) * 100);
        const row = document.createElement('div');
        row.style.marginBottom = '4px';
        row.innerHTML = `
            <div style="display:flex; justify-content:space-between; font-size:0.7rem;">
                <span>${key}</span><span>${val}/1000</span>
            </div>
            <div style="background:#000; border:1px solid var(--dim-green); height:6px;">
                <div style="background:var(--main-green); width:${pct}%; height:100%;"></div>
            </div>
        `;
        container.appendChild(row);
    });
}

// --- 固定ゲームループ (厳密に1秒固定) ---
let secElapsed = 0;
setInterval(() => {
    const rates = window.getTotalRates ? getTotalRates() : { cps: state.sysConfig.base_cps, mps: state.sysConfig.base_mps };
    state.money += rates.cps;
    state.supply += rates.mps;

    secElapsed += 1;
    if (secElapsed >= 60) {
        secElapsed = 0;
        const activeNeeds = NEED_KEYS.filter(k => state.needs[k] > 0);
        if (activeNeeds.length > 0) {
            const pick = activeNeeds[Math.floor(Math.random() * activeNeeds.length)];
            state.needs[pick] -= 1;
            addLog(`時間経過により、査察員の【${pick}】が減退 (-1)`);
        }
    }

    renderMain();
    saveData();
}, 1000);

// 画面読み込み完了時
window.addEventListener('DOMContentLoaded', () => {
    addLog("端末 OS 接続完了。共通コアモジュールが正常起動しました。");
    renderMain();
});
