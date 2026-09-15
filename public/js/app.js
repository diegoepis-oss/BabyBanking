const SVG_NS = 'http://www.w3.org/2000/svg';

const state = {
  currentAccountId: null,
  currentAccountColor: '#3B82F6',
  pendingAction: null, // 'deposit' | 'withdraw'
  pendingDeleteTransactionId: null,
};

const views = {
  login: document.getElementById('view-login'),
  dashboard: document.getElementById('view-dashboard'),
  account: document.getElementById('view-account'),
  stats: document.getElementById('view-stats'),
};

function showView(name) {
  Object.values(views).forEach((v) => (v.hidden = true));
  views[name].hidden = false;
}

function formatMoney(amount) {
  return amount.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });
}

function formatDate(isoString) {
  const d = new Date(isoString);
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
}

async function api(path, options = {}) {
  const res = await fetch('/api' + path, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Qualcosa non ha funzionato');
  }
  return data;
}

// ---------- KEYPAD HELPER ----------
//
// Il PIN si può digitare cliccando i tasti sullo schermo oppure usando i
// tasti numerici della tastiera del PC; in entrambi i casi va confermato con
// il tasto OK (o il tasto Invio). Un solo "pinpad" alla volta è "attivo": è
// quello che riceve i tasti premuti sulla tastiera fisica.

let activeKeypad = null;

function buildKeypad(container, onDigit, onClear, onConfirm) {
  container.innerHTML = '';
  const layout = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'ok'];
  layout.forEach((key) => {
    const btn = document.createElement('button');
    if (key === 'clear') {
      btn.textContent = 'Cancella';
      btn.className = 'key-clear';
      btn.addEventListener('click', onClear);
    } else if (key === 'ok') {
      btn.textContent = 'OK';
      btn.className = 'key-ok';
      btn.addEventListener('click', onConfirm);
    } else {
      btn.textContent = key;
      btn.addEventListener('click', () => onDigit(key));
    }
    container.appendChild(btn);
  });
}

function renderDots(container, length) {
  container.innerHTML = '';
  for (let i = 0; i < length; i++) {
    const dot = document.createElement('div');
    dot.className = 'dot filled';
    container.appendChild(dot);
  }
}

function createPinPad({ keypadEl, dotsEl, errorEl, maxLength = 8, onSubmit }) {
  let pin = '';

  function render() {
    renderDots(dotsEl, pin.length);
  }

  function appendDigit(digit) {
    if (pin.length >= maxLength) return;
    pin += digit;
    errorEl.hidden = true;
    render();
  }

  function backspace() {
    pin = pin.slice(0, -1);
    errorEl.hidden = true;
    render();
  }

  function clear() {
    pin = '';
    errorEl.hidden = true;
    render();
  }

  function confirm() {
    if (!pin) return;
    onSubmit(pin);
  }

  function showError(message) {
    errorEl.textContent = message;
    errorEl.hidden = false;
    pin = '';
    render();
  }

  function activate() {
    activeKeypad = pad;
  }

  function deactivate() {
    if (activeKeypad === pad) activeKeypad = null;
  }

  buildKeypad(keypadEl, appendDigit, clear, confirm);

  const pad = { appendDigit, backspace, clear, confirm, showError, activate, deactivate };
  return pad;
}

document.addEventListener('keydown', (event) => {
  if (!activeKeypad) return;
  if (event.key >= '0' && event.key <= '9') {
    event.preventDefault();
    activeKeypad.appendDigit(event.key);
  } else if (event.key === 'Backspace') {
    event.preventDefault();
    activeKeypad.backspace();
  } else if (event.key === 'Enter') {
    event.preventDefault();
    activeKeypad.confirm();
  }
});

// ---------- LOGIN ----------

const loginPad = createPinPad({
  keypadEl: document.getElementById('login-keypad'),
  dotsEl: document.getElementById('login-dots'),
  errorEl: document.getElementById('login-error'),
  onSubmit: attemptLogin,
});
loginPad.activate();

async function attemptLogin(pin) {
  try {
    await api('/login', { method: 'POST', body: JSON.stringify({ pin }) });
    loginPad.clear();
    loginPad.deactivate();
    await openDashboard();
  } catch (err) {
    loginPad.showError(err.message);
  }
}

// ---------- DASHBOARD ----------

const accountsCards = document.getElementById('accounts-cards');

async function openDashboard() {
  const accounts = await api('/accounts');
  accountsCards.innerHTML = '';
  accounts.forEach((acc) => {
    const card = document.createElement('div');
    card.className = 'account-card';
    card.style.borderColor = acc.color;
    card.innerHTML = `
      <div class="account-avatar-big">${acc.avatar}</div>
      <h3>${acc.name}</h3>
    `;
    card.addEventListener('click', () => openAccount(acc.id));
    accountsCards.appendChild(card);
  });
  showView('dashboard');
}

document.getElementById('btn-logout').addEventListener('click', logout);
document.getElementById('btn-logout-2').addEventListener('click', logout);
document.getElementById('btn-logout-3').addEventListener('click', logout);

async function logout() {
  await api('/logout', { method: 'POST' });
  loginPad.activate();
  showView('login');
}

// ---------- ACCOUNT DETAIL ----------

document.getElementById('btn-back').addEventListener('click', openDashboard);

async function openAccount(accountId) {
  state.currentAccountId = accountId;
  const account = await api('/accounts/' + accountId);
  state.currentAccountColor = account.color;
  document.getElementById('account-avatar').textContent = account.avatar;
  document.getElementById('account-name').textContent = account.name;
  document.getElementById('account-balance').textContent = formatMoney(account.balance);
  document.getElementById('account-balance').style.color = account.color;

  const transactions = await api('/accounts/' + accountId + '/transactions');
  const list = document.getElementById('history-list');
  list.innerHTML = '';

  if (transactions.length === 0) {
    list.innerHTML = '<li class="empty-state">Ancora nessun movimento. Inizia a risparmiare! 🐷</li>';
  } else {
    transactions.forEach((t) => {
      const item = document.createElement('li');
      item.className = 'history-item';
      const sign = t.type === 'deposit' ? '+' : '−';
      item.innerHTML = `
        <div class="history-info">
          <span class="history-description">${escapeHtml(t.description)}</span>
          <span class="history-date">${formatDate(t.date)}</span>
        </div>
        <div class="history-amount ${t.type}">${sign} ${formatMoney(t.amount)}</div>
        <button class="history-delete" title="Cancella questo movimento" data-id="${t.id}" data-description="${escapeHtml(t.description)}" data-amount="${sign} ${formatMoney(t.amount)}">🗑️</button>
      `;
      list.appendChild(item);
    });
  }

  showView('account');
}

document.getElementById('history-list').addEventListener('click', (event) => {
  const btn = event.target.closest('.history-delete');
  if (!btn) return;
  openDeleteConfirm(btn.dataset.id, btn.dataset.description, btn.dataset.amount);
});

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ---------- STATISTICS PAGE ----------

document.getElementById('btn-open-stats').addEventListener('click', () => openStats(state.currentAccountId));
document.getElementById('btn-back-stats').addEventListener('click', () => openAccount(state.currentAccountId));

async function openStats(accountId) {
  state.currentAccountId = accountId;
  const account = await api('/accounts/' + accountId);
  state.currentAccountColor = account.color;
  document.getElementById('stats-avatar').textContent = account.avatar;
  document.getElementById('stats-name').textContent = account.name;

  const months = await api('/accounts/' + accountId + '/stats');
  renderChart(document.getElementById('chart-container'), months);
  renderCumulativeChart(document.getElementById('cumulative-chart-container'), months, account.color);

  showView('stats');
  updateScrollHint('chart-container', 'chart-scroll-hint');
  updateScrollHint('cumulative-chart-container', 'cumulative-scroll-hint');
}

function renderChart(container, months) {
  container.innerHTML = '';

  const width = 600;
  const height = 260;
  const paddingTop = 24;
  const paddingBottom = 56;
  const zeroY = paddingTop + (height - paddingTop - paddingBottom) / 2;
  const plotHeight = height - paddingTop - paddingBottom;
  const barSlot = width / months.length;
  const barWidth = Math.min(48, barSlot * 0.55);

  const maxAbs = Math.max(10, ...months.map((m) => Math.abs(m.net)));

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('class', 'chart-svg');

  // zero line (asse orizzontale di riferimento)
  const zeroLine = document.createElementNS(SVG_NS, 'line');
  zeroLine.setAttribute('x1', 0);
  zeroLine.setAttribute('x2', width);
  zeroLine.setAttribute('y1', zeroY);
  zeroLine.setAttribute('y2', zeroY);
  zeroLine.setAttribute('class', 'chart-axis');
  svg.appendChild(zeroLine);

  months.forEach((m, i) => {
    const slotCenter = barSlot * i + barSlot / 2;
    const barHeight = (Math.abs(m.net) / maxAbs) * (plotHeight / 2);
    const isPositive = m.net >= 0;
    const barY = isPositive ? zeroY - barHeight : zeroY;

    const rect = document.createElementNS(SVG_NS, 'rect');
    rect.setAttribute('x', slotCenter - barWidth / 2);
    rect.setAttribute('y', barY);
    rect.setAttribute('width', barWidth);
    rect.setAttribute('height', Math.max(barHeight, 2));
    rect.setAttribute('rx', 6);
    rect.setAttribute('class', isPositive ? 'chart-bar chart-bar-positive' : 'chart-bar chart-bar-negative');
    svg.appendChild(rect);

    // valore del movimento del mese, sopra o sotto la colonna
    const netLabel = document.createElementNS(SVG_NS, 'text');
    netLabel.setAttribute('x', slotCenter);
    netLabel.setAttribute('y', isPositive ? barY - 8 : barY + barHeight + 16);
    netLabel.setAttribute('class', 'chart-net-label');
    netLabel.setAttribute('text-anchor', 'middle');
    netLabel.textContent = (m.net >= 0 ? '+' : '') + formatMoney(m.net);
    svg.appendChild(netLabel);

    // nome del mese
    const monthLabel = document.createElementNS(SVG_NS, 'text');
    monthLabel.setAttribute('x', slotCenter);
    monthLabel.setAttribute('y', height - 34);
    monthLabel.setAttribute('class', 'chart-month-label');
    monthLabel.setAttribute('text-anchor', 'middle');
    monthLabel.textContent = m.label;
    svg.appendChild(monthLabel);

    // totale accumulato a fine mese
    const totalLabel = document.createElementNS(SVG_NS, 'text');
    totalLabel.setAttribute('x', slotCenter);
    totalLabel.setAttribute('y', height - 16);
    totalLabel.setAttribute('class', 'chart-total-label');
    totalLabel.setAttribute('text-anchor', 'middle');
    totalLabel.textContent = 'Totale: ' + formatMoney(m.balanceAtEnd);
    svg.appendChild(totalLabel);
  });

  container.appendChild(svg);
}

function updateScrollHint(containerId, hintId) {
  const container = document.getElementById(containerId);
  const hint = document.getElementById(hintId);
  hint.hidden = container.scrollWidth <= container.clientWidth + 1;
}

window.addEventListener('resize', () => {
  if (!views.stats.hidden) {
    updateScrollHint('chart-container', 'chart-scroll-hint');
    updateScrollHint('cumulative-chart-container', 'cumulative-scroll-hint');
  }
});

// niceScale: sceglie un massimo "tondo" e un passo per le righe orizzontali del grafico,
// cosi' i numeri sull'asse sono facili da leggere (es. 20, 40, 60... invece di 23, 46, 69...)
function niceScale(maxValue, ticks = 4) {
  if (maxValue <= 0) return { step: 10, max: 40 };
  const rawStep = maxValue / ticks;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const residual = rawStep / magnitude;
  let niceResidual;
  if (residual > 5) niceResidual = 10;
  else if (residual > 2) niceResidual = 5;
  else if (residual > 1) niceResidual = 2;
  else niceResidual = 1;
  const step = niceResidual * magnitude;
  const max = Math.ceil(maxValue / step) * step;
  return { step, max };
}

function renderCumulativeChart(container, months, color) {
  container.innerHTML = '';

  const width = 600;
  const height = 280;
  const leftMargin = 60;
  const rightMargin = 44;
  const topMargin = 28;
  const bottomMargin = 56;
  const plotWidth = width - leftMargin - rightMargin;
  const plotHeight = height - topMargin - bottomMargin;

  const maxBalance = Math.max(0, ...months.map((m) => m.balanceAtEnd));
  const { step, max: niceMax } = niceScale(maxBalance, 4);

  const yForValue = (v) => topMargin + plotHeight - (v / niceMax) * plotHeight;
  const xForIndex = (i) =>
    months.length === 1 ? leftMargin + plotWidth / 2 : leftMargin + (plotWidth / (months.length - 1)) * i;

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('class', 'chart-svg');

  // righe orizzontali di riferimento + numeri sull'asse verticale
  const gridCount = Math.round(niceMax / step);
  for (let g = 0; g <= gridCount; g++) {
    const value = g * step;
    const y = yForValue(value);

    const gridline = document.createElementNS(SVG_NS, 'line');
    gridline.setAttribute('x1', leftMargin);
    gridline.setAttribute('x2', width - rightMargin);
    gridline.setAttribute('y1', y);
    gridline.setAttribute('y2', y);
    gridline.setAttribute('class', 'chart-gridline');
    svg.appendChild(gridline);

    const axisLabel = document.createElementNS(SVG_NS, 'text');
    axisLabel.setAttribute('x', leftMargin - 8);
    axisLabel.setAttribute('y', y + 4);
    axisLabel.setAttribute('text-anchor', 'end');
    axisLabel.setAttribute('class', 'chart-axis-label');
    axisLabel.textContent = formatMoney(value);
    svg.appendChild(axisLabel);
  }

  const points = months.map((m, i) => ({
    x: xForIndex(i),
    y: yForValue(m.balanceAtEnd),
    value: m.balanceAtEnd,
    label: m.label,
  }));

  // lineette tratteggiate che collegano ogni pallino al mese (sotto) e al totale (a sinistra),
  // per far capire come si "legge" il grafico incrociando i due assi
  points.forEach((p) => {
    const vDrop = document.createElementNS(SVG_NS, 'line');
    vDrop.setAttribute('x1', p.x);
    vDrop.setAttribute('x2', p.x);
    vDrop.setAttribute('y1', p.y);
    vDrop.setAttribute('y2', topMargin + plotHeight);
    vDrop.setAttribute('class', 'chart-drop-line');
    svg.appendChild(vDrop);

    const hDrop = document.createElementNS(SVG_NS, 'line');
    hDrop.setAttribute('x1', leftMargin);
    hDrop.setAttribute('x2', p.x);
    hDrop.setAttribute('y1', p.y);
    hDrop.setAttribute('y2', p.y);
    hDrop.setAttribute('class', 'chart-drop-line');
    svg.appendChild(hDrop);
  });

  const polyline = document.createElementNS(SVG_NS, 'polyline');
  polyline.setAttribute('points', points.map((p) => `${p.x},${p.y}`).join(' '));
  polyline.setAttribute('class', 'chart-line');
  polyline.style.stroke = color;
  svg.appendChild(polyline);

  points.forEach((p, i) => {
    const circle = document.createElementNS(SVG_NS, 'circle');
    circle.setAttribute('cx', p.x);
    circle.setAttribute('cy', p.y);
    circle.setAttribute('r', 6);
    circle.setAttribute('class', 'chart-point');
    circle.style.fill = color;
    svg.appendChild(circle);

    const valueLabel = document.createElementNS(SVG_NS, 'text');
    valueLabel.setAttribute('x', p.x);
    valueLabel.setAttribute('y', Math.max(14, p.y - 12));
    valueLabel.setAttribute('text-anchor', 'middle');
    valueLabel.setAttribute('class', 'chart-net-label');
    valueLabel.textContent = formatMoney(p.value);
    svg.appendChild(valueLabel);

    const monthLabel = document.createElementNS(SVG_NS, 'text');
    monthLabel.setAttribute('x', p.x);
    monthLabel.setAttribute('y', height - 16);
    monthLabel.setAttribute('text-anchor', 'middle');
    monthLabel.setAttribute('class', 'chart-month-label');
    monthLabel.textContent = months[i].label;
    svg.appendChild(monthLabel);
  });

  container.appendChild(svg);
}

// ---------- MODAL: DEPOSIT / WITHDRAW ----------

const modalOverlay = document.getElementById('modal-overlay');
const modalTitle = document.getElementById('modal-title');
const modalAmount = document.getElementById('modal-amount');
const modalDescription = document.getElementById('modal-description');
const modalDate = document.getElementById('modal-date');
const modalFormError = document.getElementById('modal-form-error');
const modalStepForm = document.getElementById('modal-step-form');
const modalStepParent = document.getElementById('modal-step-parent');
const parentDots = document.getElementById('parent-dots');
const parentError = document.getElementById('modal-parent-error');

document.getElementById('btn-open-deposit').addEventListener('click', () => openModal('deposit'));
document.getElementById('btn-open-withdraw').addEventListener('click', () => openModal('withdraw'));
document.getElementById('modal-close').addEventListener('click', closeModal);

const parentPad = createPinPad({
  keypadEl: document.getElementById('parent-keypad'),
  dotsEl: parentDots,
  errorEl: parentError,
  onSubmit: confirmTransaction,
});

function openModal(action) {
  state.pendingAction = action;
  modalTitle.textContent = action === 'deposit' ? '➕ Aggiungi soldi ai risparmi' : '➖ Prendi soldi dai risparmi';
  modalAmount.value = '';
  modalDescription.value = '';
  modalDate.value = new Date().toISOString().slice(0, 10);
  modalFormError.hidden = true;
  modalStepForm.hidden = false;
  modalStepParent.hidden = true;
  parentPad.clear();
  parentPad.deactivate();
  modalOverlay.hidden = false;
}

function closeModal() {
  modalOverlay.hidden = true;
  state.pendingAction = null;
  parentPad.deactivate();
}

document.getElementById('modal-continue').addEventListener('click', () => {
  const amount = Number(modalAmount.value);
  const description = modalDescription.value.trim();

  if (!Number.isFinite(amount) || amount <= 0) {
    modalFormError.textContent = 'Inserisci un importo valido';
    modalFormError.hidden = false;
    return;
  }
  if (!description) {
    modalFormError.textContent = 'Scrivi una descrizione per ricordarti cosa hai fatto';
    modalFormError.hidden = false;
    return;
  }

  modalStepForm.hidden = true;
  modalStepParent.hidden = false;
  parentPad.activate();
});

async function confirmTransaction(pin) {
  try {
    await api('/accounts/' + state.currentAccountId + '/transactions', {
      method: 'POST',
      body: JSON.stringify({
        type: state.pendingAction,
        amount: modalAmount.value,
        description: modalDescription.value.trim(),
        date: modalDate.value ? new Date(modalDate.value).toISOString() : undefined,
        parentPin: pin,
      }),
    });
    parentPad.clear();
    parentPad.deactivate();
    closeModal();
    await openAccount(state.currentAccountId);
  } catch (err) {
    parentPad.showError(err.message);
  }
}

// ---------- DELETE TRANSACTION ----------

const deleteOverlay = document.getElementById('delete-overlay');
const deleteSummary = document.getElementById('delete-summary');
const deleteParentDots = document.getElementById('delete-parent-dots');
const deleteParentError = document.getElementById('delete-parent-error');

document.getElementById('delete-modal-close').addEventListener('click', closeDeleteConfirm);

const deletePad = createPinPad({
  keypadEl: document.getElementById('delete-parent-keypad'),
  dotsEl: deleteParentDots,
  errorEl: deleteParentError,
  onSubmit: confirmDeleteTransaction,
});

function openDeleteConfirm(transactionId, description, amountLabel) {
  state.pendingDeleteTransactionId = transactionId;
  deleteSummary.textContent = `${description} — ${amountLabel}`;
  deletePad.clear();
  deletePad.activate();
  deleteOverlay.hidden = false;
}

function closeDeleteConfirm() {
  deleteOverlay.hidden = true;
  state.pendingDeleteTransactionId = null;
  deletePad.deactivate();
}

async function confirmDeleteTransaction(pin) {
  try {
    await api('/accounts/' + state.currentAccountId + '/transactions/' + state.pendingDeleteTransactionId, {
      method: 'DELETE',
      body: JSON.stringify({ parentPin: pin }),
    });
    deletePad.clear();
    deletePad.deactivate();
    closeDeleteConfirm();
    await openAccount(state.currentAccountId);
  } catch (err) {
    deletePad.showError(err.message);
  }
}

// ---------- STARTUP ----------

(async function init() {
  try {
    const session = await api('/session');
    if (session.loggedIn) {
      loginPad.deactivate();
      await openDashboard();
      return;
    }
  } catch (err) {
    // ignore, show login
  }
  showView('login');
})();
