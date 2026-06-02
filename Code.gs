/**
 * SafetyOS | Ultimate IRT — Entry Point
 * Thin façade: serves the HTML app and provides the include() helper.
 *
 * All business logic lives in dedicated service files:
 *   Config.gs            — application constants
 *   SpreadsheetService.gs — spreadsheet access layer
 *   CellParser.gs        — rich text / link extraction
 *   ScenarioService.gs   — getData()
 *   TicketService.gs     — logTicket(), getTicketHistory()
 *   AnalyticsService.gs  — getTicketStats(), getAnalyticsDashboard()
 *   DiagnosticsService.gs — getTicketSheetDiagnostics()
 */

/**
 * Serves the main HTML app.
 * @return {HtmlOutput}
 */
function doGet() {
  return HtmlService.createTemplateFromFile('Index').evaluate()
      .setTitle(CONFIG.APP_TITLE)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.SAMEORIGIN);
}

/**
 * Includes an HTML file's content into a template.
 * @param {string} filename
 * @return {string}
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Lightweight connectivity check — client calls this to detect 502/offline state.
 * Returns immediately without touching Sheets.
 */
function ping() { return { ok: true, ts: new Date().toISOString() }; }

/**
 * Receives ticket sync POST requests from agent copies.
 * Agents have viewer-only access to the master sheet, so they POST here.
 * This deployment runs as the admin (who has editor rights) and writes on their behalf.
 *
 * Payload: { agentEmail, blissLink, status, timestamp, date, hour }
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return _postJson_({ success: false, error: 'No payload' });
    }
    var payload = JSON.parse(e.postData.contents);

    var expectedToken = PropertiesService.getScriptProperties().getProperty('SYNC_TOKEN');
    if (expectedToken && payload.token !== expectedToken) {
      return _postJson_({ success: false, error: 'Unauthorized' });
    }

    var masterId = (CONFIG.MASTER_LOG_SHEET_ID || '').trim();
    if (!masterId) return _postJson_({ success: false, error: 'MASTER_LOG_SHEET_ID not configured' });

    var masterSs    = SpreadsheetApp.openById(masterId);
    var masterSheet = masterSs.getSheetByName(CONFIG.MASTER_LOG_SHEET_NAME || 'Users');
    if (!masterSheet) return _postJson_({ success: false, error: 'Sheet not found' });

    var now = new Date();
    // Neutralize shift-anchoring on this local deploy mirror, matching Master's unified calendar system!
    var opDate = Utilities.formatDate(now, "Africa/Cairo", "M/d/yyyy");

    // ⚡ HIGH-SPEED MASTER WRITE
    var rowData = [
      payload.agentEmail || 'Unknown',
      payload.link || payload.blissLink || '',
      payload.status     || 'Open',
      Utilities.formatDate(now, "Africa/Cairo", "M/d/yyyy HH:mm:ss"),
      opDate, // Column E: Calendar date 
      Utilities.formatDate(now, "Africa/Cairo", "HH:00")
    ];
    masterSheet.getRange(masterSheet.getLastRow() + 1, 1, 1, rowData.length).setValues([rowData]);

    return _postJson_({ success: true });
  } catch (err) {
    return _postJson_({ success: false, error: err.message });
  }
}

function _postJson_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
