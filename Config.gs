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
   * ⚠️ Leave BLANK on the admin’s own deployment (writes directly instead).
   */
  MASTER_SYNC_ENDPOINT:  '',   // ← agents: paste admin’s Safety OS /exec URL here
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

  // ── AI Agent (Groq) ────────────────────────────────────────────────────────
  // Get your FREE key (2 min): https://console.groq.com → "Create API Key"
  // Paste it below — this stays server-side and is never visible to browsers.
  // Free quota: 14,400 requests/day (shared if you keep one key for your team)
  GROQ_API_KEY: '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',   // ← PASTE YOUR GROQ KEY HERE
  GROQ_MODEL: 'llama-3.1-8b-instant'  // Extremely fast, optimized for instant response
};
