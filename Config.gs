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
  MASTER_LOG_SHEET_ID:   '18te3yBWuPr3b26jbGJVFMzJbSxJ44UGtncL9M0ca34c',
  MASTER_LOG_SHEET_NAME: 'Users',
  /**
   * Admin’s Safety OS exec URL — agent copies paste this so their tickets reach the master sheet.
   * Agents have viewer-only access to the sheet, so they cannot write directly.
   * The admin deployment receives their POST and writes on their behalf (runs as admin).
   * Get URL: GAS Editor → Deploy → Manage Deployments → copy the /exec URL.
   */
  MASTER_SYNC_ENDPOINT:  'https://script.google.com/a/macros/ext.uber.com/s/AKfycbyYWTpVIK9JHe8qSHfXgAnUSWZYk9bkdz3hFU_8zs1m1EJJ8XUED5a76p131-zyuhcheg/exec',
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
  // Note: Shift boundaries are computed dynamically by the God-Mode engine (6-hour gap rule).
  // OPERATIONAL_DAY_START_HOUR is no longer used.

  // ── AI Agent (Google Gemini) ───────────────────────────────────────────────
  // Get your FREE API key: https://aistudio.google.com/app/apikey
  // Keys are now stored securely in Script Properties. Do NOT hardcode them here.
  // To update: Extensions > Apps Script > Project Settings > Script Properties > add "GEMINI_API_KEYS"
  get GEMINI_API_KEY() {
    try {
      return PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEYS') || '';
    } catch (e) {
      return '';
    }
  },
  GEMINI_MODEL: 'gemini-flash-latest'  // Explicit version tag to prevent API Not Found errors
};
