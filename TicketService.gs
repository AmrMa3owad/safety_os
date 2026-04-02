/**
 * SafetyOS | Ultimate IRT — Ticket Service
 * Handles ticket CRUD and history retrieval.
 * Depends on: Config, SpreadsheetService
 */

/**
 * Appends a ticket record to Ticket_History.
 * @param {Object} data - { blissLink, status, startTime, endTime? }
 * @return {{ success: boolean, row: number, recordedAt: string }}
 */function logTicket(data) {
  try {
    // 1. Precise Validation
    validateTicketPayload(data);

    var sheet = _ensureTicketSheet_();
    var tz = _getSpreadsheet_().getSpreadsheetTimeZone();
    var now = new Date();

    // 2. Time Intelligence Restoration
    var blissLink = (data.blissLink || data.link || '').toString().trim();
    var status = (data.status || 'Open').toString();
    
    // Parse startTime from client or fallback to now
    var startTime = data.startTime ? new Date(data.startTime) : now;
    if (isNaN(startTime.getTime())) startTime = now;
    
    var endTime = null;
    var durationMin = '';
    
    // If Solved, compute metrics
    if (status.toLowerCase() === 'solved') {
      endTime = now;
      durationMin = Math.round(((endTime.getTime() - startTime.getTime()) / 60000) * 10) / 10;
      if (durationMin < 0) durationMin = 0;
    }

    // 3. Shift-Anchoring: Use client-provided date or fallback to calendar today
    // This is the "Global Logic" that preserves graveyard shifts.
    var operationalDate = data.operationalDate || Utilities.formatDate(now, tz, 'yyyy-MM-dd');

    // ⚡ HIGH-SPEED LOCAL WRITE
    var rowData = [
      operationalDate,
      blissLink,
      status,
      Utilities.formatDate(startTime, tz, 'HH:mm:ss'),
      endTime ? Utilities.formatDate(endTime, tz, 'HH:mm:ss') : '',
      durationMin,
      now.toISOString(),
      Session.getActiveUser().getEmail() || 'Unknown Agent'
    ];
    sheet.getRange(sheet.getLastRow() + 1, 1, 1, rowData.length).setValues([rowData]);

    // ── ⚡ DUAL-SYNC OVERDRIVE ──────────────────────────────────────
    var masterId = CONFIG.MASTER_LOG_SHEET_ID;
    var syncUrl  = CONFIG.MASTER_SYNC_ENDPOINT;

    // TIER 1: DIRECT-TO-DISK (Admin Path)
    try {
      var masterSs = SpreadsheetApp.openById(masterId);
      var masterSheet = masterSs.getSheetByName("Users");
      if (masterSheet) {
        masterSheet.appendRow([
          Session.getActiveUser().getEmail() || 'Unknown',
          blissLink,
          status,
          Utilities.formatDate(now, "Africa/Cairo", "M/d/yyyy HH:mm:ss"),
          Utilities.formatDate(new Date(operationalDate), "Africa/Cairo", "M/d/yyyy"),
          Utilities.formatDate(now, "Africa/Cairo", "HH:00")
        ]);
      }
    } catch (e) {
      // TIER 2: AUTHENTICATED BRIDGE (Agent Path)
      if (syncUrl && syncUrl.length > 20) {
        UrlFetchApp.fetch(syncUrl, {
          method:             'post',
          contentType:        'application/json',
          headers:            { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
          payload:            JSON.stringify({ 
            agentEmail: Session.getActiveUser().getEmail() || 'Unknown Agent', 
            blissLink:  blissLink, // ⚡ FIXED LABEL
            status:     status,
            operationalDate: operationalDate
          }),
          muteHttpExceptions: true,
          followRedirects:    true
        });
      }
    }

    return { 
      success: true, 
      row: sheet.getLastRow(), 
      recordedAt: now.toISOString() 
    };

  } catch (err) {
    throw new Error('logTicket failed: ' + (err.message || String(err)));
  }
}

/**
 * Returns ticket history rows (optionally filtered by date range).
 * @param {string} [fromISO] - Start date (inclusive)
 * @param {string} [toISO] - End date (inclusive)
 * @return {{ success: boolean, rows: Array }}
 */
function getTicketHistory(fromISO, toISO) {
  try {
    var sheet = _ensureTicketSheet_();
    var vals = sheet.getDataRange().getValues();
    if (vals.length <= 1) return { success: true, rows: [] };

    var headers = vals[0];
    var tz = _getSpreadsheet_().getSpreadsheetTimeZone();

    var rows = vals.slice(1).map(function(r, idx) {
      try {
        var dStr = r[0] ? Utilities.formatDate(new Date(r[0]), tz, 'yyyy-MM-dd') : '';

        var sTime = r[3];
        var eTime = r[4];

        // Helper to ensure HH:mm:ss string
        var toTimeStr = function(v) {
          if (!v) return '';
          if (v instanceof Date) return Utilities.formatDate(v, tz, 'HH:mm:ss');
          if (String(v).indexOf('T') !== -1) {
            try {
              return Utilities.formatDate(new Date(v), tz, 'HH:mm:ss');
            } catch(e) { return ''; }
          }
          return String(v);
        };

        return {
          Date: dStr,
          BlissLink: r[1] || '',
          Status: r[2] || 'Open',
          StartTime: toTimeStr(sTime),
          EndTime: toTimeStr(eTime),
          DurationMin: r[5] !== undefined && r[5] !== null && r[5] !== '' ? r[5] : '',
          RecordedAtISO: r[6] || ''
        };
      } catch (e) {
        return null;
      }
    }).filter(function(r) { return r !== null; });

    // Filter by date range if provided
    if (fromISO || toISO) {
      var fromDate = fromISO ? (fromISO.indexOf('T') > -1 ? fromISO.split('T')[0] : fromISO) : null;
      var toDate = toISO ? (toISO.indexOf('T') > -1 ? toISO.split('T')[0] : toISO) : null;

      return { success: true, rows: rows.filter(function(r) {
        if (fromDate && r.Date < fromDate) return false;
        if (toDate && r.Date > toDate) return false;
        return true;
      }).slice(0, CONFIG.HISTORY_ROW_LIMIT)};
    }

    return { success: true, rows: rows.slice(0, CONFIG.HISTORY_ROW_LIMIT) };

  } catch (err) {
    throw new Error('getTicketHistory failed: ' + err.message);
  }
}
