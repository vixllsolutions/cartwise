(() => {
  'use strict';
  document.documentElement.classList.add('motion-ready');

  const CATALOG = {
    '8901000000011': { name: 'Fresh apples', price: 120, image: 'assets/products/apples.svg', unit: '1 kg', aliases: ['apple', 'apples', 'fresh apple', 'fresh apples'] },
    '8901000000028': { name: 'Milk 1 litre', price: 64, image: 'assets/products/milk.svg', unit: '1 pack', aliases: ['milk', 'milk 1l', 'milk 1 litre', '1 litre milk', '1l milk'] },
    '8901000000035': { name: 'Whole wheat bread', price: 48, image: 'assets/products/bread.svg', unit: '1 loaf', aliases: ['bread', 'whole wheat bread', 'wheat bread', 'loaf'] },
    '8901000000042': { name: 'Basmati rice 1 kg', price: 145, image: 'assets/products/rice.svg', unit: '1 pack', aliases: ['rice', 'basmati rice', 'rice 1 kg', 'basmati rice 1 kg'] },
    '8901000000059': { name: 'Eggs (6 pack)', price: 54, image: 'assets/products/eggs.svg', unit: '1 pack', aliases: ['egg', 'eggs', 'eggs 6 pack', 'six eggs', '6 eggs'] },
    '8901000000066': { name: 'Cooking oil 1 L', price: 158, image: 'assets/products/oil.svg', unit: '1 bottle', aliases: ['oil', 'cooking oil', 'cooking oil 1l', 'cooking oil 1 litre', '1 litre oil'] }
  };

  const $ = (id) => document.getElementById(id);
  const els = {
    budgetAmount: $('budgetAmount'), spentAmount: $('spentAmount'), remainingAmount: $('remainingAmount'), budgetProgress: $('budgetProgress'), budgetWarning: $('budgetWarning'),
    cartTotal: $('cartTotal'), itemCount: $('itemCount'), uniqueCount: $('uniqueCount'), cartBadge: $('cartBadge'), cartList: $('cartList'), emptyState: $('emptyState'),
    subtotalValue: $('subtotalValue'), footerTotal: $('footerTotal'), billProductCount: $('billProductCount'), billBudgetStatus: $('billBudgetStatus'),
    clearCartBtn: $('clearCartBtn'), receiptBtn: $('receiptBtn'), barcodeInput: $('barcodeInput'), manualForm: $('manualForm'),
    toast: $('toast'), budgetDialog: $('budgetDialog'), budgetForm: $('budgetForm'), budgetInput: $('budgetInput'),
    scannerDialog: $('scannerDialog'), cameraVideo: $('cameraVideo'), cameraStage: $('cameraStage'), cameraMessage: $('cameraMessage'), startCameraBtn: $('startCameraBtn'), stopCameraBtn: $('stopCameraBtn'),
    customProductDialog: $('customProductDialog'), customProductForm: $('customProductForm'), customName: $('customName'), customPrice: $('customPrice'), customBarcode: $('customBarcode'),
    listFileInput: $('listFileInput'), listItems: $('listItems'), listDoneCount: $('listDoneCount'), listTotalCount: $('listTotalCount'), listProgressFill: $('listProgressFill'),
    listItemInput: $('listItemInput'), listItemQty: $('listItemQty'), manualListForm: $('manualListForm'), clearListBtn: $('clearListBtn'), importFeedback: $('importFeedback'),
    pasteArea: $('pasteArea'), pasteListInput: $('pasteListInput'), nextPickTitle: $('nextPickTitle'), nextPickCopy: $('nextPickCopy'), listFooterNote: $('listFooterNote')
  };

  const money = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  const load = (key, fallback) => {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
    catch (_) { return fallback; }
  };
  const uid = () => (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : `cw-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  let budget = Number(load('cartwise-budget', 2000)) || 2000;
  let cart = load('cartwise-cart', []);
  let shoppingList = load('cartwise-shopping-list', []);
  if (!Array.isArray(cart)) cart = [];
  if (!Array.isArray(shoppingList)) shoppingList = [];
  cart = cart.filter((item) => item && item.name && Number(item.price) >= 0 && Number(item.quantity) > 0).map((item) => ({ ...item, price: Number(item.price), quantity: Math.max(1, Math.floor(Number(item.quantity))) }));
  shoppingList = shoppingList.filter((item) => item && item.name).map((item) => ({ id: item.id || uid(), name: String(item.name), quantity: Math.max(1, Math.floor(Number(item.quantity) || 1)) }));

  let cameraStream = null;
  let detector = null;
  let scanFrame = null;
  let lastDetected = '';
  let lastDetectedAt = 0;
  let toastTimer = null;
  let installPrompt = null;

  const total = () => cart.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0);
  const itemCount = () => cart.reduce((sum, item) => sum + Number(item.quantity), 0);
  const normalize = (value) => String(value || '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
  const save = () => {
    try {
      localStorage.setItem('cartwise-budget', JSON.stringify(budget));
      localStorage.setItem('cartwise-cart', JSON.stringify(cart));
      localStorage.setItem('cartwise-shopping-list', JSON.stringify(shoppingList));
    } catch (_) { showToast('Browser storage is unavailable. Your changes may not stay after closing this page.'); }
  };
  const showToast = (message) => {
    els.toast.textContent = message;
    els.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => els.toast.classList.remove('show'), 2600);
  };
  const catalogEntryForName = (name) => {
    const needle = normalize(name);
    if (!needle) return null;
    for (const [barcode, product] of Object.entries(CATALOG)) {
      const aliases = [product.name, ...product.aliases].map(normalize);
      if (aliases.includes(needle)) return { barcode, product };
    }
    return null;
  };
  const getScannedQuantity = (entry) => {
    const match = catalogEntryForName(entry.name);
    if (match) return cart.filter((item) => item.barcode === match.barcode).reduce((sum, item) => sum + item.quantity, 0);
    const wanted = normalize(entry.name);
    return cart.filter((item) => normalize(item.name) === wanted).reduce((sum, item) => sum + item.quantity, 0);
  };
  const listDone = (entry) => getScannedQuantity(entry) >= entry.quantity;
  const completedListCount = () => shoppingList.filter(listDone).length;
  const remainingListEntries = () => shoppingList.filter((entry) => !listDone(entry));

  function pulse(node) {
    if (!node) return;
    node.classList.remove('pulse-update');
    void node.offsetWidth;
    node.classList.add('pulse-update');
    setTimeout(() => node.classList.remove('pulse-update'), 500);
  }

  function renderCart() {
    const spent = total();
    const count = itemCount();
    const remaining = budget - spent;
    els.budgetAmount.textContent = money(budget).replace('.00', '');
    els.spentAmount.textContent = money(spent);
    els.remainingAmount.textContent = money(Math.max(remaining, 0));
    els.cartTotal.textContent = money(spent);
    els.itemCount.textContent = count;
    els.uniqueCount.textContent = cart.length;
    els.cartBadge.textContent = count;
    els.subtotalValue.textContent = money(spent);
    els.footerTotal.textContent = money(spent);
    els.billProductCount.textContent = count;
    els.budgetProgress.style.width = `${Math.min((spent / Math.max(budget, 1)) * 100, 100)}%`;
    els.budgetProgress.style.background = spent > budget ? '#ffb18a' : 'linear-gradient(90deg,#a4df45,#1bd19b)';
    els.budgetWarning.hidden = spent <= budget;
    els.budgetWarning.textContent = spent > budget ? `You're ${money(spent - budget)} over your budget. Review your cart before checkout.` : '';
    els.billBudgetStatus.classList.toggle('over-budget', spent > budget);
    els.billBudgetStatus.innerHTML = spent > budget ? '<span>●</span> You are over your budget' : '<span>●</span> You’re within your budget';
    els.emptyState.hidden = count !== 0;
    els.clearCartBtn.disabled = count === 0;
    els.receiptBtn.disabled = count === 0;

    els.cartList.querySelectorAll('.cart-item').forEach((node) => node.remove());
    cart.forEach((item, index) => {
      const row = document.createElement('article');
      row.className = 'cart-item';
      row.dataset.cartIndex = String(index);
      const image = document.createElement('div'); image.className = 'item-thumb';
      const img = document.createElement('img'); img.src = item.image || 'assets/products/custom.svg'; img.alt = ''; image.appendChild(img);
      const detail = document.createElement('div');
      const name = document.createElement('p'); name.className = 'item-name'; name.textContent = item.name;
      const meta = document.createElement('p'); meta.className = 'item-meta'; meta.textContent = `${item.unit || '1 item'} · ${item.barcode ? `Barcode ${item.barcode}` : 'Custom item'}`;
      const controls = document.createElement('div'); controls.className = 'item-controls';
      const minus = document.createElement('button'); minus.className = 'qty-button'; minus.type = 'button'; minus.textContent = '−'; minus.setAttribute('aria-label', `Decrease ${item.name}`); minus.addEventListener('click', () => changeQuantity(index, -1));
      const qty = document.createElement('span'); qty.className = 'qty-value'; qty.textContent = item.quantity;
      const plus = document.createElement('button'); plus.className = 'qty-button'; plus.type = 'button'; plus.textContent = '+'; plus.setAttribute('aria-label', `Increase ${item.name}`); plus.addEventListener('click', () => changeQuantity(index, 1));
      const remove = document.createElement('button'); remove.className = 'remove-button'; remove.type = 'button'; remove.textContent = 'Remove'; remove.addEventListener('click', () => removeItem(index));
      controls.append(minus, qty, plus, remove); detail.append(name, meta, controls);
      const price = document.createElement('div'); price.className = 'item-price'; price.textContent = money(item.price * item.quantity);
      const unit = document.createElement('span'); unit.className = 'unit-price'; unit.textContent = `${money(item.price)} / unit`; price.appendChild(unit);
      row.append(image, detail, price); els.cartList.appendChild(row);
    });
    save();
  }

  function renderList() {
    const done = completedListCount();
    const totalEntries = shoppingList.length;
    const percent = totalEntries ? (done / totalEntries) * 100 : 0;
    els.listDoneCount.textContent = done;
    els.listTotalCount.textContent = totalEntries;
    els.listProgressFill.style.width = `${percent}%`;
    els.clearListBtn.disabled = totalEntries === 0;
    els.listItems.replaceChildren();

    if (!totalEntries) {
      const empty = document.createElement('div'); empty.className = 'list-empty';
      const icon = document.createElement('span'); icon.textContent = '☑';
      const heading = document.createElement('strong'); heading.textContent = 'Your list is empty';
      const text = document.createElement('p'); text.textContent = 'Upload a list or add a few items to get your shopping plan started.';
      empty.append(icon, heading, text); els.listItems.appendChild(empty);
      els.listFooterNote.textContent = 'Waiting for your list';
      els.nextPickTitle.textContent = 'Upload a list to get suggestions';
      els.nextPickCopy.textContent = 'Your remaining items will appear here as a simple shopping guide.';
      save(); return;
    }

    shoppingList.forEach((entry, index) => {
      const scanned = getScannedQuantity(entry);
      const completed = scanned >= entry.quantity;
      const match = catalogEntryForName(entry.name);
      const row = document.createElement('div'); row.className = `list-item${completed ? ' is-done' : ''}`; row.dataset.listIndex = String(index);
      const check = document.createElement('span'); check.className = 'list-check'; check.textContent = completed ? '✓' : '·';
      const details = document.createElement('div');
      const name = document.createElement('p'); name.className = 'list-item-name'; name.textContent = entry.name;
      const meta = document.createElement('p'); meta.className = 'list-item-meta';
      meta.textContent = `${Math.min(scanned, entry.quantity)} of ${entry.quantity} scanned${match ? ` · ${money(match.product.price)} each (sample)` : ' · price not in demo catalogue'}`;
      details.append(name, meta);
      const status = document.createElement('span'); status.className = 'list-item-status'; status.textContent = completed ? 'SCANNED' : 'TO BUY';
      const remove = document.createElement('button'); remove.className = 'list-item-remove'; remove.type = 'button'; remove.textContent = '×'; remove.setAttribute('aria-label', `Remove ${entry.name} from shopping list`); remove.addEventListener('click', () => removeListItem(index));
      const side = document.createElement('div'); side.style.display = 'flex'; side.style.alignItems = 'center'; side.append(status, remove);
      row.append(check, details, side); els.listItems.appendChild(row);
    });

    const remaining = remainingListEntries();
    els.listFooterNote.textContent = remaining.length ? `${remaining.length} item${remaining.length === 1 ? '' : 's'} left to scan` : 'Everything on your list is scanned';
    if (remaining.length) {
      const next = remaining[0];
      const match = catalogEntryForName(next.name);
      els.nextPickTitle.textContent = `Next up: ${next.name}`;
      els.nextPickCopy.textContent = match ? `Recognized in the demo catalogue at ${money(match.product.price)} each. Scan ${next.quantity} to complete this list item.` : `Not in the demo catalogue yet. Scan its barcode and add the name and store price when prompted.`;
    } else {
      els.nextPickTitle.textContent = 'Your shopping list is complete';
      els.nextPickCopy.textContent = 'Every item on your list has been matched to a scanned product. Check your total before checkout.';
    }
    save();
  }

  function render() {
    renderCart();
    renderList();
  }

  function addProduct(barcode) {
    const code = String(barcode || '').trim();
    if (!code) { showToast('Enter a barcode first.'); return; }
    const product = CATALOG[code];
    const existing = cart.find((item) => item.barcode === code);
    if (existing) {
      existing.quantity += 1;
      render(); pulse(els.cartTotal); showToast(`${existing.name} quantity updated`); els.barcodeInput.value = ''; return;
    }
    if (!product) { openCustomProduct(code); return; }
    cart.push({ barcode: code, ...product, quantity: 1 });
    render(); pulse(els.cartTotal); showToast(`${product.name} added to your cart`); els.barcodeInput.value = '';
  }

  function changeQuantity(index, change) {
    if (!cart[index]) return;
    if (cart[index].quantity + change <= 0) { removeItem(index); return; }
    cart[index].quantity += change;
    render(); pulse(els.cartTotal);
  }

  function removeItem(index) {
    if (!cart[index]) return;
    const row = els.cartList.querySelector(`[data-cart-index="${index}"]`);
    if (row) {
      row.classList.add('fade-out');
      setTimeout(() => {
        cart.splice(index, 1); render(); showToast('Item removed from your cart.');
      }, 260);
    } else { cart.splice(index, 1); render(); }
  }

  function addListItem(name, quantity = 1) {
    const cleanName = String(name || '').trim().replace(/\s+/g, ' ');
    const qty = Math.max(1, Math.min(99, Math.floor(Number(quantity) || 1)));
    if (!cleanName) return false;
    const existing = shoppingList.find((entry) => normalize(entry.name) === normalize(cleanName));
    if (existing) existing.quantity = Math.min(99, existing.quantity + qty);
    else shoppingList.push({ id: uid(), name: cleanName, quantity: qty });
    renderList();
    return true;
  }

  function removeListItem(index) {
    const row = els.listItems.querySelector(`[data-list-index="${index}"]`);
    if (row) {
      row.style.opacity = '0'; row.style.transform = 'translateX(12px)';
      setTimeout(() => { shoppingList.splice(index, 1); renderList(); }, 220);
    } else { shoppingList.splice(index, 1); renderList(); }
  }

  function parseCsvRow(line) {
    const result = []; let field = ''; let quoted = false;
    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      if (char === '"' && line[i + 1] === '"' && quoted) { field += '"'; i += 1; }
      else if (char === '"') quoted = !quoted;
      else if (char === ',' && !quoted) { result.push(field.trim()); field = ''; }
      else field += char;
    }
    result.push(field.trim());
    return result;
  }

  function parseShoppingText(text) {
    const lines = String(text || '').replace(/^\uFEFF/, '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const parsed = [];
    lines.forEach((line, index) => {
      if (/^(item|product|name|shopping item)\s*[,\t]/i.test(line) || /^(item|product|name)$/i.test(line)) return;
      let name = line; let quantity = 1;
      if (line.includes(',')) {
        const fields = parseCsvRow(line);
        if (fields.length > 1 && /^\d+$/.test(fields[1])) { name = fields[0]; quantity = Number(fields[1]); }
        else if (fields.length > 1 && /^\d+$/.test(fields[0])) { quantity = Number(fields[0]); name = fields.slice(1).join(' '); }
        else name = fields[0] || line;
      } else {
        let match = line.match(/^\s*(\d+)\s*(?:x|×)\s*(.+)$/i);
        if (match) { quantity = Number(match[1]); name = match[2]; }
        else {
          match = line.match(/^\s*(.+?)\s*(?:x|×)\s*(\d+)\s*$/i);
          if (match) { name = match[1]; quantity = Number(match[2]); }
        }
      }
      name = String(name).replace(/^(?:[-*•]\s*|\d+[.)]\s*)/, '').trim();
      quantity = Math.max(1, Math.min(99, Math.floor(Number(quantity) || 1)));
      if (name && normalize(name) && name.length <= 80) parsed.push({ name, quantity, index });
    });
    const merged = [];
    parsed.forEach((entry) => {
      const found = merged.find((item) => normalize(item.name) === normalize(entry.name));
      if (found) found.quantity = Math.min(99, found.quantity + entry.quantity);
      else merged.push({ name: entry.name, quantity: entry.quantity });
    });
    return merged.slice(0, 100);
  }

  function importShoppingText(text, sourceLabel = 'list') {
    const parsed = parseShoppingText(text);
    if (!parsed.length) { els.importFeedback.textContent = 'No items found. Use one item per line, or CSV columns such as Item,Quantity.'; return; }
    if (shoppingList.length && !window.confirm('Replace your current shopping list with the imported list? Choose Cancel to keep your current list.')) return;
    shoppingList = parsed.map((item) => ({ id: uid(), name: item.name, quantity: item.quantity }));
    renderList();
    els.importFeedback.textContent = `${shoppingList.length} item${shoppingList.length === 1 ? '' : 's'} imported from your ${sourceLabel}.`;
    showToast('Shopping list imported.');
  }

  els.manualForm.addEventListener('submit', (event) => { event.preventDefault(); addProduct(els.barcodeInput.value); });
  document.querySelectorAll('.product-card').forEach((button) => button.addEventListener('click', () => addProduct(button.dataset.barcode)));
  $('editBudgetBtn').addEventListener('click', () => { els.budgetInput.value = budget; els.budgetDialog.showModal(); });
  els.budgetForm.addEventListener('submit', (event) => {
    event.preventDefault(); const nextBudget = Number(els.budgetInput.value);
    if (!Number.isFinite(nextBudget) || nextBudget <= 0) { showToast('Enter a budget greater than zero.'); return; }
    budget = nextBudget; renderCart(); els.budgetDialog.close(); showToast('Shopping budget updated.');
  });
  $('clearCartBtn').addEventListener('click', () => {
    if (!cart.length) return;
    if (window.confirm('Clear all scanned items from your cart? Your shopping list will stay.')) { cart = []; render(); showToast('Cart cleared.'); }
  });
  els.customProductForm.addEventListener('submit', (event) => {
    event.preventDefault(); const name = els.customName.value.trim(); const price = Number(els.customPrice.value); const barcode = els.customBarcode.value;
    if (!name || !Number.isFinite(price) || price <= 0) { showToast('Enter a product name and valid price.'); return; }
    const already = cart.find((item) => item.barcode === barcode);
    if (already) already.quantity += 1;
    else cart.push({ barcode, name, price, image: 'assets/products/custom.svg', unit: '1 item', quantity: 1 });
    render(); els.customProductDialog.close(); showToast(`${name} added to your cart`);
  });
  document.querySelectorAll('[data-close]').forEach((button) => button.addEventListener('click', () => { const dialog = $(button.dataset.close); if (dialog) dialog.close(); }));

  els.manualListForm.addEventListener('submit', (event) => {
    event.preventDefault(); const name = els.listItemInput.value.trim(); const quantity = Number(els.listItemQty.value);
    if (!name) { showToast('Type an item name first.'); els.listItemInput.focus(); return; }
    addListItem(name, quantity); els.listItemInput.value = ''; els.listItemQty.value = '1'; els.listItemInput.focus();
    els.importFeedback.textContent = `${name} added to your shopping list.`;
  });
  els.listFileInput.addEventListener('change', () => {
    const file = els.listFileInput.files && els.listFileInput.files[0];
    if (!file) return;
    if (file.size > 1024 * 1024) { els.importFeedback.textContent = 'That file is over 1 MB. Please choose a smaller TXT or CSV file.'; els.listFileInput.value = ''; return; }
    const reader = new FileReader();
    reader.onload = () => importShoppingText(reader.result, file.name);
    reader.onerror = () => { els.importFeedback.textContent = 'Could not read that file. Try another TXT or CSV file.'; };
    reader.readAsText(file);
    els.listFileInput.value = '';
  });
  $('clearListBtn').addEventListener('click', () => {
    if (!shoppingList.length) return;
    if (window.confirm('Clear your shopping list? Your scanned cart will remain unchanged.')) { shoppingList = []; renderList(); els.importFeedback.textContent = 'Shopping list cleared.'; }
  });
  $('sampleListBtn').addEventListener('click', () => {
    const sample = 'Item,Quantity\nMilk,2\nFresh apples,1\nWhole wheat bread,1\nBasmati rice,1\nEggs,1\n';
    const blob = new Blob([sample], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'cartwise-sample-shopping-list.csv'; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
    showToast('Sample shopping list downloaded.');
  });
  $('pasteListBtn').addEventListener('click', () => { els.pasteArea.hidden = !els.pasteArea.hidden; if (!els.pasteArea.hidden) els.pasteListInput.focus(); });
  $('importPastedListBtn').addEventListener('click', () => {
    importShoppingText(els.pasteListInput.value, 'pasted list');
    if (shoppingList.length) els.pasteArea.hidden = true;
  });

  const dropzone = $('uploadDropzone');
  ['dragenter', 'dragover'].forEach((type) => dropzone.addEventListener(type, (event) => { event.preventDefault(); dropzone.classList.add('drag-over'); }));
  ['dragleave', 'drop'].forEach((type) => dropzone.addEventListener(type, (event) => { event.preventDefault(); dropzone.classList.remove('drag-over'); }));
  dropzone.addEventListener('drop', (event) => {
    const file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
    if (!file) return;
    const allowed = /\.(txt|csv|md)$/i.test(file.name);
    if (!allowed) { els.importFeedback.textContent = 'Please upload a .TXT or .CSV shopping list.'; return; }
    if (file.size > 1024 * 1024) { els.importFeedback.textContent = 'That file is over 1 MB. Please choose a smaller file.'; return; }
    const reader = new FileReader(); reader.onload = () => importShoppingText(reader.result, file.name); reader.readAsText(file);
  });

  function downloadReceipt() {
    if (!cart.length) return;
    const rows = [['Cartwise shopping summary'], ['Generated', new Date().toLocaleString('en-IN')], ['Budget (INR)', budget.toFixed(2)], [], ['Product', 'Barcode', 'Quantity', 'Unit price (INR)', 'Line total (INR)']];
    cart.forEach((item) => rows.push([item.name, item.barcode || '', item.quantity, item.price.toFixed(2), (item.price * item.quantity).toFixed(2)]));
    rows.push([], ['Estimated total (INR)', total().toFixed(2)], ['Budget remaining (INR)', (budget - total()).toFixed(2)], [], ['Shopping list item', 'Required quantity', 'Scanned quantity', 'Status']);
    shoppingList.forEach((entry) => rows.push([entry.name, entry.quantity, getScannedQuantity(entry), listDone(entry) ? 'Scanned' : 'To buy']));
    rows.push([], ['Note', 'Demo estimate only. Confirm final price at the store checkout.']);
    const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob); const anchor = document.createElement('a');
    anchor.href = url; anchor.download = `cartwise-summary-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
    showToast('Shopping summary downloaded.');
  }
  els.receiptBtn.addEventListener('click', downloadReceipt);

  function openCustomProduct(code) {
    stopCamera(); els.customBarcode.value = code; els.customName.value = ''; els.customPrice.value = '';
    if (els.scannerDialog.open) els.scannerDialog.close();
    els.customProductDialog.showModal(); setTimeout(() => els.customName.focus(), 100);
  }
  async function startCamera() {
    if (!navigator.mediaDevices?.getUserMedia) { els.cameraMessage.textContent = 'Camera access is not available. Use the barcode field to enter a code.'; return; }
    if (!('BarcodeDetector' in window)) { els.cameraMessage.textContent = 'This browser does not support built-in barcode detection. Use manual entry or a handheld scanner.'; return; }
    try {
      const preferredFormats = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39'];
      const supportedFormats = typeof BarcodeDetector.getSupportedFormats === 'function' ? await BarcodeDetector.getSupportedFormats() : preferredFormats;
      const formats = preferredFormats.filter((format) => supportedFormats.includes(format));
      if (!formats.length) { els.cameraMessage.textContent = 'No supported retail barcode formats were found. Use manual entry or a handheld scanner.'; return; }
      detector = new BarcodeDetector({ formats });
      cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
      els.cameraVideo.srcObject = cameraStream; await els.cameraVideo.play(); els.cameraStage.classList.add('active');
      els.startCameraBtn.disabled = true; els.stopCameraBtn.disabled = false;
      els.cameraMessage.textContent = 'Camera is on. Hold the barcode steady inside the frame.'; detectLoop();
    } catch (error) {
      els.cameraMessage.textContent = error?.name === 'NotAllowedError' ? 'Camera permission was denied. Allow camera access in browser settings or enter the barcode manually.' : 'Could not start the camera. Check permissions and try again.';
      stopCamera();
    }
  }
  async function detectLoop() {
    if (!cameraStream || !detector || els.cameraVideo.readyState < 2) { if (cameraStream) scanFrame = requestAnimationFrame(detectLoop); return; }
    try {
      const codes = await detector.detect(els.cameraVideo);
      if (codes.length) {
        const code = codes[0].rawValue; const now = Date.now();
        if (code && (code !== lastDetected || now - lastDetectedAt > 2200)) {
          lastDetected = code; lastDetectedAt = now;
          if (CATALOG[code] || cart.some((item) => item.barcode === code)) { addProduct(code); els.cameraMessage.textContent = 'Product scanned. Keep going or close the scanner.'; }
          else { els.cameraMessage.textContent = `Barcode ${code} found. Add the product details to continue.`; openCustomProduct(code); return; }
        }
      }
    } catch (_) { /* Ignore intermittent frame detection errors. */ }
    if (cameraStream) scanFrame = requestAnimationFrame(detectLoop);
  }
  function stopCamera() {
    if (scanFrame) cancelAnimationFrame(scanFrame); scanFrame = null;
    if (cameraStream) cameraStream.getTracks().forEach((track) => track.stop());
    cameraStream = null; detector = null;
    if (els.cameraVideo) { els.cameraVideo.pause(); els.cameraVideo.srcObject = null; }
    if (els.cameraStage) els.cameraStage.classList.remove('active');
    if (els.startCameraBtn) els.startCameraBtn.disabled = false;
    if (els.stopCameraBtn) els.stopCameraBtn.disabled = true;
  }
  $('openScannerBtn').addEventListener('click', () => { els.scannerDialog.showModal(); els.cameraMessage.textContent = 'Allow camera access to scan a product barcode.'; });
  els.startCameraBtn.addEventListener('click', startCamera);
  els.stopCameraBtn.addEventListener('click', () => { stopCamera(); els.cameraMessage.textContent = 'Camera stopped. Start it again or enter a barcode manually.'; });
  els.scannerDialog.addEventListener('close', stopCamera);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopCamera(); });
  window.addEventListener('beforeunload', stopCamera);

  window.addEventListener('beforeinstallprompt', (event) => { event.preventDefault(); installPrompt = event; $('installBtn').hidden = false; });
  $('installBtn').addEventListener('click', async () => {
    if (!installPrompt) return;
    installPrompt.prompt(); await installPrompt.userChoice; installPrompt = null; $('installBtn').hidden = true;
  });
  window.addEventListener('appinstalled', () => { $('installBtn').hidden = true; showToast('Cartwise installed.'); });
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) window.addEventListener('load', () => navigator.serviceWorker.register('./service-worker.js').catch(() => {}));

  // Gentle scroll reveal: content fades upward only as it enters the viewport.
  const revealNodes = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => { if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -35px 0px' });
    revealNodes.forEach((node) => revealObserver.observe(node));
  } else revealNodes.forEach((node) => node.classList.add('is-visible'));

  const mobileMenuBtn = $('mobileMenuBtn'); const mobileNav = $('mobileNav');
  mobileMenuBtn.addEventListener('click', () => {
    const isOpen = mobileMenuBtn.getAttribute('aria-expanded') === 'true';
    mobileMenuBtn.setAttribute('aria-expanded', String(!isOpen)); mobileNav.classList.toggle('open', !isOpen);
  });
  mobileNav.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => { mobileMenuBtn.setAttribute('aria-expanded', 'false'); mobileNav.classList.remove('open'); }));
  const backToTop = $('backToTop');
  window.addEventListener('scroll', () => backToTop.classList.toggle('visible', window.scrollY > 650), { passive: true });
  backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  render();
})();
