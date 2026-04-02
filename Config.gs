/**
 * SafetyOS | Ultimate IRT — Configuration
 * Single source of truth for all app constants.
 */
'use strict';

var CONFIG = {
  APP_TITLE: 'SafetyOS | Ultimate IRT',
  /** If set, use this spreadsheet ID (for standalone scripts). Get from URL: docs.google.com/spreadsheets/d/THIS_ID/edit */
  // SPREADSHEET_ID: '1U9SUmnYJldyzhiR2AxgjE8ngnS6EeWJxl4CyeDtvIog',
  /** Sheet ID of the master log spreadsheet — admin sets this; do not change in agent copies. */
  MASTER_LOG_SHEET_ID:   '1R_W3vl1noHa_mYSs33OyBV_hFMChRbZ1SY4cio7cCpY',
  MASTER_LOG_SHEET_NAME: 'Users',
  /**
   * Admin’s Safety OS exec URL — agent copies paste this so their tickets reach the master sheet.
   * Agents have viewer-only access to the sheet, so they cannot write directly.
   * The admin deployment receives their POST and writes on their behalf (runs as admin).
   * Get URL: GAS Editor → Deploy → Manage Deployments → copy the /exec URL.
   */
  MASTER_SYNC_ENDPOINT:  'https://script.google.com/macros/s/AKfycbxvRx7bRQ1QFpPfSKptAmoRYtFw9cgdNK9_ArM79QAKTmdkUU2jj3_bQgzoOJXmAA9oDw/exec',
  EXCLUDED_SHEETS: ['Important links', 'Notes', 'Ticket_History'],
  TICKET_SHEET_NAME: 'Ticket_History',
  SCENARIO_COL: 0,
  REPLY_COL: 1,
  INTERNAL_NOTE_COL: 2,
  EATER_NOTE_COL: 3,
  RES_NOTE_COL: 4,
  DATA_COLS_START: 2,
  DATA_COLS_END: 5,
  HISTORY_ROW_LIMIT: 1000,
  TPH_TARGET: 12.5,
  AHT_TARGET_MIN: 4.8,
  OPERATIONAL_DAY_START_HOUR: 5,

  // ── AI Agent (Google Gemini) ───────────────────────────────────────────────
  // Get your FREE API key: https://aistudio.google.com/app/apikey
  // Paste it below — this is explicitly server-side and never exposed to the browser.
  // Free quota: 1,500 requests/day | 1,000,000 Tokens Per Minute (TPM)
  GEMINI_API_KEY: 'AIzaSyA4zLP8nf0AbYQSslCkXXMipeq3XsEzHTY',   // ← PASTE YOUR GEMINI KEY HERE
  GEMINI_MODEL: 'gemini-flash-latest'  // Explicit version tag to prevent API Not Found errors
};
