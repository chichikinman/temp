// ==========================================
// 治安局端末 OS - 放置経済モジュール (js/idle.js)
// スラム事業・治安局利権・Tier管理・生産計算
// ==========================================

let currentBizTab = 'slum';

function switchBizSubTab(type) {
    currentBizTab = type;
    document.getElementById('btn-biz-slum').classList.toggle('active', type === 'slum');
    document.getElementById('btn-biz-gov').classList.toggle('active', type === 'gov');
    renderBiz();
}

// --- 数式計算関数 (※マジックナンバー全廃) ---

// アップグレードコスト
function getUpgradeCost(tier, currentLevel, isGovernment) {
    const conf = isGovernment ? state.sysConfig.gov : state.sysConfig.slum;
    const baseCost = Math.floor(conf.C0 * Math.pow(conf.K_cost, tier));
    const r = isGovernment ? conf.baseR + (conf.inflation_rate * currentLevel) : conf.baseR;
    return Math.floor(baseCost * Math.pow(r, currentLevel));
}

// 施設単体の毎秒生産力
function getFacilityProduction(tier, level, counterpartLevel, isSlum) {
    if (level === 0) return 0;
    const conf = isSlum ? state.sysConfig.slum : state.sysConfig.gov;
    const baseProd = conf.P0 * Math.pow(conf.K_prod, tier);

    // 1. スラム搾取疲弊 (ソフトキャップ)
    let effLevel = level;
    if (isSlum && level > conf.softcap_thresh) {
        effLevel = conf.softcap_thresh + Math.pow(level - conf.softcap_thresh, conf.softcap_exp);
    }

    // 2. マイルストーン倍率
    let milestoneMult = 1.0;
    state.milestones.forEach(m => {
        if (level >= m.level) milestoneMult *= m.mult;
    });

    // 3. 相互ペアリングシナジー
    const synergy = 1.0 + (counterpartLevel * state.sysConfig.synergy_rate_per_level);

    return baseProd * effLevel * milestoneMult * synergy;
}

// 全施設の合算秒間生産力
function getTotalRates() {
    let cps = state.sysConfig.base_cps;
    let mps = state.sysConfig.base_mps;

    const maxTier = Math.max(state.facilityNames.slum.length, state.facilityNames.gov.length);
    for (let i = 0; i < maxTier; i++) {
        const slumL = state.facilityLevels.slum[i] || 0;
        const govL  = state.facilityLevels.gov[i] || 0;
        cps += getFacilityProduction(i, slumL, govL, true);
        mps += getFacilityProduction(i, govL, slumL, false);
    }
    return { cps, mps };
}

// --- 画面描画 (Tierアンロック表示) ---
function renderBiz() {
    const list = document.getElementById('biz-list');
    const desc = document.getElementById('biz-sub-desc');
    if (!list) return;
    list.innerHTML = '';

    const isSlum = currentBizTab === 'slum';
    desc.textContent = isSlum 
        ? "【スラム事業】横領物資を投資し、裏金(CR/秒)を吸い上げます。"
        : "【治安局利権】裏金をばら撒き、毎秒の横領物資枠(MPS)を拡大します。";

    const names = isSlum ? state.facilityNames.slum : state.facilityNames.gov;
    const myLevels = isSlum ? state.facilityLevels.slum : state.facilityLevels.gov;
    const counterLevels = isSlum ? state.facilityLevels.gov : state.facilityLevels.slum;
    const costUnit = isSlum ? "ロット(物資)" : "CR(裏金)";
    const prodUnit = isSlum ? "CR/秒" : "MPS/秒";

    names.forEach((name, tier) => {
        // 【Tier段階アンロック判定】: Tier 0は常時表示。Tier Nは直前Tier N-1のLv >= 1で表示
        if (tier > 0) {
            const prevLevel = myLevels[tier - 1] || 0;
            if (prevLevel < 1) return;
        }

        const level = myLevels[tier] || 0;
        const counterL = counterLevels[tier] || 0;
        const cost = getUpgradeCost(tier, level, !isSlum);
        const currentProd = getFacilityProduction(tier, level, counterL, isSlum);
        const nextProd = getFacilityProduction(tier, level + 1, counterL, isSlum);

        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div class="card-header">
                <span>Tier ${tier}: ${name}</span>
                <span style="color:#fff;">Lv ${level}</span>
            </div>
            <div style="font-size:0.7rem; color:#88cc99;">
                現在: +${currentProd.toFixed(2)} ${prodUnit} (次Lvで +${(nextProd - currentProd).toFixed(2)})
            </div>
            <div style="font-size:0.68rem; color:var(--dim-green);">
                相手Tier ${tier} Lv: ${counterL} (シナジー: +${(counterL * state.sysConfig.synergy_rate_per_level * 100).toFixed(0)}%)
            </div>
            <button class="btn" onclick="buyFacility(${tier}, ${isSlum})">
                レベルアップ [費用: ${cost} ${costUnit}]
            </button>
        `;
        list.appendChild(card);
    });
}

// 施設購入処理
function buyFacility(tier, isSlum) {
    const isGov = !isSlum;
    const currentLevel = isSlum ? (state.facilityLevels.slum[tier] || 0) : (state.facilityLevels.gov[tier] || 0);
    const cost = getUpgradeCost(tier, currentLevel, isGov);

    if (isSlum) {
        if (state.supply >= cost) {
            state.supply -= cost;
            state.facilityLevels.slum[tier] = currentLevel + 1;
            addLog(`スラム事業拡張: ${state.facilityNames.slum[tier]} Lv.${currentLevel + 1}`);
        } else {
            return alert("横領物資が不足しています。");
        }
    } else {
        if (state.money >= cost) {
            state.money -= cost;
            state.facilityLevels.gov[tier] = currentLevel + 1;
            addLog(`治安局利権買収: ${state.facilityNames.gov[tier]} Lv.${currentLevel + 1}`);
        } else {
            return alert("裏金(クレジット)が不足しています。");
        }
    }
    saveData();
    renderMain();
    renderBiz();
}
