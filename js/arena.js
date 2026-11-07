// ==========================================
// 治安局端末 OS - 地下闘技場モジュール (js/arena.js)
// オッズ計算・控室カルテ・リアルタイムバトル・目押しチート
// ==========================================

// --- オッズ計算 (公称基礎値と直近勝率のみ参照) ---
function calculateOdds(fighterA, fighterB) {
    const calcRating = (f) => {
        const b = f.baseStats;
        const baseTotal = (b.hp * 0.5) + b.patk + b.pdef + b.matk + b.mdef + b.spd;
        const wins = f.recentResults.reduce((a, c) => a + c, 0);
        const winRate = f.recentResults.length > 0 ? (wins / f.recentResults.length) : 0.5;
        return baseTotal * (0.5 + winRate);
    };

    const rA = calcRating(fighterA);
    const rB = calcRating(fighterB);
    const beta = state.sysConfig.arena.beta;
    const h = state.sysConfig.arena.h;

    const pA = Math.pow(rA, beta) / (Math.pow(rA, beta) + Math.pow(rB, beta));
    const pB = 1.0 - pA;

    const clamp = (val, min, max) => Math.max(min, Math.min(max, val));
    const oddsA = clamp((1.0 - h) / pA, state.sysConfig.arena.minOdds, state.sysConfig.arena.maxOdds);
    const oddsB = clamp((1.0 - h) / pB, state.sysConfig.arena.minOdds, state.sysConfig.arena.maxOdds);

    return { oddsA: parseFloat(oddsA.toFixed(2)), oddsB: parseFloat(oddsB.toFixed(2)) };
}

function ensureCurrentMatch() {
    if (!state.currentMatch) {
        rollNextMatch();
    }
}

function rollNextMatch() {
    const idxA = Math.floor(Math.random() * state.fighters.length);
    let idxB = Math.floor(Math.random() * (state.fighters.length - 1));
    if (idxB >= idxA) idxB++;

    state.currentMatch = {
        fighterAId: state.fighters[idxA].id,
        fighterBId: state.fighters[idxB].id,
        installedTrapId: null,
        betTargetId: null,
        betAmount: 0
    };
    saveData();
}

// 闘技場トップ画面
function renderArenaTop() {
    ensureCurrentMatch();
    showArenaView('top');

    const fA = state.fighters.find(f => f.id === state.currentMatch.fighterAId);
    const fB = state.fighters.find(f => f.id === state.currentMatch.fighterBId);
    const odds = calculateOdds(fA, fB);

    const container = document.getElementById('arena-match-preview');
    if (!container) return;
    container.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
            <div style="flex:1;">
                <div style="font-weight:bold; color:#fff;">[RED] ${fA.name}</div>
                <div style="font-size:0.68rem; color:#aaa;">${fA.title} (${fA.bodyType})</div>
                <div style="font-size:0.85rem; color:var(--accent-gold); font-weight:bold;">オッズ: ${odds.oddsA}x</div>
            </div>
            <div style="font-size:1.1rem; color:var(--alert-red); font-weight:bold; padding:0 8px;">VS</div>
            <div style="flex:1; text-align:right;">
                <div style="font-weight:bold; color:#fff;">[BLUE] ${fB.name}</div>
                <div style="font-size:0.68rem; color:#aaa;">${fB.title} (${fB.bodyType})</div>
                <div style="font-size:0.85rem; color:var(--accent-gold); font-weight:bold;">オッズ: ${odds.oddsB}x</div>
            </div>
        </div>
    `;
}

function showArenaView(viewName) {
    document.getElementById('arena-view-top').style.display = viewName === 'top' ? 'block' : 'none';
    document.getElementById('arena-view-fighters').style.display = viewName === 'fighters' ? 'block' : 'none';
    document.getElementById('arena-view-fighter-detail').style.display = viewName === 'detail' ? 'block' : 'none';
    document.getElementById('arena-view-bet').style.display = viewName === 'bet' ? 'block' : 'none';
    document.getElementById('arena-view-battle').style.display = viewName === 'battle' ? 'block' : 'none';
}

function backToArenaTop() {
    renderArenaTop();
}

// ファイター控室一覧
function openFightersList() {
    showArenaView('fighters');
    const list = document.getElementById('arena-fighters-list');
    list.innerHTML = '';

    state.fighters.forEach(f => {
        const wins = f.recentResults.reduce((a, c) => a + c, 0);
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div class="card-header">
                <span>${f.name} <span style="font-size:0.7rem; color:#aaa;">(${f.gender}/${f.bodyType})</span></span>
                <span style="color:var(--accent-gold);">直近:${wins}/5勝</span>
            </div>
            <div style="font-size:0.7rem; color:#88cc99;">二つ名: ${f.title}</div>
            <div style="font-size:0.68rem; color:#aaa;">HP:${f.baseStats.hp} ATK:${f.baseStats.patk} DEF:${f.baseStats.pdef} SPD:${f.baseStats.spd}</div>
            <button class="btn" onclick="openFighterDetail('${f.id}')">カルテ閲覧・不正投与</button>
        `;
        list.appendChild(card);
    });
}

// ファイターカルテ (薬物・装備供与)
function openFighterDetail(fighterId) {
    showArenaView('detail');
    const f = state.fighters.find(x => x.id === fighterId);
    const content = document.getElementById('fighter-detail-content');

    content.innerHTML = `
        <div class="panel-box">
            <div style="font-size:0.85rem; font-weight:bold; color:#fff;">${f.name} 【${f.title}】</div>
            <div style="font-size:0.7rem; color:#88cc99;">属性: ${f.gender} / ${f.bodyType}</div>

            <div style="margin:6px 0; font-size:0.72rem;">
                <div>■ 基礎ステータス (公称・オッズ算出元):</div>
                <div style="color:#aaa;">HP:${f.baseStats.hp} / PATK:${f.baseStats.patk} / PDEF:${f.baseStats.pdef}</div>
                <div style="color:#aaa;">MATK:${f.baseStats.matk} / MDEF:${f.baseStats.mdef} / SPD:${f.baseStats.spd}</div>
            </div>

            <div style="margin:6px 0; font-size:0.72rem;">
                <div>■ 部位耐久力 (0〜100、戦闘で損耗):</div>
                <div>頭部:${f.partDurability.head} / 胴部:${f.partDurability.body} / 腕部:${f.partDurability.arms} / 足部:${f.partDurability.legs}</div>
            </div>

            <div style="margin:6px 0; font-size:0.72rem;">
                <div>■ 現在装備 (実効値のみ反映・オッズ不変):</div>
                <div style="color:var(--accent-gold);">${f.equip ? f.equip.name : "なし"}</div>
            </div>

            <hr style="border-color:var(--border-color); margin:8px 0;">

            <div style="font-size:0.72rem; color:var(--accent-purple);">▼ 薬物投与 (基礎値・部位増減 / 使い捨て)</div>
            <select id="detail-drug-select"><option value="">-- 手持ちの薬物を選択 --</option></select>
            <button class="btn btn-purple" onclick="applyDrugToFighter('${f.id}')">薬物を投与する</button>

            <div style="font-size:0.72rem; color:var(--accent-gold); margin-top:10px;">▼ 装備供与 (実効値のみ / 使い捨て・返却不可)</div>
            <select id="detail-equip-select"><option value="">-- 手持ちの装備を選択 --</option></select>
            <button class="btn btn-gold" onclick="applyEquipToFighter('${f.id}')">装備を換装・供与する</button>
        </div>
    `;

    const drugSelect = document.getElementById('detail-drug-select');
    const equipSelect = document.getElementById('detail-equip-select');

    Object.keys(state.inventory).forEach(itemId => {
        if (state.inventory[itemId] > 0) {
            const it = state.items.find(i => i.id === itemId);
            if (it && (it.category === 'drug_stat' || it.category === 'drug_part')) {
                drugSelect.innerHTML += `<option value="${it.id}">${it.name} (所持:${state.inventory[itemId]})</option>`;
            }
            if (it && it.category === 'equip') {
                equipSelect.innerHTML += `<option value="${it.id}">${it.name} (所持:${state.inventory[itemId]})</option>`;
            }
        }
    });
}

function applyDrugToFighter(fighterId) {
    const drugId = document.getElementById('detail-drug-select').value;
    if (!drugId) return alert("投与する薬物を選択してください。");
    const item = state.items.find(i => i.id === drugId);
    const fighter = state.fighters.find(f => f.id === fighterId);

    if (item.category === 'drug_stat') {
        fighter.baseStats[item.target] = Math.max(1, fighter.baseStats[item.target] + item.amount);
        addLog(`薬物投与: ${fighter.name} の基礎${item.target}が ${item.amount > 0 ? '+' : ''}${item.amount}`);
    } else if (item.category === 'drug_part') {
        fighter.partDurability[item.target] = Math.max(0, Math.min(100, fighter.partDurability[item.target] + item.amount));
        addLog(`薬物投与: ${fighter.name} の部位[${item.target}]が ${item.amount > 0 ? '+' : ''}${item.amount}`);
    }

    state.inventory[drugId] -= 1;
    saveData();
    openFighterDetail(fighterId);
}

function applyEquipToFighter(fighterId) {
    const equipId = document.getElementById('detail-equip-select').value;
    if (!equipId) return alert("供与する装備を選択してください。");
    const item = state.items.find(i => i.id === equipId);
    const fighter = state.fighters.find(f => f.id === fighterId);

    fighter.equip = { id: item.id, name: item.name, target: item.target, amount: item.amount };
    state.inventory[equipId] -= 1;

    addLog(`装備供与: ${fighter.name} に「${item.name}」を装着させました（オッズ不変）。`);
    saveData();
    openFighterDetail(fighterId);
}

// 賭け・罠セット画面
function openBettingView() {
    showArenaView('bet');
    const fA = state.fighters.find(f => f.id === state.currentMatch.fighterAId);
    const fB = state.fighters.find(f => f.id === state.currentMatch.fighterBId);
    const odds = calculateOdds(fA, fB);

    document.getElementById('bet-fighters-info').innerHTML = `
        <div style="font-size:0.75rem;">
            <div>[RED] ${fA.name} (オッズ: <span style="color:var(--accent-gold);">${odds.oddsA}x</span>)</div>
            <div>[BLUE] ${fB.name} (オッズ: <span style="color:var(--accent-gold);">${odds.oddsB}x</span>)</div>
        </div>
    `;

    const targetSelect = document.getElementById('bet-target-select');
    targetSelect.innerHTML = `
        <option value="${fA.id}">${fA.name} (${odds.oddsA}x)</option>
        <option value="${fB.id}">${fB.name} (${odds.oddsB}x)</option>
    `;

    const trapSelect = document.getElementById('trap-select');
    trapSelect.innerHTML = `<option value="">-- セットなし --</option>`;
    Object.keys(state.inventory).forEach(itemId => {
        if (state.inventory[itemId] > 0) {
            const it = state.items.find(i => i.id === itemId);
            if (it && it.category === 'trap') {
                trapSelect.innerHTML += `<option value="${it.id}">${it.name} (所持:${state.inventory[itemId]})</option>`;
            }
        }
    });
}

// リアルタイムバトル進行
let battleState = null;

function startArenaBattle() {
    const betTargetId = document.getElementById('bet-target-select').value;
    const betAmount = parseFloat(document.getElementById('bet-amount-input').value);
    const trapId = document.getElementById('trap-select').value;

    if (isNaN(betAmount) || betAmount <= 0) return alert("正しい賭け金を入力してください。");
    if (state.money < betAmount) return alert("裏金クレジットが不足しています。");

    state.money -= betAmount;
    if (trapId) {
        state.inventory[trapId] -= 1;
    }

    state.currentMatch.betTargetId = betTargetId;
    state.currentMatch.betAmount = betAmount;
    state.currentMatch.installedTrapId = trapId || null;

    const fA = state.fighters.find(f => f.id === state.currentMatch.fighterAId);
    const fB = state.fighters.find(f => f.id === state.currentMatch.fighterBId);
    const odds = calculateOdds(fA, fB);
    state.currentMatch.oddsA = odds.oddsA;
    state.currentMatch.oddsB = odds.oddsB;

    saveData();
    renderMain();
    initBattleRun(fA, fB);
}

function initBattleRun(fA, fB) {
    showArenaView('battle');
    document.getElementById('battle-result-box').style.display = 'none';
    document.getElementById('battle-log-content').innerHTML = '';

    const getEff = (f, statKey) => {
        let base = f.baseStats[statKey];
        let partMult = 1.0;
        if (statKey === 'patk') partMult = 0.2 + (0.8 * (f.partDurability.arms / 100));
        if (statKey === 'pdef') partMult = 0.2 + (0.8 * (f.partDurability.body / 100));
        if (statKey === 'matk') partMult = 0.2 + (0.8 * (f.partDurability.head / 100));
        if (statKey === 'mdef') partMult = 0.2 + (0.8 * (f.partDurability.body / 100));
        if (statKey === 'spd')  partMult = 0.2 + (0.8 * (f.partDurability.legs / 100));

        let val = Math.floor(base * partMult);
        if (f.equip && f.equip.target === statKey) val += f.equip.amount;
        return Math.max(1, val);
    };

    battleState = {
        fA: {
            ref: fA, name: fA.name, maxHp: fA.baseStats.hp, currentHp: fA.baseStats.hp,
            atb: 0, spd: getEff(fA, 'spd'), patk: getEff(fA, 'patk'), pdef: getEff(fA, 'pdef'),
            matk: getEff(fA, 'matk'), mdef: getEff(fA, 'mdef'), isStunnedSec: 0
        },
        fB: {
            ref: fB, name: fB.name, maxHp: fB.baseStats.hp, currentHp: fB.baseStats.hp,
            atb: 0, spd: getEff(fB, 'spd'), patk: getEff(fB, 'patk'), pdef: getEff(fB, 'pdef'),
            matk: getEff(fB, 'matk'), mdef: getEff(fB, 'mdef'), isStunnedSec: 0
        },
        isPaused: false,
        trapUsed: false,
        timer: 0,
        intervalId: null
    };

    document.getElementById('comb-a-name').textContent = fA.name;
    document.getElementById('comb-b-name').textContent = fB.name;
    document.getElementById('btn-trigger-trap').disabled = !state.currentMatch.installedTrapId;

    addBattleLog(`DEATHMATCH 開戦: ${fA.name} VS ${fB.name}`);
    battleState.intervalId = setInterval(battleTick, 50);
}

function addBattleLog(text) {
    const box = document.getElementById('battle-log-content');
    if (!box) return;
    const d = document.createElement('div');
    d.className = 'log-entry';
    d.textContent = `>${text}`;
    box.prepend(d);
}

function battleTick() {
    if (!battleState || battleState.isPaused) return;

    battleState.timer += 0.05;
    document.getElementById('battle-timer').textContent = battleState.timer.toFixed(1) + 's';

    ['fA', 'fB'].forEach(key => {
        const c = battleState[key];
        if (c.isStunnedSec > 0) {
            c.isStunnedSec -= 0.05;
        } else {
            c.atb += (c.spd / 100) * 1.5;
            if (c.atb >= 100) {
                c.atb = 0;
                executeAttack(key, key === 'fA' ? 'fB' : 'fA');
            }
        }
    });

    updateBattleUI();

    if (battleState.fA.currentHp <= 0 || battleState.fB.currentHp <= 0) {
        endBattle();
    }
}

function updateBattleUI() {
    const a = battleState.fA;
    const b = battleState.fB;

    document.getElementById('comb-a-hp-num').textContent = `${Math.max(0, Math.floor(a.currentHp))}/${a.maxHp}`;
    document.getElementById('comb-b-hp-num').textContent = `${Math.max(0, Math.floor(b.currentHp))}/${b.maxHp}`;

    document.getElementById('comb-a-hp-bar').style.width = `${Math.max(0, (a.currentHp / a.maxHp) * 100)}%`;
    document.getElementById('comb-b-hp-bar').style.width = `${Math.max(0, (b.currentHp / b.maxHp) * 100)}%`;

    document.getElementById('comb-a-atb-bar').style.width = `${Math.min(100, a.atb)}%`;
    document.getElementById('comb-b-atb-bar').style.width = `${Math.min(100, b.atb)}%`;
}

function executeAttack(attackerKey, defenderKey) {
    const atker = battleState[attackerKey];
    const def = battleState[defenderKey];

    const physDmg = Math.max(5, atker.patk - (def.pdef * 0.8 + def.mdef * 0.2));
    const magDmg  = Math.max(5, atker.matk - (def.mdef * 0.8 + def.pdef * 0.2));
    const baseDmg = Math.max(physDmg, magDmg);

    const rand = 0.9 + Math.random() * 0.2;
    const finalDmg = Math.floor(baseDmg * rand);

    def.currentHp -= finalDmg;
    addBattleLog(`${atker.name} の強打！ ${def.name} に ${finalDmg} 被弾`);

    if (Math.random() < 0.25) {
        const parts = ['head', 'body', 'arms', 'legs'];
        const targetPart = parts[Math.floor(Math.random() * parts.length)];
        def.ref.partDurability[targetPart] = Math.max(0, def.ref.partDurability[targetPart] - 3);
        addBattleLog(`>> [CRITICAL] ${def.name} の部位[${targetPart}]が損傷 (-3)`);
    }
}

function triggerInstalledTrap() {
    if (!battleState || battleState.trapUsed || !state.currentMatch.installedTrapId) return;
    battleState.trapUsed = true;
    document.getElementById('btn-trigger-trap').disabled = true;

    const trap = state.items.find(i => i.id === state.currentMatch.installedTrapId);
    addBattleLog(`【会場細工発動】: ${trap.name} がリングに炸裂！`);

    ['fA', 'fB'].forEach(key => {
        const c = battleState[key];
        if (trap.target === 'matk') {
            c.matk = Math.floor(c.matk * 0.7);
            addBattleLog(`${c.name} の電脳出力が30%低下`);
        }
    });
}

// 目押しチート介入
let cheatAnimId = null;
let pointerPos = 0;
let pointerDir = 1;
let pointerSpeed = 2;
let targetLeft = 30;
let targetWidth = 25;

function openCheatModal() {
    if (!battleState || battleState.isPaused) return;
    battleState.isPaused = true;

    const modal = document.getElementById('cheat-modal');
    modal.style.display = 'block';

    const tgtSelect = document.getElementById('cheat-target-fighter');
    tgtSelect.innerHTML = `
        <option value="fA">${battleState.fA.name}</option>
        <option value="fB">${battleState.fB.name}</option>
    `;

    const actSelect = document.getElementById('cheat-action-select');
    actSelect.innerHTML = `
        <option value="snipe_hp">消音ライフル狙撃 (現在HP 20%削り)</option>
        <option value="stun">高圧スタンボルト (5秒スタン)</option>
        <option value="break_arm">マニピュレータ狙撃 (腕部耐久-25)</option>
    `;

    const skill = state.cheatSkill;
    targetWidth = Math.max(5, Math.min(60, 20 + (skill * 1.5)));
    targetLeft = 20 + Math.random() * (60 - targetWidth);

    const targetEl = document.getElementById('timing-target');
    targetEl.style.left = `${targetLeft}%`;
    targetEl.style.width = `${targetWidth}%`;

    pointerPos = 0;
    pointerDir = 1;
    cheatAnimId = requestAnimationFrame(cheatAnimLoop);
}

function cheatAnimLoop() {
    pointerPos += pointerDir * pointerSpeed;
    if (pointerPos >= 100) { pointerPos = 100; pointerDir = -1; }
    if (pointerPos <= 0) { pointerPos = 0; pointerDir = 1; }

    document.getElementById('timing-pointer').style.left = `${pointerPos}%`;
    cheatAnimId = requestAnimationFrame(cheatAnimLoop);
}

function stopCheatPointer() {
    cancelAnimationFrame(cheatAnimId);
    document.getElementById('cheat-modal').style.display = 'none';

    const isSuccess = pointerPos >= targetLeft && pointerPos <= (targetLeft + targetWidth);
    const targetKey = document.getElementById('cheat-target-fighter').value;
    const action = document.getElementById('cheat-action-select').value;
    const targetComb = battleState[targetKey];

    if (isSuccess) {
        addBattleLog(`【裏工作成功！】査察員の遠隔介入が命中！`);
        if (action === 'snipe_hp') {
            const dmg = Math.floor(targetComb.currentHp * 0.2);
            targetComb.currentHp -= dmg;
            addBattleLog(`${targetComb.name} に狙撃貫通 (${dmg} ダメージ)`);
        } else if (action === 'stun') {
            targetComb.isStunnedSec = 5;
            addBattleLog(`${targetComb.name} が5秒間スタン！`);
        } else if (action === 'break_arm') {
            targetComb.ref.partDurability.arms = Math.max(0, targetComb.ref.partDurability.arms - 25);
            addBattleLog(`${targetComb.name} の腕部耐久力が大破 (-25)`);
        }
    } else {
        addBattleLog(`【裏工作失敗】狙撃はリングの床を弾いた！`);
    }

    battleState.isPaused = false;
}

// 決着処理
function endBattle() {
    clearInterval(battleState.intervalId);
    const winnerKey = battleState.fA.currentHp > 0 ? 'fA' : 'fB';
    const loserKey = winnerKey === 'fA' ? 'fB' : 'fA';
    const winner = battleState[winnerKey];
    const loser = battleState[loserKey];

    addBattleLog(`【決着】勝者: ${winner.name}！！`);

    winner.ref.recentResults.push(1);
    if (winner.ref.recentResults.length > 5) winner.ref.recentResults.shift();
    loser.ref.recentResults.push(0);
    if (loser.ref.recentResults.length > 5) loser.ref.recentResults.shift();

    state.fighters.forEach(f => {
        if (f.id !== winner.ref.id && f.id !== loser.ref.id) {
            ['head','body','arms','legs'].forEach(p => {
                f.partDurability[p] = Math.min(100, f.partDurability[p] + state.sysConfig.arena.restRecovery);
            });
        }
    });

    const isBetWin = state.currentMatch.betTargetId === winner.ref.id;
    let resultText = "";

    if (isBetWin) {
        const winOdds = winnerKey === 'fA' ? state.currentMatch.oddsA : state.currentMatch.oddsB;
        const grossReturn = state.currentMatch.betAmount * winOdds;
        const pureProfit = grossReturn - state.currentMatch.betAmount;

        let finalReturn = grossReturn;
        let bribeDeduction = 0;

        if (state.currentMatch.installedTrapId) {
            bribeDeduction = pureProfit * state.sysConfig.arena.bribeRate;
            finalReturn -= bribeDeduction;
        }

        state.money += finalReturn;
        resultText = `賭け的中！ 配当: +${finalReturn.toFixed(1)} CR` + 
            (bribeDeduction > 0 ? ` (うち会場管理員への賄賂控除: -${bribeDeduction.toFixed(1)} CR)` : "");
    } else {
        resultText = `賭け失敗…… 賭け金 ${state.currentMatch.betAmount} CR は没収されました。`;
    }

    document.getElementById('battle-result-text').textContent = resultText;
    document.getElementById('battle-result-box').style.display = 'block';

    saveData();
}

function finishBattleAndReturn() {
    rollNextMatch();
    renderArenaTop();
    renderMain();
}
