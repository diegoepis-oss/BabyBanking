const state = {
  loginPin: '',
  parentPin: '',
  currentAccountId: null,
  pendingAction: null, // 'deposit' | 'withdraw'
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

function buildKeypad(container, onDigit, onClear) {
  container.innerHTML = '';
  const layout = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'ok'];
  layout.forEach((key) => {
    const btn = document.createElement('button');
    if (key === 'clear') {
      btn.textContent = 'Cancella';
      btn.className = 'key-clear';
      btn.addEventListener('click', onClear);
    } else if (key === 'ok') {
      btn.className = 'key-empty';
    } else {
      btn.textContent = key;
      btn.addEventListener('click', () => onDigit(key));
    }
    container.appendChild(btn);
  });
}

function renderDots(container, length, max = 4) {
  container.innerHTML = '';
  for (let i = 0; i < max; i++) {
    const dot = document.createElement('div');
    dot.className = 'dot' + (i < length ? ' filled' : '');
    container.appendChild(dot);
  }
}

// ---------- LOGIN ----------

const loginDots = document.getElementById('login-dots');
const loginError = document.getElementById('login-error');

renderDots(loginDots, 0);

buildKeypad(
  document.getElementById('login-keypad'),
  (digit) => {
    if (state.loginPin.length >= 4) return;
    state.loginPin += digit;
    renderDots(loginDots, state.loginPin.length);
    loginError.hidden = true;
    if (state.loginPin.length === 4) {
      attemptLogin();
    }
  },
  () => {
    state.loginPin = '';
    renderDots(loginDots, 0);
    loginError.hidden = true;
  }
);

async function attemptLogin() {
  try {
    await api('/login', { method: 'POST', body: JSON.stringify({ pin: state.loginPin }) });
    state.loginPin = '';
    await openDashboard();
  } catch (err) {
    loginError.textContent = err.message;
    loginError.hidden = false;
    state.loginPin = '';
    renderDots(loginDots, 0);
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
      <div class="balance" style="color:${acc.color}">${formatMoney(acc.balance)}</div>
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
  showView('login');
}

// ---------- ACCOUNT DETAIL ----------

document.getElementById('btn-back').addEventListener('click', openDashboard);

async function openAccount(accountId) {
  state.currentAccountId = accountId;
  const account = await api('/accounts/' + accountId);
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
      `;
      list.appendChild(item);
    });
  }

  showView('account');
}

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
  document.getElementById('stats-avatar').textContent = account.avatar;
  document.getElementById('stats-name').textContent = account.name;

  const months = await api('/accounts/' + accountId + '/stats');
  const chartContainer = document.getElementById('chart-container');
  renderChart(chartContainer, months);

  showView('stats');
  updateChartScrollHint();
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

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('class', 'chart-svg');

  // zero line (asse orizzontale di riferimento)
  const zeroLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
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

    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', slotCenter - barWidth / 2);
    rect.setAttribute('y', barY);
    rect.setAttribute('width', barWidth);
    rect.setAttribute('height', Math.max(barHeight, 2));
    rect.setAttribute('rx', 6);
    rect.setAttribute('class', isPositive ? 'chart-bar chart-bar-positive' : 'chart-bar chart-bar-negative');
    svg.appendChild(rect);

    // valore del movimento del mese, sopra o sotto la colonna
    const netLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    netLabel.setAttribute('x', slotCenter);
    netLabel.setAttribute('y', isPositive ? barY - 8 : barY + barHeight + 16);
    netLabel.setAttribute('class', 'chart-net-label');
    netLabel.setAttribute('text-anchor', 'middle');
    netLabel.textContent = (m.net >= 0 ? '+' : '') + formatMoney(m.net);
    svg.appendChild(netLabel);

    // nome del mese
    const monthLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    monthLabel.setAttribute('x', slotCenter);
    monthLabel.setAttribute('y', height - 34);
    monthLabel.setAttribute('class', 'chart-month-label');
    monthLabel.setAttribute('text-anchor', 'middle');
    monthLabel.textContent = m.label;
    svg.appendChild(monthLabel);

    // totale accumulato a fine mese
    const totalLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    totalLabel.setAttribute('x', slotCenter);
    totalLabel.setAttribute('y', height - 16);
    totalLabel.setAttribute('class', 'chart-total-label');
    totalLabel.setAttribute('text-anchor', 'middle');
    totalLabel.textContent = 'Totale: ' + formatMoney(m.balanceAtEnd);
    svg.appendChild(totalLabel);
  });

  container.appendChild(svg);
}

function updateChartScrollHint() {
  const chartContainer = document.getElementById('chart-container');
  const scrollHint = document.querySelector('.chart-scroll-hint');
  scrollHint.hidden = chartContainer.scrollWidth <= chartContainer.clientWidth + 1;
}

window.addEventListener('resize', () => {
  if (!views.stats.hidden) updateChartScrollHint();
});

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

function openModal(action) {
  state.pendingAction = action;
  state.parentPin = '';
  modalTitle.textContent = action === 'deposit' ? '➕ Aggiungi soldi ai risparmi' : '➖ Prendi soldi dai risparmi';
  modalAmount.value = '';
  modalDescription.value = '';
  modalDate.value = new Date().toISOString().slice(0, 10);
  modalFormError.hidden = true;
  parentError.hidden = true;
  modalStepForm.hidden = false;
  modalStepParent.hidden = true;
  renderDots(parentDots, 0);
  modalOverlay.hidden = false;
}

function closeModal() {
  modalOverlay.hidden = true;
  state.pendingAction = null;
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
});

buildKeypad(
  parentKeypadEl(),
  (digit) => {
    if (state.parentPin.length >= 4) return;
    state.parentPin += digit;
    renderDots(parentDots, state.parentPin.length);
    parentError.hidden = true;
    if (state.parentPin.length === 4) {
      confirmTransaction();
    }
  },
  () => {
    state.parentPin = '';
    renderDots(parentDots, 0);
    parentError.hidden = true;
  }
);

function parentKeypadEl() {
  return document.getElementById('parent-keypad');
}

async function confirmTransaction() {
  try {
    await api('/accounts/' + state.currentAccountId + '/transactions', {
      method: 'POST',
      body: JSON.stringify({
        type: state.pendingAction,
        amount: modalAmount.value,
        description: modalDescription.value.trim(),
        date: modalDate.value ? new Date(modalDate.value).toISOString() : undefined,
        parentPin: state.parentPin,
      }),
    });
    closeModal();
    await openAccount(state.currentAccountId);
  } catch (err) {
    parentError.textContent = err.message;
    parentError.hidden = false;
    state.parentPin = '';
    renderDots(parentDots, 0);
  }
}

// ---------- STARTUP ----------

(async function init() {
  try {
    const session = await api('/session');
    if (session.loggedIn) {
      await openDashboard();
      return;
    }
  } catch (err) {
    // ignore, show login
  }
  showView('login');
})();
