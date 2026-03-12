// ═══════════════════════════════════════════════════════════════════════════════
// CashBud · Google Apps Script
// ═══════════════════════════════════════════════════════════════════════════════
//
// SETUP
// ─────
// 1. Open your Google Sheet.
// 2. Extensions > Apps Script — paste this file (CashBud.gs) and
//    TransactionSidebar.html into the editor.
// 3. Click the gear icon (Project Settings) > Script Properties > Add property:
//       API_BASE_URL  →  https://your-deployed-api.com
//       API_KEY       →  (optional) your SHEETS_API_KEY from .env
// 4. Save, reload the sheet — a "CashBud" menu will appear.
//
// LOCAL DEV: your API must be publicly reachable (e.g. via ngrok).
//   Run: npx ngrok http 3001  →  copy the https URL into API_BASE_URL.
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Config ──────────────────────────────────────────────────────────────────

function getConfig_() {
  var props = PropertiesService.getScriptProperties();
  return {
    baseUrl: props.getProperty('API_BASE_URL') || 'http://localhost:3001',
    apiKey:  props.getProperty('API_KEY') || '',
  };
}

// ─── HTTP helper ─────────────────────────────────────────────────────────────

function apiRequest_(method, path, body) {
  var cfg = getConfig_();
  var options = {
    method:             method,
    contentType:        'application/json',
    muteHttpExceptions: true,
    headers:            {},
  };
  if (cfg.apiKey) options.headers['x-api-key'] = cfg.apiKey;
  if (body)       options.payload = JSON.stringify(body);

  var response = UrlFetchApp.fetch(cfg.baseUrl + path, options);
  var code     = response.getResponseCode();
  var text     = response.getContentText();

  if (code >= 400) throw new Error('API error ' + code + ': ' + text);
  return JSON.parse(text);
}

// ─── Menu ─────────────────────────────────────────────────────────────────────

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('CashBud')
    .addItem('⟳  Sync Accounts',    'syncAccounts')
    .addSeparator()
    .addItem('+  Add Transaction',  'showTransactionSidebar')
    .addToUi();
}

// ═══════════════════════════════════════════════════════════════════════════════
// SYNC ACCOUNTS
// ═══════════════════════════════════════════════════════════════════════════════

function syncAccounts() {
  var ui = SpreadsheetApp.getUi();

  try {
    var accounts = apiRequest_('GET', '/api/accounts');
    var summary  = apiRequest_('GET', '/api/accounts/summary');
  } catch (e) {
    ui.alert('Error connecting to API', e.message, ui.ButtonSet.OK);
    return;
  }

  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Accounts') || ss.insertSheet('Accounts');
  sheet.clearContents();
  sheet.clearFormats();

  // ── Palette ────────────────────────────────────────────────────────────────
  var CAT_COLOR = {
    Checking:    '#e8f5e9',
    Savings:     '#e3f2fd',
    Investments: '#f3e5f5',
    Credit:      '#fff3e0',
    Loan:        '#fce4ec',
  };
  var HEADER_BG   = '#1e293b';
  var HEADER_FG   = '#ffffff';
  var SUBTOT_BG   = '#f8fafc';
  var CATEGORY_ORDER = ['Checking', 'Savings', 'Investments', 'Credit', 'Loan'];

  // ── Column headers ─────────────────────────────────────────────────────────
  var COLS = ['Institution', 'Display Name', 'Type', 'Category', 'Balance', 'Last Updated', 'Notes'];
  var numCols = COLS.length;

  var headerRange = sheet.getRange(1, 1, 1, numCols);
  headerRange.setValues([COLS]);
  headerRange.setFontWeight('bold');
  headerRange.setBackground(HEADER_BG);
  headerRange.setFontColor(HEADER_FG);
  headerRange.setFontSize(10);

  // ── Group accounts by category ─────────────────────────────────────────────
  var grouped = {};
  CATEGORY_ORDER.forEach(function(c) { grouped[c] = []; });
  accounts.forEach(function(a) {
    if (grouped[a.category]) grouped[a.category].push(a);
  });

  var row = 2;

  CATEGORY_ORDER.forEach(function(cat) {
    var items = grouped[cat];
    if (!items.length) return;

    // Category label
    var labelRange = sheet.getRange(row, 1, 1, numCols);
    labelRange.merge();
    labelRange.setValue(cat.toUpperCase());
    labelRange.setFontWeight('bold');
    labelRange.setBackground(CAT_COLOR[cat] || '#f1f5f9');
    labelRange.setFontSize(9);
    row++;

    // Account rows
    items.forEach(function(a) {
      sheet.getRange(row, 1).setValue(a.institution  || '');
      sheet.getRange(row, 2).setValue(a.displayName  || '');
      sheet.getRange(row, 3).setValue(a.type         || '');
      sheet.getRange(row, 4).setValue(a.category     || '');
      sheet.getRange(row, 5).setValue(a.balance      || 0)
           .setNumberFormat('$#,##0.00');
      sheet.getRange(row, 6).setValue(
        a.lastUpdated ? new Date(a.lastUpdated).toLocaleDateString('en-US') : ''
      );
      sheet.getRange(row, 7).setValue(a.notes || '');
      row++;
    });

    // Category subtotal
    var catTotal = items.reduce(function(s, a) { return s + (a.balance || 0); }, 0);
    var subtotRow = sheet.getRange(row, 1, 1, numCols);
    subtotRow.setBackground(SUBTOT_BG);
    sheet.getRange(row, 1).setValue(cat + ' Total').setFontStyle('italic');
    sheet.getRange(row, 5).setValue(catTotal)
         .setNumberFormat('$#,##0.00')
         .setFontWeight('bold')
         .setFontColor(catTotal >= 0 ? '#166534' : '#991b1b');
    row += 2; // blank line between groups
  });

  // ── Net Worth Summary block ────────────────────────────────────────────────
  row++;
  var summaryRows = [
    ['NET WORTH SUMMARY', null],
    ['Cash (Checking)',    summary.cash],
    ['Savings',           summary.savings],
    ['Investments',       summary.investments],
    ['Credit (owed)',    -summary.credit],
    ['Loans (owed)',     -summary.loans],
    ['',                  null],
    ['NET WORTH',         summary.total],
  ];

  summaryRows.forEach(function(pair, i) {
    var r      = row + i;
    var label  = pair[0];
    var value  = pair[1];
    var isHead = i === 0;
    var isTot  = i === summaryRows.length - 1;

    sheet.getRange(r, 1).setValue(label)
         .setFontWeight(isHead || isTot ? 'bold' : 'normal')
         .setFontSize(isHead || isTot ? 11 : 10);

    if (typeof value === 'number') {
      sheet.getRange(r, 2).setValue(value)
           .setNumberFormat('$#,##0.00')
           .setFontColor(value >= 0 ? '#166534' : '#991b1b')
           .setFontWeight(isTot ? 'bold' : 'normal')
           .setFontSize(isTot ? 12 : 10);
    }

    if (isTot) {
      sheet.getRange(r, 1, 1, 2).setBackground('#1e293b').setFontColor('#ffffff');
    }
  });

  // ── Polish ─────────────────────────────────────────────────────────────────
  sheet.setColumnWidth(1, 150);  // Institution
  sheet.setColumnWidth(2, 160);  // Display Name
  sheet.setColumnWidth(3, 80);   // Type
  sheet.setColumnWidth(4, 110);  // Category
  sheet.setColumnWidth(5, 100);  // Balance
  sheet.setColumnWidth(6, 110);  // Last Updated
  sheet.setColumnWidth(7, 200);  // Notes

  sheet.setFrozenRows(1);
  ss.setActiveSheet(sheet);

  ui.alert('✓ Accounts synced — ' + accounts.length + ' accounts loaded.');
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRANSACTION SIDEBAR — called from the HTML form
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
