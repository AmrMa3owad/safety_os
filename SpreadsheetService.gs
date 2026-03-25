/**
 * SafetyOS | Ultimate IRT — Spreadsheet Service
 * Encapsulates all direct SpreadsheetApp access.
 * Other services depend on this abstraction layer.
 */

/**
 * Opens the target spreadsheet.
 * Uses CONFIG.SPREADSHEET_ID for standalone scripts,
 * or falls back to the active spreadsheet for bound scripts.
 * @return {Spreadsheet}
 */
function _getSpreadsheet_() {
  if (CONFIG.SPREADSHEET_ID) {
    return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

/**
 * Ensures the Ticket_History sheet exists and has headers.
 * Creates it with the correct schema if missing.
 * @return {Sheet}
 */
function _ensureTicketSheet_() {
  var ss = _getSpreadsheet_();
  var sheet = ss.getSheetByName(CONFIG.TICKET_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.TICKET_SHEET_NAME);
    var headers = [
      'Date',              // yyyy-MM-dd from startTime
      'Bliss Link',
      'Status',            // Solved | Open | Awaiting
      'Start Time',
      'End Time',
      'Duration (min)',
      'RecordedAt (ISO)',  // server timestamp of append
      'Agent Email'        // Session.getActiveUser().getEmail()
    ];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}
