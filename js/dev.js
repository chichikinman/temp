// ==========================================
// 治安局端末 OS - 開発者MENUモジュール (js/dev.js)
// 数式設定・Tier動的追加・パラメータ調整・バックアップ
// ==========================================

function switchDevSubTab(subId) {
    ['econ','tier','arena','items','backup'].forEach(id => {
        document.getElementById(`dev-sub-${id}`).style.display = id === subId ? 'block' : 'none';
    });
    if (subId === 'tier') renderDevTierList();
    if (subId === 'items') renderDevItemList();
}

function renderDevMenu() {
    const cfg = state.sysConfig;
    document.getElementById('cfg-base-cps').value = cfg.base_cps;
    document.getElementById('cfg-base-mps').value = cfg.base_mps;

    document.getElementById('cfg-slum-c0').value = cfg.slum.C0;
    document.getElementById('cfg-slum-kcost').value = cfg.slum.K_cost;
    document.getElementById('cfg-slum-p0').value = cfg.slum.P0;
    document.getElementById('cfg-slum-kprod').value = cfg.slum.K_prod;
    document.getElementById('cfg-slum-baser').value = cfg.slum.baseR;
    document.getElementById('cfg-slum-thresh').value = cfg.slum.softcap_thresh;
    document.getElementById('cfg-slum-exp').value = cfg.slum.softcap_exp;

    document.getElementById('cfg-gov-c0').value = cfg.gov.C0;
    document.getElementById('cfg-gov-kcost').value = cfg.gov.K_cost;
    document.getElementById('cfg-gov-p0').value = cfg.gov.P0;
    document.getElementById('cfg-gov-kprod').value = cfg.gov.K_prod;
    document.getElementById('cfg-gov-baser').value = cfg.gov.baseR;
    document.getElementById('cfg-gov-infl').value = cfg.gov.inflation_rate;

    document.getElementById('cfg-synergy').value = cfg.synergy_rate_per_level;

    document.getElementById('cfg-arena-beta').value = cfg.arena.beta;
    document.getElementById('cfg-arena-h').value = cfg.arena.h;
    document.getElementById('cfg-arena-minodds').value = cfg.arena.minOdds;
    document.getElementById('cfg-arena-maxodds').value = cfg.arena.maxOdds;
    document.getElementById('cfg-arena-bribe').value = cfg.arena.bribeRate;
    document.getElementById('cfg-arena-rest').value = cfg.arena.restRecovery;

    renderDevTierList();
    renderDevItemList();
}

function saveEconConfig() {
    state.sysConfig.base_cps = parseFloat(document.getElementById('cfg-base-cps').value);
    state.sysConfig.base_mps = parseFloat(document.getElementById('cfg-base-mps').value);
    state.sysConfig.slum.C0 = parseFloat(document.getElementById('cfg-slum-c0').value);
    state.sysConfig.slum.K_cost = parseFloat(document.getElementById('cfg-slum-kcost').value);
    state.sysConfig.slum.P0 = parseFloat(document.getElementById('cfg-slum-p0').value);
    state.sysConfig.slum.K_prod = parseFloat(document.getElementById('cfg-slum-kprod').value);
    state.sysConfig.slum.baseR = parseFloat(document.getElementById('cfg-slum-baser').value);
    state.sysConfig.slum.softcap_thresh = parseFloat(document.getElementById('cfg-slum-thresh').value);
    state.sysConfig.slum.softcap_exp = parseFloat(document.getElementById('cfg-slum-exp').value);
    state.sysConfig.gov.C0 = parseFloat(document.getElementById('cfg-gov-c0').value);
    state.sysConfig.gov.K_cost = parseFloat(document.getElementById('cfg-gov-kcost').value);
    state.sysConfig.gov.P0 = parseFloat(document.getElementById('cfg-gov-p0').value);
    state.sysConfig.gov.K_prod = parseFloat(document.getElementById('cfg-gov-kprod').value);
    state.sysConfig.gov.baseR = parseFloat(document.getElementById('cfg-gov-baser').value);
    state.sysConfig.gov.inflation_rate = parseFloat(document.getElementById('cfg-gov-infl').value);
    state.sysConfig.synergy_rate_per_level = parseFloat(document.getElementById('cfg-synergy').value);

    saveData();
    renderMain();
    alert("経済パラメータを保存しました。");
}

function saveArenaConfig() {
    state.sysConfig.arena.beta = parseFloat(document.getElementById('cfg-arena-beta').value);
    state.sysConfig.arena.h = parseFloat(document.getElementById('cfg-arena-h').value);
    state.sysConfig.arena.minOdds = parseFloat(document.getElementById('cfg-arena-minodds').value);
    state.sysConfig.arena.maxOdds = parseFloat(document.getElementById('cfg-arena-maxodds').value);
    state.sysConfig.arena.bribeRate = parseFloat(document.getElementById('cfg-arena-bribe').value);
    state.sysConfig.arena.restRecovery = parseInt(document.getElementById('cfg-arena-rest').value, 10);

    saveData();
    alert("闘技場パラメータを保存しました。");
}

// Tier管理 (追加・削除・編集)
function renderDevTierList() {
    const slumEl = document.getElementById('dev-slum-tier-list');
    const govEl = document.getElementById('dev-gov-tier-list');
    if (!slumEl || !govEl) return;
    slumEl.innerHTML = '';
    govEl.innerHTML = '';

    state.facilityNames.slum.forEach((name, i) => {
        slumEl.innerHTML += `
            <div style="display:flex; gap:4px; margin-bottom:2px;">
                <span style="font-size:0.7rem; width:45px;">T${i}:</span>
                <input type="text" value="${name}" onchange="state.facilityNames.slum[${i}]=this.value; saveData();">
                <span style="color:var(--alert-red); cursor:pointer; font-size:0.7rem;" onclick="deleteTier('slum', ${i})">[削]</span>
            </div>
        `;
    });

    state.facilityNames.gov.forEach((name, i) => {
        govEl.innerHTML += `
            <div style="display:flex; gap:4px; margin-bottom:2px;">
                <span style="font-size:0.7rem; width:45px;">T${i}:</span>
                <input type="text" value="${name}" onchange="state.facilityNames.gov[${i}]=this.value; saveData();">
                <span style="color:var(--alert-red); cursor:pointer; font-size:0.7rem;" onclick="deleteTier('gov', ${i})">[削]</span>
            </div>
        `;
    });
}

function addNewTier(type) {
    const newTierIdx = state.facilityNames[type].length;
    const name = prompt(`新規 Tier ${newTierIdx} の名称を入力してください:`, `新拡張セクター #${newTierIdx}`);
    if (!name) return;

    state.facilityNames[type].push(name);
    state.facilityLevels[type].push(0);
    saveData();
    renderDevTierList();
    if (window.renderBiz) renderBiz();
    alert(`Tier ${newTierIdx}「${name}」を追加しました。`);
}

function deleteTier(type, idx) {
    if (state.facilityNames[type].length <= 1) return alert("最後のTierは削除できません。");
    if (confirm(`Tier ${idx}「${state.facilityNames[type][idx]}」を削除しますか？`)) {
        state.facilityNames[type].splice(idx, 1);
        state.facilityLevels[type].splice(idx, 1);
        saveData();
        renderDevTierList();
        if (window.renderBiz) renderBiz();
    }
}

// アイテム定義
function devRegisterItem() {
    const name = document.getElementById('dev-item-name').value.trim();
    const buy = parseFloat(document.getElementById('dev-item-buy').value);
    const sell = parseFloat(document.getElementById('dev-item-sell').value);
    const category = document.getElementById('dev-item-category').value;
    const target = document.getElementById('dev-item-target').value.trim();
    const amount = parseFloat(document.getElementById('dev-item-amount').value);

    if (!name || isNaN(buy) || isNaN(sell) || !target || isNaN(amount)) return alert("全項目を入力してください。");

    const newItem = { id: 'it_' + Date.now(), name, buy, sell, category, target, amount };
    state.items.push(newItem);
    saveData();
    renderDevItemList();
    alert(`アイテム「${name}」を登録しました。`);
}

function renderDevItemList() {
    const c = document.getElementById('dev-item-list');
    if (!c) return;
    c.innerHTML = '';
    state.items.forEach((it, idx) => {
        const div = document.createElement('div');
        div.style.fontSize = '0.7rem';
        div.style.display = 'flex';
        div.style.justifyContent = 'space-between';
        div.style.marginBottom = '2px';
        div.innerHTML = `
            <span>${it.name} [${it.category}] (${it.target}:${it.amount})</span>
            <span style="color:var(--alert-red); cursor:pointer;" onclick="deleteDevItem(${idx})">[削除]</span>
        `;
        c.appendChild(div);
    });
}

function deleteDevItem(idx) {
    state.items.splice(idx, 1);
    saveData();
    renderDevItemList();
}

// バックアップ
function exportData() {
    document.getElementById('dev-json-area').value = JSON.stringify(state, null, 2);
    alert("全セーブデータをJSON出力しました。");
}

function importData() {
    try {
        const parsed = JSON.parse(document.getElementById('dev-json-area').value);
        if (parsed && parsed.sysConfig) {
            state = parsed;
            saveData();
            renderMain();
            renderDevMenu();
            alert("全データを正常に復元しました！");
        }
    } catch(e) {
        alert("JSON解析エラー");
    }
}
