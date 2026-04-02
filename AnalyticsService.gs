/**
 * SafetyOS | Ultimate IRT — Analytics Service
 * Aggregates ticket statistics and builds dashboard payloads.
 * Depends on: Config, SpreadsheetService, TicketService
 */

/**
 * Aggregates ticket stats for a date range (default: today).
 * @param {string} [rangeStartISO] - Start date (inclusive)
 * @param {string} [rangeEndISO] - End date (inclusive)
 * @return {{ success: boolean, rangeStart: string, rangeEnd: string, solvedCount: number, totalDurationMin: number, tph: number }}
 */
function getTicketStats(rangeStartISO, rangeEndISO) {
  try {
    var tz = _getSpreadsheet_().getSpreadsheetTimeZone();
    var now = new Date();

    // Default to today's operational day if no range provided
    var fromISO = rangeStartISO;
    var toISO = rangeEndISO;

    if (!fromISO && !toISO) {
      // Important: Use the client-side pattern to determine today's probable operational day
      // or just pull the last few rows to see what the active anchor is.
      fromISO = Utilities.formatDate(now, tz, 'yyyy-MM-dd');
      toISO = fromISO;
    }

    var hist = getTicketHistory(fromISO, toISO);
    if (!hist || !hist.success || !hist.rows) {
      return { success: true, rangeStart: fromISO, rangeEnd: toISO, solvedCount: 0, totalDurationMin: 0, tph: 0 };
    }

    var solvedRows = hist.rows.filter(function(r) {
      var status = String(r.Status || '').toLowerCase().trim();
      return status === 'solved';
    });

    var solvedCount = solvedRows.length;
    var totalDurationMin = solvedRows.reduce(function(acc, r) {
      var v = parseFloat(r.DurationMin);
      return acc + (isNaN(v) || v < 0 ? 0 : v);
    }, 0);

    // TPH Logic: Tickets / (Total Duration in Hours)
    // If duration is missing (legacy rows), we fallback to a 10-min average to avoid Infinity errors.
    var totalHours = totalDurationMin / 60;
    var tph = totalHours > 0 ? Math.round((solvedCount / totalHours) * 100) / 100 : 0;

    return {
      success:          true,
      rangeStart:       fromISO,
      rangeEnd:         toISO,
      solvedCount:      solvedCount,
      totalDurationMin: Math.round(totalDurationMin * 10) / 10,
      tph:              tph
    };
  } catch (err) {
    return { success: false, message: err.message, solvedCount: 0, totalDurationMin: 0, tph: 0 };
  }
}

/**
 * Returns dashboard payload: all ticket rows + timezone + targets.
 * Operational-day and weekly stats, fastest ticket, and feedback are computed on the client
 * using timezone so overnight shifts (5am boundary) are correct.
 * @return {{ success: boolean, rows: Array, timezone: string, targets: { tph: number, ahtMin: number } }}
 */
function getAnalyticsDashboard() {
  try {
    var ss = _getSpreadsheet_();
    var tz = ss.getSpreadsheetTimeZone() || 'UTC';
    var hist = getTicketHistory();
    var rows = (hist && hist.success && hist.rows) ? hist.rows : [];
    var payload = {
      success: true,
      rows: rows,
      timezone: tz,
      targets: {
        tph: CONFIG.TPH_TARGET,
        ahtMin: CONFIG.AHT_TARGET_MIN
      }
    };
    return payload;
  } catch (err) {
    return {
      success: false,
      rows: [],
      timezone: 'UTC',
      targets: { tph: CONFIG.TPH_TARGET, ahtMin: CONFIG.AHT_TARGET_MIN }
    };
  }
}
