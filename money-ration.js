(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const money = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(n) || 0);
  const uid = () => (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : `cw-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const escapeHTML = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const getJSON = (key, fallback) => { try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch (_) { return fallback; } };
  const setJSON = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) { /* local-only demo storage */ } };
  const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
  const parseLocalDate = (value) => { const parts = String(value || todayISO()).split('-').map(Number); return new Date(parts[0], (parts[1] || 1)-1, parts[2] || 1, 12, 0, 0); };
  const dayDiff = (from, to) => Math.max(0, Math.floor((parseLocalDate(to) - parseLocalDate(from)) / 86400000));
  const dateLabel = (date) => new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(parseLocalDate(date));
  const plusDaysISO = (date, days) => { const d = parseLocalDate(date); d.setDate(d.getDate() + Math.max(0, Math.ceil(days))); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };

  const upiSeed = [
    { id:'upi-1', date:'2026-11-05', time:'10:18 AM', merchant:'Corner Chai Stop', detail:'Tea and snack', amount:45, category:'Food', optional:true },
    { id:'upi-2', date:'2026-11-04', time:'9:42 PM', merchant:'QuickBite', detail:'Late-night food order', amount:189, category:'Food delivery', optional:true },
    { id:'upi-3', date:'2026-11-04', time:'6:15 PM', merchant:'City Auto', detail:'Auto fare', amount:96, category:'Transport', optional:false },
    { id:'upi-4', date:'2026-11-03', time:'4:05 PM', merchant:'Daily Brew', detail:'Coffee', amount:120, category:'Cafe', optional:true },
    { id:'upi-5', date:'2026-11-02', time:'8:31 PM', merchant:'Delivery Fee', detail:'Convenience fee', amount:39, category:'Fees', optional:true },
    { id:'upi-6', date:'2026-11-01', time:'11:10 AM', merchant:'Cloud Storage', detail:'Monthly subscription', amount:149, category:'Subscription', optional:false },
    { id:'upi-7', date:'2026-10-31', time:'12:25 PM', merchant:'Fresh Mart', detail:'Household groceries', amount:560, category:'Groceries', optional:false }
  ];
  const platformSeed = [
    { id:'amazon', name:'Amazon', monogram:'a', amount:2499, orders:2, connected:true, hint:'Shopping & household' },
    { id:'myntra', name:'Myntra', monogram:'M', amount:1899, orders:1, connected:true, hint:'Fashion & lifestyle' },
    { id:'zomato', name:'Zomato', monogram:'z', amount:389, orders:1, connected:true, hint:'Food orders' },
    { id:'swiggy', name:'Swiggy', monogram:'S', amount:245, orders:1, connected:true, hint:'Food & groceries' },
    { id:'blinkit', name:'Blinkit', monogram:'b', amount:560, orders:2, connected:true, hint:'Quick commerce' }
  ];
  const rationSeed = [
    { id:'ration-rice', name:'Rice', quantity:25, unit:'kg', dailyPerPerson:0.12, cost:1750, purchasedOn:todayISO() },
    { id:'ration-atta', name:'Wheat flour', quantity:20, unit:'kg', dailyPerPerson:0.10, cost:1050, purchasedOn:todayISO() },
    { id:'ration-dal', name:'Toor dal', quantity:8, unit:'kg', dailyPerPerson:0.035, cost:1280, purchasedOn:todayISO() },
    { id:'ration-oil', name:'Cooking oil', quantity:12, unit:'L', dailyPerPerson:0.025, cost:2100, purchasedOn:todayISO() },
    { id:'ration-sugar', name:'Sugar', quantity:5, unit:'kg', dailyPerPerson:0.02, cost:260, purchasedOn:todayISO() }
  ];

  let transactions = getJSON('cartwise-upi-transactions-v1', upiSeed);
  let platforms = getJSON('cartwise-platforms-v1', platformSeed);
  let rationItems = getJSON('cartwise-ration-items-v1', rationSeed);
  let householdMembers = Number(getJSON('cartwise-household-members-v1', 4)) || 4;

  function renderTransactions() {
    const host = $('upiTransactionList');
    if (!host) return;
    const optionalTotal = transactions.filter((t) => t.optional).reduce((sum, t) => sum + Number(t.amount), 0);
    $('optionalSpendTotal').textContent = money(optionalTotal);
    $('potentialSavingsTotal').textContent = money(optionalTotal);
    $('savingsCallout').textContent = money(optionalTotal);
    host.innerHTML = '';
    if (!transactions.length) {
      host.innerHTML = '<div class="empty-money-state">No transactions to review. Import a UPI CSV to get started.</div>';
      return;
    }
    transactions.forEach((t) => {
      const row = document.createElement('div');
      row.className = `transaction-row${t.optional ? ' is-optional' : ''}`;
      const initial = escapeHTML(String(t.merchant || 'UPI').trim().charAt(0).toUpperCase());
      const when = `${dateLabel(t.date)}${t.time ? ` · ${escapeHTML(t.time)}` : ''}`;
      row.innerHTML = `<span class="transaction-avatar">${initial}</span><div class="transaction-info"><strong>${escapeHTML(t.merchant)}</strong><span>${escapeHTML(t.detail || t.category || 'UPI payment')} · ${when}</span></div><div class="transaction-amount"><strong>${money(t.amount)}</strong><span>${escapeHTML(t.category || 'UPI')}</span></div><button type="button" class="optional-toggle${t.optional ? ' active' : ''}" data-upi-id="${escapeHTML(t.id)}" aria-pressed="${Boolean(t.optional)}">${t.optional ? 'Optional' : 'Keep'}</button>`;
      host.appendChild(row);
    });
  }

  function renderPlatforms() {
    const host = $('platformList');
    if (!host) return;
    const connected = platforms.filter((p) => p.connected);
    const sum = connected.reduce((total, p) => total + Number(p.amount), 0);
    $('platformSpendTotal').textContent = money(sum);
    $('platformTotalLarge').textContent = money(sum);
    $('platformConnectionCount').textContent = `${connected.length} of ${platforms.length} demo connections active`;
    host.innerHTML = '';
    platforms.forEach((platform) => {
      const row = document.createElement('div');
      row.className = `platform-row${platform.connected ? '' : ' is-disconnected'}`;
      const monogram = escapeHTML(platform.monogram || platform.name.charAt(0));
      const amount = platform.connected ? money(platform.amount) : '—';
      const action = platform.connected ? 'Disconnect' : 'Connect demo';
      row.innerHTML = `<span class="platform-monogram platform-${escapeHTML(platform.id)}">${monogram}</span><div class="platform-info"><strong>${escapeHTML(platform.name)}</strong><span>${escapeHTML(platform.hint)} · ${platform.connected ? `${platform.orders} sample orders` : 'Not connected'}</span></div><strong class="platform-amount">${amount}</strong><button type="button" class="platform-toggle${platform.connected ? ' connected' : ''}" data-platform-id="${escapeHTML(platform.id)}">${action}</button>`;
      host.appendChild(row);
    });
  }

  function forecast(item) {
    const daysPassed = dayDiff(item.purchasedOn, todayISO());
    const consumed = daysPassed * item.dailyPerPerson * householdMembers;
    const remaining = Math.max(0, item.quantity - consumed);
    const dailyHouseholdUse = item.dailyPerPerson * householdMembers;
    const daysLeft = dailyHouseholdUse > 0 ? remaining / dailyHouseholdUse : Infinity;
    return { remaining, daysLeft, dueDate: Number.isFinite(daysLeft) ? plusDaysISO(todayISO(), daysLeft) : '' };
  }

  function renderRation() {
    const host = $('rationItems');
    if (!host) return;
    $('householdMembers').value = householdMembers;
    const value = rationItems.reduce((sum, item) => sum + Number(item.cost || 0), 0);
    const forecasts = rationItems.map((item) => ({ item, ...forecast(item) }));
    const due = forecasts.filter((entry) => entry.daysLeft <= 14).length;
    $('rationTotalValue').textContent = money(value);
    $('rationItemCount').textContent = rationItems.length;
    $('rationDueCount').textContent = due;
    host.innerHTML = '';
    if (!rationItems.length) {
      host.innerHTML = '<div class="empty-money-state">No ration items yet. Add your first bulk purchase using the form.</div>';
    }
    forecasts.forEach(({ item, remaining, daysLeft, dueDate }) => {
      const pct = Math.max(0, Math.min(100, (remaining / Math.max(item.quantity, 0.001)) * 100));
      const isDue = daysLeft <= 14;
      const daysText = daysLeft <= 0 ? 'Estimated stock finished' : daysLeft < 1 ? 'Less than 1 day left' : `${Math.floor(daysLeft)} days of supply`;
      const row = document.createElement('article');
      row.className = `ration-item-row${isDue ? ' is-due' : ''}`;
      row.innerHTML = `<div class="ration-item-top"><div><strong>${escapeHTML(item.name)}</strong><span>${Number(item.quantity).toLocaleString('en-IN')} ${escapeHTML(item.unit)} bought · ${money(item.cost)} · ${dateLabel(item.purchasedOn)}</span></div><span class="ration-status ${isDue ? 'due' : 'healthy'}">${isDue ? 'RESTOCK SOON' : 'ON TRACK'}</span></div><div class="ration-stock-track"><span style="width:${pct}%"></span></div><div class="ration-item-bottom"><span><strong>${remaining.toFixed(1)} ${escapeHTML(item.unit)}</strong> estimated left</span><span>${escapeHTML(daysText)}</span><span>Restock by <strong>${dateLabel(dueDate || todayISO())}</strong></span></div><div class="ration-item-meta">Usage estimate: ${Number(item.dailyPerPerson).toLocaleString('en-IN')} ${escapeHTML(item.unit)} per person per day · ${householdMembers} people</div><button type="button" class="ration-delete" data-ration-id="${escapeHTML(item.id)}" aria-label="Remove ${escapeHTML(item.name)}">×</button>`;
      host.appendChild(row);
    });
    const note = $('rationReminderNote');
    if (due) {
      const dueNames = forecasts.filter((entry) => entry.daysLeft <= 14).map((entry) => entry.item.name);
      note.innerHTML = `<span>◷</span><p><strong>${due} restock reminder${due === 1 ? '' : 's'}:</strong> ${dueNames.map(escapeHTML).join(', ')} ${due === 1 ? 'may' : 'may'} run low within 14 days. Review your stock before purchasing.</p>`;
      note.classList.add('has-due');
    } else {
      note.innerHTML = '<span>◷</span><p>No essentials are currently forecast to run low within the next 14 days. Estimates update as dates and household usage change.</p>';
      note.classList.remove('has-due');
    }
    setJSON('cartwise-ration-items-v1', rationItems);
    setJSON('cartwise-household-members-v1', householdMembers);
    checkBrowserAlerts(forecasts);
  }

  function showImportToast(message) {
    const note = $('rationReminderNote');
    if (note) note.setAttribute('aria-label', message);
  }

  $('upiTransactionList').addEventListener('click', (event) => {
    const button = event.target.closest('[data-upi-id]');
    if (!button) return;
    const transaction = transactions.find((t) => t.id === button.dataset.upiId);
    if (!transaction) return;
    transaction.optional = !transaction.optional;
    setJSON('cartwise-upi-transactions-v1', transactions);
    renderTransactions();
  });
  $('platformList').addEventListener('click', (event) => {
    const button = event.target.closest('[data-platform-id]');
    if (!button) return;
    const platform = platforms.find((p) => p.id === button.dataset.platformId);
    if (!platform) return;
    platform.connected = !platform.connected;
    setJSON('cartwise-platforms-v1', platforms);
    renderPlatforms();
  });

  function parseCSV(text) {
    const rows = [];
    let row = [], field = '', quoted = false;
    const source = String(text || '').replace(/^\uFEFF/, '');
    for (let i = 0; i < source.length; i++) {
      const c = source[i];
      if (c === '"' && source[i + 1] === '"' && quoted) { field += '"'; i++; }
      else if (c === '"') quoted = !quoted;
      else if (c === ',' && !quoted) { row.push(field.trim()); field = ''; }
      else if ((c === '\n' || c === '\r') && !quoted) { if (field || row.length) { row.push(field.trim()); rows.push(row); } row = []; field = ''; if (c === '\r' && source[i + 1] === '\n') i++; }
      else field += c;
    }
    if (field || row.length) { row.push(field.trim()); rows.push(row); }
    return rows;
  }
  $('upiCsvInput').addEventListener('change', () => {
    const file = $('upiCsvInput').files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024 || !/\.csv$/i.test(file.name)) { window.alert('Please select a CSV file smaller than 1 MB.'); $('upiCsvInput').value = ''; return; }
    const reader = new FileReader();
    reader.onload = () => {
      const rows = parseCSV(reader.result);
      if (!rows.length) { window.alert('The CSV file is empty.'); return; }
      const headers = rows[0].map((h) => h.toLowerCase().replace(/[^a-z0-9]+/g, ''));
      const col = (...names) => headers.findIndex((h) => names.includes(h));
      const dateCol = col('date','transactiondate','time');
      const merchantCol = col('merchant','payee','name','counterparty','recipient');
      const amountCol = col('amount','debit','transactionamount','paid');
      const detailCol = col('description','remarks','narration','note');
      const categoryCol = col('category','type');
      if (merchantCol < 0 || amountCol < 0) { window.alert('CSV needs at least Merchant and Amount columns. Optional columns: Date, Description, Category.'); return; }
      const imported = rows.slice(1).map((r) => ({
        id: uid(), date: dateCol >= 0 && r[dateCol] ? (parseImportDate(r[dateCol])) : todayISO(), time:'',
        merchant: String(r[merchantCol] || 'UPI payment').slice(0,80), detail: detailCol >= 0 ? String(r[detailCol] || '').slice(0,100) : 'Imported UPI transaction',
        amount: Math.abs(Number(String(r[amountCol] || '').replace(/[₹,\s]/g,''))), category: categoryCol >= 0 ? String(r[categoryCol] || 'UPI') : 'UPI', optional:false
      })).filter((t) => Number.isFinite(t.amount) && t.amount > 0 && t.amount < 10000000 && t.merchant);
      if (!imported.length) { window.alert('No valid transactions found in that CSV.'); return; }
      if (window.confirm(`Import ${imported.length} transactions? The current sample list will be replaced.`)) {
        transactions = imported.slice(0,500); setJSON('cartwise-upi-transactions-v1', transactions); renderTransactions();
        window.alert('Transactions imported locally. Review each one and mark optional purchases yourself.');
      }
    };
    reader.onerror = () => window.alert('Could not read the CSV file.');
    reader.readAsText(file); $('upiCsvInput').value = '';
  });
  function parseImportDate(value) {
    const s = String(value || '').trim();
    let m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (m) return `${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`;
    m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
    if (m) return `${m[3]}-${String(m[2]).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}`;
    return todayISO();
  }

  $('householdMembers').addEventListener('change', () => {
    householdMembers = Math.max(1, Math.min(20, Math.floor(Number($('householdMembers').value) || 1)));
    renderRation();
  });
  $('householdMinus').addEventListener('click', () => { householdMembers = Math.max(1, householdMembers - 1); renderRation(); });
  $('householdPlus').addEventListener('click', () => { householdMembers = Math.min(20, householdMembers + 1); renderRation(); });
  $('rationUnit').addEventListener('change', () => { const unit = $('rationUnit').value; $('rationUnitHint').textContent = `${unit} / person / day`; });
  $('rationForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const name = $('rationName').value.trim();
    const quantity = Number($('rationQuantity').value);
    const dailyPerPerson = Number($('rationDailyUse').value);
    const cost = Number($('rationCost').value || 0);
    const purchasedOn = $('rationPurchaseDate').value || todayISO();
    if (!name || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(dailyPerPerson) || dailyPerPerson <= 0 || !Number.isFinite(cost) || cost < 0) { window.alert('Enter a valid item, purchased quantity, daily usage and purchase amount.'); return; }
    rationItems.unshift({ id:uid(), name:name.slice(0,50), quantity, unit:$('rationUnit').value, dailyPerPerson, cost, purchasedOn });
    setJSON('cartwise-ration-items-v1', rationItems);
    $('rationForm').reset(); $('rationPurchaseDate').value = todayISO(); $('rationUnitHint').textContent = 'kg / person / day';
    renderRation();
  });
  $('rationItems').addEventListener('click', (event) => {
    const button = event.target.closest('[data-ration-id]');
    if (!button) return;
    rationItems = rationItems.filter((item) => item.id !== button.dataset.rationId);
    setJSON('cartwise-ration-items-v1', rationItems); renderRation();
  });

  function checkBrowserAlerts(forecasts) {
    if (!getJSON('cartwise-ration-alerts-enabled-v1', false) || !('Notification' in window) || Notification.permission !== 'granted') return;
    const today = todayISO();
    forecasts.filter((entry) => entry.daysLeft <= 14).forEach(({ item, daysLeft }) => {
      const key = `cartwise-ration-alert-${item.id}-${today}`;
      if (localStorage.getItem(key)) return;
      const label = daysLeft <= 0 ? 'may be out of stock' : `may run low in about ${Math.max(1, Math.floor(daysLeft))} days`;
      try { new Notification(`Cartwise restock reminder: ${item.name}`, { body: `${item.name} ${label}. Review your household stock.`, icon:'assets/app-icon-192.png' }); localStorage.setItem(key, '1'); } catch (_) { /* foreground note remains available */ }
    });
  }
  $('enableRationAlerts').addEventListener('click', async () => {
    if (!('Notification' in window)) { window.alert('Browser notifications are not supported here. Your restock reminders will still appear inside Cartwise when you open it.'); return; }
    const permission = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission;
    if (permission === 'granted') {
      setJSON('cartwise-ration-alerts-enabled-v1', true);
      $('enableRationAlerts').textContent = 'Alerts enabled';
      renderRation();
      window.alert('Restock alerts enabled. Cartwise can check for reminders when the app is open. It cannot send scheduled background reminders while fully closed without a server-side notification service.');
    } else window.alert('Notifications were not enabled. Your restock reminders remain visible inside the Ration Planner.');
  });

  // Make the date field useful on first load and keep the demo data explicitly local.
  $('rationPurchaseDate').value = todayISO();
  $('enableRationAlerts').textContent = getJSON('cartwise-ration-alerts-enabled-v1', false) ? 'Alerts enabled' : 'Enable alerts';
  renderTransactions();
  renderPlatforms();
  renderRation();
  document.addEventListener('visibilitychange', () => { if (!document.hidden) renderRation(); });
})();
