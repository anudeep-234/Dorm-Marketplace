const base = '/api';
const json = { 'Content-Type': 'application/json' };
let items = [];

const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const me = () => $('userName').value.trim();

function showMessage(text) {
  $('message').textContent = text;
}

async function api(path, body) {
  const res = await fetch(base + path, {
    method: 'POST', headers: json, body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

async function load() {
  try {
    const res = await fetch(base + '/items');
    items = await res.json();
    render();
  } catch {
    showMessage('Cannot reach the server.');
  }
}

function render() {
  const name = me();
  const list = $('items');
  if (items.length === 0) {
    list.innerHTML = '<li>No items listed yet.</li>';
    return;
  }
  list.innerHTML = items.map(item => {
    const isSeller = name && name === item.sellerName;
    const isBuyer = name && name === item.claimedBy;
    const secs = item.claimExpiresAt
      ? Math.max(0, Math.ceil((item.claimExpiresAt - Date.now()) / 1000))
      : 0;
    const statusText = item.status === 'claimed'
      ? `Claimed by ${esc(item.claimedBy)} (${secs}s left to confirm)`
      : 'Available';

    let buttons = '';
    if (item.status === 'available' && name && !isSeller) {
      buttons += `<button data-act="claim" data-id="${item.id}">Claim Item</button>`;
    }
    if (item.status === 'claimed' && isBuyer) {
      buttons += `<button data-act="confirm" data-id="${item.id}">Confirm Handoff</button>`;
    }
    if (isSeller) {
      buttons += `<button data-act="sold" data-id="${item.id}">Mark as Sold</button>`;
    }

    return `
      <li class="item">
        <strong>${esc(item.title)}</strong>
        <span class="badge ${item.status}">${item.status}</span>
        <div>${esc(item.category)} · ${esc(item.condition)} · Seller: ${esc(item.sellerName)}</div>
        <div>${statusText}</div>
        <div class="actions">${buttons}</div>
      </li>`;
  }).join('');
}

$('listForm').addEventListener('submit', async e => {
  e.preventDefault();
  if (!me()) return showMessage('Enter your name first.');
  try {
    await api('/items', {
      title: $('title').value.trim(),
      category: $('category').value.trim(),
      condition: $('condition').value.trim(),
      sellerName: me()
    });
    e.target.reset();
    showMessage('Item listed.');
  } catch (err) {
    showMessage(err.message);
  }
  await load();
});

$('items').addEventListener('click', async e => {
  const btn = e.target.closest('button[data-act]');
  if (!btn) return;
  const name = me();
  if (!name) return showMessage('Enter your name first.');
  const id = btn.dataset.id;
  try {
    if (btn.dataset.act === 'claim') {
      await api(`/items/${id}/claim`, { buyer: name });
      showMessage('Claimed. Confirm the handoff within 30 seconds.');
    } else if (btn.dataset.act === 'confirm') {
      await api(`/items/${id}/confirm`, { buyer: name });
      showMessage('Handoff confirmed. Item marked sold.');
    } else if (btn.dataset.act === 'sold') {
      await api(`/items/${id}/mark-sold`, { seller: name });
      showMessage('Marked as sold.');
    }
  } catch (err) {
    showMessage(err.message);
  }
  await load();
});

$('userName').addEventListener('input', render);
load();
setInterval(load, 2000);
setInterval(render, 1000);
