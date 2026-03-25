// ═══════════════════════════════════════════════════════════════════════════════
// CashBud · Google Apps Script
// ═══════════════════════════════════════════════════════════════════════════════
//
// SETUP
// ─────
// 1. Open your Google Sheet → Extensions > Apps Script
// 2. Paste this file (CashBud.gs) and TransactionSidebar.html into the editor
// 3. Gear icon → Project Settings → Script Properties → add:
//
//    API_BASE_URL   →  https://your-deployed-domain.com
//    USER_EMAIL     →  your login email
//    USER_PASSWORD  →  your login password
//
// 4. Save → reload the sheet → a "CashBud" menu appears
//
// NOTE: Google's servers must be able to reach your API URL.
//       For local dev use ngrok: npx ngrok http 3001
// ═══════════════════════════════════════════════════════════════════════════════


// ─── Config & Auth ────────────────────────────────────────────────────────────

function getBaseUrl_() {
  return PropertiesService.getScriptProperties().getProperty('API_BASE_URL') || 'http://localhost:3001';
}

/**
 * Returns a valid JWT, logging in fresh if the cached token is missing/expired.
 * Token is cached in Script Properties so we don't log in on every request.
 */
function getToken_() {
  var props     = PropertiesService.getScriptProperties();
  var token     = props.getProperty('CACHED_TOKEN');
  var expiresAt = parseInt(props.getProperty('TOKEN_EXPIRES_AT') || '0', 10);

  // Re-use cached token if it has more than 5 minutes left
  if (token && Date.now() < expiresAt - 5 * 60 * 1000) return token;

  var email    = props.getProperty('USER_EMAIL');
  var password = props.getProperty('USER_PASSWORD');
  if (!email || !password) {
    throw new Error('USER_EMAIL and USER_PASSWORD must be set in Script Properties.');
  }

  var response = UrlFetchApp.fetch(getBaseUrl_() + '/api/auth/login', {
    method:             'post',
    contentType:        'application/json',
    muteHttpExceptions: true,
    headers:            { 'ngrok-skip-browser-warning': 'true' },
    payload:            JSON.stringify({ email: email, password: password }),
  });

  if (response.getResponseCode() !== 200) {
    throw new Error('Login failed (' + response.getResponseCode() + '): ' + response.getContentText());
  }

  var data = JSON.parse(response.getContentText());
  // Cache for 6 days (token expires in 7)
  props.setProperty('CACHED_TOKEN',     data.token);
  props.setProperty('TOKEN_EXPIRES_AT', String(Date.now() + 6 * 24 * 60 * 60 * 1000));
  return data.token;
}

// ─── HTTP helper ─────────────────────────────────────────────────────────────

function apiRequest_(method, path, body) {
  var options = {
    method:             method,
    contentType:        'application/json',
    muteHttpExceptions: true,
    headers: {
      Authorization:               'Bearer ' + getToken_(),
      'ngrok-skip-browser-warning': 'true',
    },
  };
  if (body) options.payload = JSON.stringify(body);

  var response = UrlFetchApp.fetch(getBaseUrl_() + path, options);
  var code     = response.getResponseCode();
  var text     = response.getContentText();

  if (code >= 400) throw new Error('API error ' + code + ': ' + text);
  return JSON.parse(text);
}

// ─── Menu ─────────────────────────────────────────────────────────────────────

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('CashBud')
    .addItem('⟳  Sync All',              'syncAll')
    .addSeparator()
    .addItem('⟳  Sync Accounts',         'syncAccounts')
    .addItem('⟳  Sync Expenses',         'syncExpenses')
    .addItem('⟳  Sync Transactions',     'syncTransactions')
    .addSeparator()
    .addItem('+  Add Transaction',        'showTransactionSidebar')
    .addToUi();
}

function syncAll() {
  var ui  = SpreadsheetApp.getUi();
  var now = new Date();
  var currentMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
  var lines = [];
  try { lines.push(syncAccountsWorker_());     } catch (e) { lines.push('Accounts error: ' + e.message); }
  try { lines.push(syncExpensesWorker_());     } catch (e) { lines.push('Expenses error: ' + e.message); }
  try { lines.push(syncTransactionsWorker_(currentMonth)); } catch (e) { lines.push('Transactions error: ' + e.message); }
  ui.alert('Sync Complete', lines.join('\n'), ui.ButtonSet.OK);
}


// ═══════════════════════════════════════════════════════════════════════════════
// SYNC ACCOUNTS
// ═══════════════════════════════════════════════════════════════════════════════

function syncAccounts() {
  var ui = SpreadsheetApp.getUi();
  try {
    var msg = syncAccountsWorker_();
    ui.alert(msg);
  } catch (e) {
    ui.alert('Error', e.message, ui.ButtonSet.OK);
  }
}

function syncAccountsWorker_() {
  var accounts = apiRequest_('GET', '/api/accounts');
  var summary  = apiRequest_('GET', '/api/accounts/summary');

  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Accounts') || ss.insertSheet('Accounts');
  sheet.clearContents();
  sheet.clearFormats();

  var CAT_COLOR = {
    Checking:    '#e8f5e9',
    Savings:     '#e3f2fd',
    Investments: '#f3e5f5',
    Credit:      '#fff3e0',
    Loan:        '#fce4ec',
  };
  var HEADER_BG      = '#1e293b';
  var HEADER_FG      = '#ffffff';
  var SUBTOT_BG      = '#f8fafc';
  var CATEGORY_ORDER = ['Checking', 'Savings', 'Investments', 'Credit', 'Loan'];
  var COLS           = ['Institution', 'Display Name', 'Type', 'Category', 'Balance', 'Last Updated', 'Notes'];
  var numCols        = COLS.length;

  // Header row
  var hdr = sheet.getRange(1, 1, 1, numCols);
  hdr.setValues([COLS]);
  hdr.setFontWeight('bold').setBackground(HEADER_BG).setFontColor(HEADER_FG).setFontSize(10);

  // Group accounts
  var grouped = {};
  CATEGORY_ORDER.forEach(function(c) { grouped[c] = []; });
  accounts.forEach(function(a) { if (grouped[a.category]) grouped[a.category].push(a); });

  var row = 2;
  CATEGORY_ORDER.forEach(function(cat) {
    var items = grouped[cat];
    if (!items.length) return;

    // Category label
    var lbl = sheet.getRange(row, 1, 1, numCols);
    lbl.merge().setValue(cat.toUpperCase())
       .setFontWeight('bold').setBackground(CAT_COLOR[cat] || '#f1f5f9').setFontSize(9);
    row++;

    // Account rows
    items.forEach(function(a) {
      sheet.getRange(row, 1).setValue(a.institution  || '');
      sheet.getRange(row, 2).setValue(a.displayName  || '');
      sheet.getRange(row, 3).setValue(a.type         || '');
      sheet.getRange(row, 4).setValue(a.category     || '');
      sheet.getRange(row, 5).setValue(a.balance      || 0).setNumberFormat('$#,##0.00');
      sheet.getRange(row, 6).setValue(a.lastUpdated ? new Date(a.lastUpdated).toLocaleDateString('en-US') : '');
      sheet.getRange(row, 7).setValue(a.notes        || '');
      row++;
    });

    // Subtotal
    var catTotal = items.reduce(function(s, a) { return s + (a.balance || 0); }, 0);
    sheet.getRange(row, 1, 1, numCols).setBackground(SUBTOT_BG);
    sheet.getRange(row, 1).setValue(cat + ' Total').setFontStyle('italic');
    sheet.getRange(row, 5).setValue(catTotal).setNumberFormat('$#,##0.00')
         .setFontWeight('bold').setFontColor(catTotal >= 0 ? '#166534' : '#991b1b');
    row += 2;
  });

  // Net worth summary
  row++;
  var summaryRows = [
    ['NET WORTH SUMMARY', null],
    ['Cash (Checking)',   summary.cash],
    ['Savings',          summary.savings],
    ['Investments',      summary.investments],
    ['Credit (owed)',   -summary.credit],
    ['Loans (owed)',    -summary.loans],
    ['',                 null],
    ['NET WORTH',        summary.total],
  ];
  summaryRows.forEach(function(pair, i) {
    var r = row + i;
    var isHead = i === 0;
    var isTot  = i === summaryRows.length - 1;
    sheet.getRange(r, 1).setValue(pair[0])
         .setFontWeight(isHead || isTot ? 'bold' : 'normal')
         .setFontSize(isHead || isTot ? 11 : 10);
    if (typeof pair[1] === 'number') {
      sheet.getRange(r, 2).setValue(pair[1]).setNumberFormat('$#,##0.00')
           .setFontColor(pair[1] >= 0 ? '#166534' : '#991b1b')
           .setFontWeight(isTot ? 'bold' : 'normal').setFontSize(isTot ? 12 : 10);
    }
    if (isTot) sheet.getRange(r, 1, 1, 2).setBackground('#1e293b').setFontColor('#ffffff');
  });

  [150, 160, 80, 110, 100, 110, 200].forEach(function(w, i) { sheet.setColumnWidth(i + 1, w); });
  sheet.setFrozenRows(1);
  return '✓ Accounts synced — ' + accounts.length + ' accounts.';
}


// ═══════════════════════════════════════════════════════════════════════════════
// SYNC EXPENSES
// ═══════════════════════════════════════════════════════════════════════════════

function syncExpenses() {
  var ui = SpreadsheetApp.getUi();
  try {
    var msg = syncExpensesWorker_();
    ui.alert(msg);
  } catch (e) {
    ui.alert('Error', e.message, ui.ButtonSet.OK);
  }
}

function syncExpensesWorker_() {
  var expenses = apiRequest_('GET', '/api/expenses');

  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Expenses') || ss.insertSheet('Expenses');
  sheet.clearContents();
  sheet.clearFormats();

  var HEADER_BG = '#1e293b';
  var HEADER_FG = '#ffffff';
  var COLS      = ['Name', 'Amount', 'Monthly Equiv.', 'Category', 'Frequency', 'Person Paying', 'Notes', 'Paused'];

  // Header
  var hdr = sheet.getRange(1, 1, 1, COLS.length);
  hdr.setValues([COLS]).setFontWeight('bold').setBackground(HEADER_BG).setFontColor(HEADER_FG).setFontSize(10);

  // Group by category
  var CATEGORY_ORDER = ['Loan', 'Grocery', 'Savings', 'Health Care', 'Want', 'Car Insurance', 'Investments', 'Membership'];
  var CAT_COLOR = {
    Loan:          '#fce4ec',
    Grocery:       '#e8f5e9',
    Savings:       '#e3f2fd',
    'Health Care': '#fce4ec',
    Want:          '#f3e5f5',
    'Car Insurance': '#fff3e0',
    Investments:   '#e8eaf6',
    Membership:    '#fff8e1',
  };

  var grouped = {};
  CATEGORY_ORDER.forEach(function(c) { grouped[c] = []; });
  expenses.forEach(function(e) { if (grouped[e.category]) grouped[e.category].push(e); });

  var row = 2;
  var grandTotal = 0;

  CATEGORY_ORDER.forEach(function(cat) {
    var items = grouped[cat];
    if (!items.length) return;

    // Category label
    sheet.getRange(row, 1, 1, COLS.length).merge()
         .setValue(cat.toUpperCase())
         .setFontWeight('bold').setBackground(CAT_COLOR[cat] || '#f1f5f9').setFontSize(9);
    row++;

    var catMonthly = 0;
    items.forEach(function(e) {
      var monthly = e.frequency === 'Yearly' ? e.amount / 12 : e.amount;
      if (!e.paused) catMonthly += monthly;

      sheet.getRange(row, 1).setValue(e.name);
      sheet.getRange(row, 2).setValue(e.amount).setNumberFormat('$#,##0.00');
      sheet.getRange(row, 3).setValue(monthly).setNumberFormat('$#,##0.00');
      sheet.getRange(row, 4).setValue(e.category);
      sheet.getRange(row, 5).setValue(e.frequency);
      sheet.getRange(row, 6).setValue(e.personPaying || '');
      sheet.getRange(row, 7).setValue(e.notes || '');
      sheet.getRange(row, 8).setValue(e.paused ? 'Yes' : '');

      if (e.paused) sheet.getRange(row, 1, 1, COLS.length).setFontColor('#94a3b8');
      row++;
    });

    // Category subtotal
    sheet.getRange(row, 1, 1, COLS.length).setBackground('#f8fafc');
    sheet.getRange(row, 1).setValue(cat + ' Total').setFontStyle('italic');
    sheet.getRange(row, 3).setValue(catMonthly).setNumberFormat('$#,##0.00').setFontWeight('bold');
    grandTotal += catMonthly;
    row += 2;
  });

  // Grand total
  row++;
  sheet.getRange(row, 1, 1, COLS.length).setBackground('#1e293b').setFontColor('#ffffff');
  sheet.getRange(row, 1).setValue('TOTAL / MONTH').setFontWeight('bold').setFontSize(11).setFontColor('#ffffff');
  sheet.getRange(row, 3).setValue(grandTotal).setNumberFormat('$#,##0.00').setFontWeight('bold').setFontSize(11).setFontColor('#ffffff');

  [200, 100, 110, 120, 90, 160, 220, 70].forEach(function(w, i) { sheet.setColumnWidth(i + 1, w); });
  sheet.setFrozenRows(1);
  return '✓ Expenses synced — ' + expenses.length + ' expenses.';
}


// ═══════════════════════════════════════════════════════════════════════════════
// SYNC TRANSACTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function syncTransactions() {
  var ui = SpreadsheetApp.getUi();

  // Ask which month to sync (default: current month)
  var now          = new Date();
  var defaultMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
  var result = ui.prompt(
    'Sync Transactions',
    'Enter month (YYYY-MM):',
    ui.ButtonSet.OK_CANCEL
  );
  if (result.getSelectedButton() !== ui.Button.OK) return;

  var month = result.getResponseText().trim() || defaultMonth;
  if (!/^\d{4}-\d{2}$/.test(month)) {
    ui.alert('Invalid format. Use YYYY-MM (e.g. 2026-01).');
    return;
  }

  try {
    var msg = syncTransactionsWorker_(month);
    ui.alert(msg);
  } catch (e) {
    ui.alert('Error', e.message, ui.ButtonSet.OK);
  }
}

function syncTransactionsWorker_(month) {
  var transactions = apiRequest_('GET', '/api/transactions?month=' + month);

  var MONTH_NAMES = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December'];
  var parts     = month.split('-');
  var sheetName = MONTH_NAMES[parseInt(parts[1], 10) - 1] + ' ' + parts[0];

  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);
  sheet.clearContents();
  sheet.clearFormats();

  var HEADER_BG = '#1e293b';
  var HEADER_FG = '#ffffff';
  var COLS      = ['Date', 'Account', 'Description', 'Category', 'CR/DR', 'Amount'];

  // Header
  var hdr = sheet.getRange(1, 1, 1, COLS.length);
  hdr.setValues([COLS]).setFontWeight('bold').setBackground(HEADER_BG).setFontColor(HEADER_FG).setFontSize(10);

  var CRDR_COLOR = { Debit: '#dcfce7', Credit: '#fee2e2' };

  // Data rows
  transactions.forEach(function(t, i) {
    var row = i + 2;
    var d   = new Date(t.date);
    sheet.getRange(row, 1).setValue(d.toLocaleDateString('en-US'));
    sheet.getRange(row, 2).setValue(t.account      || '');
    sheet.getRange(row, 3).setValue(t.description  || '');
    sheet.getRange(row, 4).setValue(t.category     || '');
    sheet.getRange(row, 5).setValue(t.crDr         || '');
    sheet.getRange(row, 6).setValue(t.amount       || 0).setNumberFormat('$#,##0.00');

    var bg = CRDR_COLOR[t.crDr] || '#ffffff';
    sheet.getRange(row, 5).setBackground(bg);
  });

  // Period summary below data
  var summaryRow = transactions.length + 3;
  var income  = transactions.filter(function(t) { return t.crDr === 'Debit'  && t.category === 'Income'; })
                            .reduce(function(s, t) { return s + t.amount; }, 0);
  var spent   = transactions.filter(function(t) { return t.crDr === 'Credit'; })
                            .reduce(function(s, t) { return s + t.amount; }, 0);
  var saved   = transactions.filter(function(t) { return t.crDr === 'Debit' && t.category === 'Savings'; })
                            .reduce(function(s, t) { return s + t.amount; }, 0);

  [['Income', income, '#166534'], ['Spent', spent, '#991b1b'], ['Saved', saved, '#1e40af']].forEach(function(row, i) {
    var r = summaryRow + i;
    sheet.getRange(r, 1).setValue(row[0]).setFontWeight('bold');
    sheet.getRange(r, 2).setValue(row[1]).setNumberFormat('$#,##0.00').setFontColor(row[2]).setFontWeight('bold');
  });

  [100, 160, 220, 140, 70, 100].forEach(function(w, i) { sheet.setColumnWidth(i + 1, w); });
  sheet.setFrozenRows(1);
  return '✓ ' + sheetName + ' synced — ' + transactions.length + ' transactions.';
}


// ═══════════════════════════════════════════════════════════════════════════════
// TRANSACTION SIDEBAR
// ═══════════════════════════════════════════════════════════════════════════════

function showTransactionSidebar() {
  var html = HtmlService.createHtmlOutputFromFile('TransactionSidebar')
    .setTitle('Add Transaction')
    .setWidth(380);
  SpreadsheetApp.getUi().showSidebar(html);
}

/** Called by the sidebar to populate account dropdowns. */
function getAccounts() {
  return apiRequest_('GET', '/api/accounts');
}

/** Called by the sidebar to submit a transaction. */
function submitTransaction(payload) {
  return apiRequest_('POST', '/api/transactions', payload);
}