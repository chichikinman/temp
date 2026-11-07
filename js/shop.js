// ==========================================
// 治安局端末 OS - 闇市・所持品モジュール (js/shop.js)
// 違法闇市（購入/売却）・私物ロッカー・効果使用
// ==========================================

let currentShopTab = 'buy';

function switchShopSubTab(type) {
    currentShopTab = type;
    document.getElementById('btn-shop-buy').classList.toggle('active', type === 'buy');
    document.getElementById('btn-shop-sell').classList.toggle('active', type === 'sell');
    renderShop();
}

// 違法闇市描画
function renderShop() {
    const list = document.getElementById('shop-list');
    if (!list) return;
    list.innerHTML = '';

    if (currentShopTab === 'buy') {
        state.items.forEach(item => {
            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <div class="card-header">
                    <span>${item.name}</span>
                    <span style="color:var(--accent-gold);">${item.buy} CR</span>
                </div>
                <div style="font-size:0.7rem; color:#88cc99;">種別: ${item.category} / 効果: ${item.target} (${item.amount})</div>
                <button class="btn" onclick="buyItem('${item.id}')">購入する</button>
            `;
            list.appendChild(card);
        });
    } else {
        const owned = Object.keys(state.inventory).filter(id => state.inventory[id] > 0);
        if (owned.length === 0) {
            list.innerHTML = '<div style="font-size:0.7rem; color:#666;">売却可能な所持品はありません。</div>';
            return;
        }
        owned.forEach(id => {
            const item = state.items.find(i => i.id === id);
            if (!item) return;
            const count = state.inventory[id];
            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <div class="card-header">
                    <span>${item.name} (所持:${count})</span>
                    <span style="color:var(--main-green);">売値: ${item.sell} CR</span>
                </div>
                <button class="btn" onclick="sellItem('${item.id}')">1個売却 (+${item.sell} CR)</button>
            `;
            list.appendChild(card);
        });
    }
}

function buyItem(id) {
    const item = state.items.find(i => i.id === id);
    if (!item) return;
    if (state.money >= item.buy) {
        state.money -= item.buy;
        state.inventory[id] = (state.inventory[id] || 0) + 1;
        addLog(`闇市購入: ${item.name} (-${item.buy} CR)`);
        saveData();
        renderMain();
        renderShop();
    } else {
        alert("裏金クレジットが不足しています。");
    }
}

function sellItem(id) {
    const item = state.items.find(i => i.id === id);
    if (!item || !state.inventory[id] || state.inventory[id] <= 0) return;
    state.inventory[id] -= 1;
    state.money += item.sell;
    addLog(`物品換金: ${item.name} (+${item.sell} CR)`);
    saveData();
    renderMain();
    renderShop();
}

// 所持品ロッカー描画
function renderInventory() {
    const list = document.getElementById('inventory-list');
    if (!list) return;
    list.innerHTML = '';
    const owned = Object.keys(state.inventory).filter(id => state.inventory[id] > 0);
    if (owned.length === 0) {
        list.innerHTML = '<div style="font-size:0.7rem; color:#666;">ロッカーは空です。</div>';
        return;
    }

    owned.forEach(id => {
        const item = state.items.find(i => i.id === id);
        if (!item) return;
        const count = state.inventory[id];
        const isUsableSelf = item.category === 'need' || item.category === 'player_stat';

        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div class="card-header">
                <span>${item.name}</span>
                <span>数量: ${count}</span>
            </div>
            <div style="font-size:0.7rem; color:#88cc99;">種別: ${item.category} / 対象: ${item.target} (${item.amount})</div>
            ${isUsableSelf ? `<button class="btn" onclick="useInventoryItem('${item.id}')">自室で使用する</button>` : `<div style="font-size:0.65rem; color:#aaa; margin-top:2px;">※控室または闘技場で使用するアイテムです</div>`}
        `;
        list.appendChild(card);
    });
}

function useInventoryItem(id) {
    const item = state.items.find(i => i.id === id);
    if (!item || !state.inventory[id] || state.inventory[id] <= 0) return;

    if (item.category === 'need') {
        state.needs[item.target] = Math.min(1000, state.needs[item.target] + item.amount);
        addLog(`物品使用: ${item.name} で【${item.target}】が回復。`);
    } else if (item.category === 'player_stat') {
        state[item.target] = Math.max(0, state[item.target] + item.amount);
        addLog(`自己強化: ${item.name} で【${item.target}】が ${item.amount > 0 ? '+' : ''}${item.amount}`);
    }

    state.inventory[id] -= 1;
    saveData();
    renderInventory();
    renderMain();
                                      }
