/**
 * SafetyOS | Ultimate IRT — Scenario Service
 * Loads scenario data from non-excluded sheets.
 * Depends on: Config, SpreadsheetService, CellParser
 */

/**
 * Loads all scenario data from non-excluded sheets (plain + HTML with links for SR).
 * Each item now includes rowIndex (1-based sheet row) for CRUD operations.
 * @return {Object.<string, Array>}
 */
function getData() {
  try {
    SpreadsheetApp.flush(); // 🔥 Ensure all pending writes are committed before reading
    var ss = _getSpreadsheet_();
    var sheets = ss.getSheets();
    var result = {};

    for (var s = 0; s < sheets.length; s++) {
      var sheet = sheets[s];
      var name = sheet.getName();
      if (CONFIG.EXCLUDED_SHEETS.indexOf(name) !== -1) continue;

      try {
        var dataRange = sheet.getDataRange();
        var numRows = dataRange.getNumRows();
        if (numRows < 2) continue;

        var vals = dataRange.getValues();
        var output = [];

        for (var r = 1; r < numRows; r++) {
          var row = vals[r];
          var scenario = (row[CONFIG.SCENARIO_COL] || '').toString().trim() || 'Unnamed';
          if (!scenario || scenario === 'Unnamed') continue;

          var reply = { plain: (row[CONFIG.REPLY_COL] || '').toString().trim(), html: '' };
          var internalNote = { plain: (row[CONFIG.INTERNAL_NOTE_COL] || '').toString().trim(), html: '' };
          var eaterNote = { plain: (row[CONFIG.EATER_NOTE_COL] || '').toString().trim() || 'N/A', html: '' };
          var resNote = { plain: (row[CONFIG.RES_NOTE_COL] || '').toString().trim() || 'N/A', html: '' };

          try {
            var sheetRow = r + 1;
            var richRange = sheet.getRange(sheetRow, CONFIG.DATA_COLS_START, 1, 4);
            for (var c = 0; c < 4; c++) {
              var cell = richRange.getCell(1, c + 1);
              var extracted = _extractCellWithLinks_(cell);
              // Only override the plain-text fallback when rich extraction returned real content
              var hasRich = extracted && (extracted.plain || extracted.html);
              if (c === 0) {
                if (hasRich) reply = extracted;
              } else if (c === 1) {
                if (hasRich) internalNote = extracted;
              } else if (c === 2) {
                if (hasRich) eaterNote = extracted;
                if (!eaterNote.plain) eaterNote.plain = 'N/A';
              } else {
                if (hasRich) resNote = extracted;
                if (!resNote.plain) resNote.plain = 'N/A';
              }
            }
          } catch (richErr) {
            // Rich text fallback fails silently
          }

          output.push({
            rowIndex: r + 1,          // ← 1-based sheet row for CRUD
            scenario: scenario,
            reply: reply.plain,
            replyHtml: reply.html || reply.plain,
            internalNote: internalNote.plain,
            internalNoteHtml: internalNote.html || internalNote.plain,
            eaterNote: eaterNote.plain,
            eaterNoteHtml: eaterNote.html || eaterNote.plain,
            resNote: resNote.plain,
            resNoteHtml: resNote.html || resNote.plain
          });
        }

        result[name] = output;
      } catch (err) {
        // Silently fail sheet processing
      }
    }
    return result;
  } catch (err) {
    return {};
  }
}

/**
 * Updates an existing scenario row in the spreadsheet.
 * @param {Object} payload - { sheetName, rowIndex, scenario, reply, internalNote, eaterNote, resNote }
 * @return {Object} { success: true } or throws
 */
function updateScenario(payload) {
  try {
    // Centralized validation — fail fast, no corruption
    validateScenarioPayload(payload, 'update');

    var ss = _getSpreadsheet_();
    var sheet = ss.getSheetByName(payload.sheetName);
    if (!sheet) throw new Error('Sheet not found: ' + payload.sheetName);

    var row = parseInt(payload.rowIndex, 10);
    // Values: Scenario, Reply, Internal Note, Eater Note, Res Note
    var values = [[
      (payload.scenario    || '').toString().trim(),
      (payload.reply       || '').toString().trim(),
      (payload.internalNote|| '').toString().trim(),
      (payload.eaterNote   || '').toString().trim(),
      (payload.resNote     || '').toString().trim()
    ]];
    sheet.getRange(row, 1, 1, 5).setValues(values);
    SpreadsheetApp.flush();
    return { success: true };
  } catch (e) {
    throw new Error('updateScenario failed: ' + (e.message || String(e)));
  }
}

/**
 * Appends a new scenario row to the spreadsheet.
 * @param {Object} payload - { sheetName, scenario, reply, internalNote, eaterNote, resNote }
 * @return {Object} { success: true, newRowIndex }
 */
function addScenario(payload) {
  try {
    // Centralized validation
    validateScenarioPayload(payload, 'add');

    var ss = _getSpreadsheet_();
    var sheet = ss.getSheetByName(payload.sheetName);
    if (!sheet) throw new Error('Sheet not found: ' + payload.sheetName);

    var newRow = [
      (payload.scenario    || '').toString().trim(),
      (payload.reply       || '').toString().trim(),
      (payload.internalNote|| '').toString().trim(),
      (payload.eaterNote   || '').toString().trim(),
      (payload.resNote     || '').toString().trim()
    ];
    sheet.appendRow(newRow);
    SpreadsheetApp.flush();
    var newRowIndex = sheet.getLastRow();
    return { success: true, newRowIndex: newRowIndex };
  } catch (e) {
    throw new Error('addScenario failed: ' + (e.message || String(e)));
  }
}

/**
 * Deletes a scenario row from the spreadsheet.
 * @param {Object} payload - { sheetName, rowIndex }
 * @return {Object} { success: true }
 */
function deleteScenario(payload) {
  try {
    // Centralized validation
    validateDeletePayload(payload);

    var ss = _getSpreadsheet_();
    var sheet = ss.getSheetByName(payload.sheetName);
    if (!sheet) throw new Error('Sheet not found: ' + payload.sheetName);

    var row = parseInt(payload.rowIndex, 10);

    sheet.deleteRow(row);
    SpreadsheetApp.flush();
    return { success: true };
  } catch (e) {
    throw new Error('deleteScenario failed: ' + (e.message || String(e)));
  }
}
