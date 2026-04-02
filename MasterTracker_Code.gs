/**
 * SAFETY OS MASTER TRACKER — SERVER SIDE
 * ----------------------------------------------------------------
 * ⚠️ INSTRUCTIONS:
 * 1. Paste this into your Company Master Spreadsheet script editor.
 * 2. Deploy as a Web App (Execute as: Me | Access: Anyone).
 * 3. Copy the /exec URL and paste it into CONFIG.MASTER_SYNC_ENDPOINT in Safety OS.
 * ----------------------------------------------------------------
 */

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Form');
}

/**
 * ⚡ BRIDGE RECEIVER: Allows Safety OS to log data automatically.
 */
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    submitForm(data); 
    return ContentService.createTextOutput("Success").setMimeType(ContentService.MimeType.TEXT);
  } catch (err) {
    return ContentService.createTextOutput("Error: " + err.message).setMimeType(ContentService.MimeType.TEXT);
  }
}

function getEmail() {
  return Session.getActiveUser().getEmail();
}

/**
 * ⚡ FAIL-PROOF SUBMIT: Maintains your original logic but listens for Safety OS.
 */
function submitForm(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Users");
  if (!sheet) return;

  const now = new Date();
  const timeZone = "Africa/Cairo";

  const formattedTimestamp = Utilities.formatDate(now, timeZone, "M/d/yyyy HH:mm:ss");
  const formattedDate = Utilities.formatDate(now, timeZone, "M/d/yyyy");
  const formattedHour = Utilities.formatDate(now, timeZone, "HH:00");
  
  // Use the agent's email from Safety OS if it exists; otherwise use current session
  const userEmail = data.agentEmail || Session.getActiveUser().getEmail();

  sheet.appendRow([
    userEmail,
    data.link,
    data.status,
    formattedTimestamp,  
    formattedDate,       
    formattedHour        
  ]);
}

/**
 * Stats calculation (Optimized version)
 */
function getLast12HoursStats() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Users");
  if (!sheet) return {};
  const data = sheet.getDataRange().getValues();
  const now = new Date();
  const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);
  const currentUserEmail = Session.getActiveUser().getEmail();

  const stats = {
    total: 0,
    Open: 0,
    Solved: 0,
    Execute: 0,
    Awaiting: 0,
    Open_pct: 0,
    Solved_pct: 0,
    Execute_pct: 0,
    Awaiting_pct: 0,
    links: []
  };

  for (let i = 1; i < data.length; i++) {
    const email = data[i][0];
    const tsStr = data[i][3]; // Column D
    if (!tsStr) continue;
    
    var rawTimestamp = new Date(tsStr);
    if (email === currentUserEmail && rawTimestamp >= twelveHoursAgo && rawTimestamp <= now) {
      const status = data[i][2];
      const link = data[i][1];
      stats.total++;
      if (stats[status] !== undefined) {
        stats[status]++;
      }
      stats.links.push(link);
    }
  }

  for (const status of ['Open', 'Solved', 'Execute', 'Awaiting']) {
    stats[`${status}_pct`] = stats.total ? Math.round((stats[status] / stats.total) * 100) : 0;
  }

  return stats;
}
