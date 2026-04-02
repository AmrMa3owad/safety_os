/**
 * SafetyOS | Ultimate IRT — Entry Point
 * Thin façade: serves the HTML app and provides the include() helper.
 *
 * All business logic lives in dedicated service files:
 *   Config.gs            — application constants
 *   SpreadsheetService.gs — spreadsheet access layer
 *   CellParser.gs        — rich text / link extraction
 *   ScenarioService.gs   — getData()
 *   TicketService.gs     — logTicket(), getTicketHistory()
 *   AnalyticsService.gs  — getTicketStats(), getAnalyticsDashboard()
 *   DiagnosticsService.gs — getTicketSheetDiagnostics()
 */

/**
 * Serves the main HTML app.
 * @return {HtmlOutput}
 */
function doGet() {
  return HtmlService.createTemplateFromFile('Index').evaluate()
      .setTitle(CONFIG.APP_TITLE)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Includes an HTML file's content into a template.
 * @param {string} filename
 * @return {string}
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Lightweight connectivity check — client calls this to detect 502/offline state.
 * Returns immediately without touching Sheets.
 */
function ping() { return { ok: true, ts: new Date().toISOString() }; }

/**
 * Receives ticket sync POST requests from agent copies.
 * Agents have viewer-only access to the master sheet, so they POST here.
 * This deployment runs as the admin (who has editor rights) and writes on their behalf.
 *
 * Payload: { agentEmail, blissLink, status, timestamp, date, hour }
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return _postJson_({ success: false, error: 'No payload' });
    }
    var payload = JSON.parse(e.postData.contents);

    var masterId = (CONFIG.MASTER_LOG_SHEET_ID || '').trim();
    if (!masterId) return _postJson_({ success: false, error: 'MASTER_LOG_SHEET_ID not configured' });

    var masterSs    = SpreadsheetApp.openById(masterId);
    var masterSheet = masterSs.getSheetByName(CONFIG.MASTER_LOG_SHEET_NAME || 'Users');
    if (!masterSheet) return _postJson_({ success: false, error: 'Sheet not found' });

    var now = new Date();
    // Use the client's operational date (Shift-Anchor) or fallback to today
    var opDate = payload.operationalDate || Utilities.formatDate(now, "Africa/Cairo", "M/d/yyyy");

    // ⚡ HIGH-SPEED MASTER WRITE
    var rowData = [
      payload.agentEmail || 'Unknown',
      payload.blissLink  || '',
      payload.status     || 'Open',
      Utilities.formatDate(now, "Africa/Cairo", "M/d/yyyy HH:mm:ss"),
      opDate, // Column E: Operational Date (Shift Anchor)
      Utilities.formatDate(now, "Africa/Cairo", "HH:00")
    ];
    masterSheet.getRange(masterSheet.getLastRow() + 1, 1, 1, rowData.length).setValues([rowData]);

    return _postJson_({ success: true });
  } catch (err) {
    return _postJson_({ success: false, error: err.message });
  }
}

function _postJson_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Phoenix Web Search — runs on Google's servers, fully bypasses Zscaler/corporate proxies.
 * Strategy: DuckDuckGo Instant Answers → Wikipedia (w/api.php textextracts) → Wikipedia Search API
 * Debug info is returned on failure so errors appear in the chat bubble.
 *
 * @param {string} query
 * @return {Object} { found, source, title, text, url, relatedTopics } or { found:false, debug }
 */
function searchWeb(query) {
  var debugLog = [];

  try {
    // NOTE: UrlFetchApp forbids setting User-Agent — do NOT add headers here
    var options = { muteHttpExceptions: true, followRedirects: true };

    // ──────────────────────────────────────────────────────────────────────────
    // 1. DuckDuckGo Instant Answers API
    // ──────────────────────────────────────────────────────────────────────────
    try {
      var ddgUrl = 'https://api.duckduckgo.com/?q=' + encodeURIComponent(query)
                 + '&format=json&no_html=1&skip_disambig=1';
      var ddgResp = UrlFetchApp.fetch(ddgUrl, options);
      var ddgCode = ddgResp.getResponseCode();
      debugLog.push('DDG:' + ddgCode);

      if (ddgCode === 200) {
        var ddg = JSON.parse(ddgResp.getContentText());
        var ddgText = (ddg.Answer || ddg.AbstractText || ddg.Definition || '').trim();
        debugLog.push('DDGlen:' + ddgText.length);

        if (ddgText.length > 20) {
          var related = (ddg.RelatedTopics || [])
            .filter(function (t) { return t.Text && t.Text.length > 5; })
            .slice(0, 3)
            .map(function (t) { return t.Text.split(' - ')[0]; });
          return {
            found: true, source: 'DuckDuckGo',
            title: ddg.Heading || query,
            text: ddgText.length > 900 ? ddgText.slice(0, 900) + '…' : ddgText,
            url: ddg.AbstractURL || ddg.DefinitionURL || '',
            relatedTopics: related
          };
        }
      }
    } catch (e) { debugLog.push('DDGerr:' + e.message); }

    // ──────────────────────────────────────────────────────────────────────────
    // 2. Build search terms by stripping question words
    // ──────────────────────────────────────────────────────────────────────────
    var cleanQ = query
      .replace(/^(what is|what are|who is|who was|who were|how does|how do|why is|why are|when was|when did|where is|where are|define|explain|who invented|who created|who founded|who discovered|who made|who built|who wrote|what was)\s+/i, '')
      .replace(/^(the|a|an)\s+/i, '')
      .replace(/^(creator|inventor|founder|discoverer|author|writer|designer|capital|president|king|queen|leader|ceo|owner)\s+of\s+(the\s+)?/i, '')
      .replace(/^(the|a|an)\s+/i, '')
      .trim();

    var stop = 'who what when where why how the is are was did does can has have had been will for and not but with from that this were they his her our their just'.split(' ');
    var qw = query.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/)
                  .filter(function (w) { return w.length > 2 && stop.indexOf(w) < 0; });

    // Priority list: cleaner term first, then last meaningful word
    var terms = [];
    if (cleanQ) terms.push(cleanQ);
    if (qw.length > 0) {
      var lastWord = qw[qw.length - 1];
      if (lastWord !== cleanQ.toLowerCase()) terms.push(lastWord);
    }
    debugLog.push('terms:' + JSON.stringify(terms));

    // ──────────────────────────────────────────────────────────────────────────
    // 3. Wikipedia textextracts API (classic w/api.php — most reliable)
    // ──────────────────────────────────────────────────────────────────────────
    for (var i = 0; i < terms.length; i++) {
      try {
        var wUrl = 'https://en.wikipedia.org/w/api.php'
          + '?action=query&prop=extracts&exintro=1&explaintext=1&redirects=1&format=json'
          + '&titles=' + encodeURIComponent(terms[i]);
        var wResp = UrlFetchApp.fetch(wUrl, options);
        var wCode = wResp.getResponseCode();
        debugLog.push('W' + i + ':' + wCode);

        if (wCode === 200) {
          var wData = JSON.parse(wResp.getContentText());
          var pagesObj = (wData.query && wData.query.pages) ? wData.query.pages : {};
          var ids = Object.keys(pagesObj);

          for (var p = 0; p < ids.length; p++) {
            var pg = pagesObj[ids[p]];
            if (pg.missing !== undefined) { debugLog.push('W' + i + ':missing'); continue; }
            var ex = (pg.extract || '').trim();
            debugLog.push('Wex:' + ex.length);

            if (ex.length > 40) {
              return {
                found: true, source: 'Wikipedia',
                title: pg.title || terms[i],
                text: ex.length > 900 ? ex.slice(0, 900) + '…' : ex,
                url: 'https://en.wikipedia.org/wiki/' + encodeURIComponent((pg.title || terms[i]).replace(/\s/g, '_')),
                relatedTopics: []
              };
            }
          }
        }
      } catch (e) { debugLog.push('Werr' + i + ':' + e.message); }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 4. Wikipedia Search API — find the closest article title, then fetch it
    // ──────────────────────────────────────────────────────────────────────────
    try {
      var searchTerm = cleanQ || qw.join(' ') || query;
      var wsUrl = 'https://en.wikipedia.org/w/api.php?action=query&list=search&format=json'
        + '&srsearch=' + encodeURIComponent(searchTerm) + '&srlimit=2';
      var wsResp = UrlFetchApp.fetch(wsUrl, options);
      debugLog.push('WS:' + wsResp.getResponseCode());

      if (wsResp.getResponseCode() === 200) {
        var wsData = JSON.parse(wsResp.getContentText());
        var hits = (wsData.query && wsData.query.search) ? wsData.query.search : [];
        debugLog.push('WShits:' + hits.length);

        for (var h = 0; h < hits.length; h++) {
          var ptitle = hits[h].title;
          try {
            var pUrl = 'https://en.wikipedia.org/w/api.php'
              + '?action=query&prop=extracts&exintro=1&explaintext=1&format=json'
              + '&titles=' + encodeURIComponent(ptitle);
            var pResp = UrlFetchApp.fetch(pUrl, options);

            if (pResp.getResponseCode() === 200) {
              var pData = JSON.parse(pResp.getContentText());
              var pPages = (pData.query && pData.query.pages) ? pData.query.pages : {};
              var pIds = Object.keys(pPages);

              for (var pp = 0; pp < pIds.length; pp++) {
                var pPage = pPages[pIds[pp]];
                var pEx = (pPage.extract || '').trim();
                if (pEx.length > 40) {
                  return {
                    found: true, source: 'Wikipedia',
                    title: ptitle,
                    text: pEx.length > 900 ? pEx.slice(0, 900) + '…' : pEx,
                    url: 'https://en.wikipedia.org/wiki/' + encodeURIComponent(ptitle.replace(/\s/g, '_')),
                    relatedTopics: hits.slice(1, 3).map(function (r) { return r.title; })
                  };
                }
              }
            }
          } catch (e) { debugLog.push('WSperr:' + e.message); }
        }
      }
    } catch (e) { debugLog.push('WSerr:' + e.message); }

    // ──────────────────────────────────────────────────────────────────────────
    // 5. DuckDuckGo HTML Scraper — Real-time Web Search Fallback
    // ──────────────────────────────────────────────────────────────────────────
    try {
      var htmlUrl = 'https://html.duckduckgo.com/html/?q=' + encodeURIComponent(query);
      var htmlResp = UrlFetchApp.fetch(htmlUrl, options);
      var htmlCode = htmlResp.getResponseCode();
      debugLog.push('DDGHTML:' + htmlCode);
      
      if (htmlCode === 200) {
        var htmlText = htmlResp.getContentText();
        var snippets = [];
        var regex = /<a class="result__snippet[^>]*>([\s\S]*?)<\/a>/gi;
        var match;
        while ((match = regex.exec(htmlText)) !== null && snippets.length < 3) {
           var cleanSnippet = match[1].replace(/<[^>]+>/g, '').trim();
           snippets.push(cleanSnippet);
        }
        
        if (snippets.length > 0) {
           return {
             found: true,
             source: 'DuckDuckGo Live Search',
             title: query,
             text: snippets.join('\n\n---\n\n'),
             url: htmlUrl,
             relatedTopics: []
           };
        } else {
           debugLog.push('DDGHTML:NoSnippets');
        }
      }
    } catch (e) { debugLog.push('DDGHTMLerr:' + e.message); }

  } catch (e) {
    debugLog.push('OUTER:' + e.message);
  }

  // Expose debug log in the response so it appears in the chat bubble
  return { found: false, debug: debugLog.join(' | ') };
}
