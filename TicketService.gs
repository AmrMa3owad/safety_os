/**
 * SafetyOS | Ultimate IRT — Ticket Service
 * Handles ticket CRUD and history retrieval.
 * Depends on: Config, SpreadsheetService
 */

/**
 * Appends a ticket record to Ticket_History.
 * @param {Object} data - { blissLink, status, startTime, endTime? }
 * @return {{ success: boolean, row: number, recordedAt: string }}
 */
function logTicket(data) {
  try {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid payload. Expected an object.');
    }

    var sheet = _ensureTicketSheet_();
    var tz = _getSpreadsheet_().getSpreadsheetTimeZone();

    var blissLink = (data.blissLink || data.link || '').toString().trim();
    var status = (data.status || 'Open').toString();

    var parseMaybe = function(v) {
      if (!v && v !== 0) return null;
      if (typeof v === 'number') return new Date(v);
      var n = Number(v);
      if (!isNaN(n) && String(v).length > 9) return new Date(n);
      var d = new Date(v);
      if (!isNaN(d.getTime())) return d;
      return null;
    };

    var startTime = parseMaybe(data.startTime) || new Date();
    var endTime = parseMaybe(data.endTime) || null;
    if (status.toLowerCase() === 'solved' && !endTime) {
      endTime = new Date();
    }

    var durationMin = '';
    if (startTime && endTime) {
      durationMin = Math.round(((endTime.getTime() - startTime.getTime()) / 60000) * 10) / 10;
      if (durationMin < 0) durationMin = 0;
    }

    var dateString = Utilities.formatDate(startTime, tz, 'yyyy-MM-dd');
    var startStr = Utilities.formatDate(startTime, tz, 'HH:mm:ss');
    var endStr = endTime ? Utilities.formatDate(endTime, tz, 'HH:mm:ss') : '';
    var recordedAt = new Date();

    var row = [
      dateString,
      blissLink,
      status,
      startStr,
      endStr,
      durationMin,
      recordedAt.toISOString(),
      Session.getActiveUser().getEmail() || 'Unknown Agent'
    ];

    sheet.appendRow(row);
    var lastRow = sheet.getLastRow();

    // ── Secondary Logging to Master Sheet ──────────────────────────────────────
    // When MASTER_SYNC_ENDPOINT is set (agent copies): POST to admin's Safety OS doPost.
    // Admin's deployment runs with editor rights and writes to master sheet on their behalf.
    // When MASTER_SYNC_ENDPOINT is blank (admin's own deployment): write directly.
    var syncEndpoint = (CONFIG.MASTER_SYNC_ENDPOINT || '').trim();
    var masterId     = (CONFIG.MASTER_LOG_SHEET_ID   || '').trim();

    if (syncEndpoint.length > 10) {
      // Agent copy: POST to admin's Safety OS exec URL (admin has editor rights)
      try {
        UrlFetchApp.fetch(syncEndpoint, {
          method:             'post',
          contentType:        'application/json',
          payload:            JSON.stringify({
            agentEmail: Session.getActiveUser().getEmail() || 'Unknown Agent',
            blissLink:  blissLink,
            status:     status,
            timestamp:  Utilities.formatDate(recordedAt, tz, 'M/d/yyyy HH:mm:ss'),
            date:       Utilities.formatDate(recordedAt, tz, 'M/d/yyyy'),
            hour:       Utilities.formatDate(recordedAt, tz, 'HH:00')
          }),
          muteHttpExceptions: true
        });
      } catch (syncErr) {
        console.error('Admin endpoint sync failed: ' + syncErr.message);
      }
    } else if (masterId.length > 10) {
      // Admin deployment: write directly (runs as admin, has editor rights)
      try {
        var masterSs    = SpreadsheetApp.openById(masterId);
        var masterSheet = masterSs.getSheetByName(CONFIG.MASTER_LOG_SHEET_NAME || 'Users');
        if (masterSheet) {
          masterSheet.appendRow([
            Session.getActiveUser().getEmail() || 'Unknown Agent',
            blissLink, status,
            Utilities.formatDate(recordedAt, tz, 'M/d/yyyy HH:mm:ss'),
            Utilities.formatDate(recordedAt, tz, 'M/d/yyyy'),
            Utilities.formatDate(recordedAt, tz, 'HH:00')
          ]);
        }
      } catch (err) {
        console.error('Direct master sheet log failed: ' + err.message);
      }
    }


    return { success: true, row: lastRow, recordedAt: recordedAt.toISOString() };

  } catch (err) {
    throw new Error('logTicket failed: ' + (err && err.message ? err.message : String(err)));
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
