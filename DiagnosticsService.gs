/**
 * SafetyOS | Ultimate IRT — Diagnostics Service
 * Provides diagnostic information about the Ticket_History sheet for debugging.
 * Depends on: Config, SpreadsheetService
 */

/**
 * Diagnostic: returns info about Ticket_History sheet for debugging.
 * Run from Apps Script editor or call from frontend.
 * @return {{ sheetExists: boolean, rowCount: number, hasData: boolean, spreadsheetId: string, spreadsheetName: string, headers: Array, sampleRow: Array }}
 */
function getTicketSheetDiagnostics() {
  try {
    var ss = _getSpreadsheet_();
    var allSheets = ss.getSheets().map(function(s) { return s.getName(); });
    var sheet = ss.getSheetByName(CONFIG.TICKET_SHEET_NAME);
    if (!sheet) {
      return {
        sheetExists: false,
        rowCount: 0,
        hasData: false,
        spreadsheetId: ss.getId(),
        spreadsheetName: ss.getName(),
        allSheetNames: allSheets,
        headers: [],
        sampleRow: []
      };
    }
    var vals = sheet.getDataRange().getValues();
    var rowCount = vals.length;
    var hasData = rowCount > 1;
    var headers = vals.length > 0 ? vals[0] : [];
    var sampleRow = vals.length > 1 ? vals[1] : [];
    return {
      sheetExists: true,
      rowCount: rowCount,
      hasData: hasData,
      spreadsheetId: ss.getId(),
      spreadsheetName: ss.getName(),
      headers: headers,
      sampleRow: sampleRow
    };
  } catch (e) {
    return { sheetExists: false, rowCount: 0, hasData: false, error: String(e.message) };
  }
}
