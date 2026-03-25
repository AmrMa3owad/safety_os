/**
 * SafetyOS | Ultimate IRT — Cell Parser
 * Pure utility functions for extracting and formatting cell content.
 * No side effects, no sheet access — SRP compliant.
 */

/**
 * Extracts plain text and HTML (with hyperlinks) from a cell.
 * Uses RichTextValue to preserve Ctrl+K / Insert Link hyperlinks from sheets.
 * @param {Range} cell - A single cell Range object
 * @return {{ plain: string, html: string }}
 */
function _extractCellWithLinks_(cell) {
  try {
    if (!cell || typeof cell.getRichTextValue !== 'function') {
      var t = (cell.getValue && cell.getValue()) ? cell.getValue().toString() : '';
      return { plain: t, html: _preserveFormat_(_escapeHtml_(t)) };
    }
    var rich = cell.getRichTextValue();
    if (!rich) return { plain: '', html: '' };
    var runs = rich.getRuns ? rich.getRuns() : null;
    if (!runs || runs.length === 0) {
      var t = rich.getText ? rich.getText() : '';
      return { plain: t, html: _preserveFormat_(_escapeHtml_(t)) };
    }
    var plain = '';
    var html = '';
    for (var i = 0; i < runs.length; i++) {
      var run = runs[i];
      var text = (run.getText ? run.getText() : '') || '';
      var url = (run.getLinkUrl && run.getLinkUrl()) ? run.getLinkUrl() : null;
      plain += text;
      var escaped = _escapeHtml_(text);
      var formatted = _preserveFormat_(escaped);
      if (url && text) {
        html += '<a href="' + _escapeHtml_(url) + '" target="_blank" rel="noopener">' + formatted + '</a>';
      } else {
        html += formatted;
      }
    }
    return { plain: plain, html: html || _preserveFormat_(plain) };
  } catch (e) {
    var t = (cell.getValue && cell.getValue()) ? cell.getValue().toString() : '';
    return { plain: t, html: _preserveFormat_(_escapeHtml_(t)) };
  }
}

/**
 * Escapes HTML special characters.
 * @param {string} s
 * @return {string}
 */
function _escapeHtml_(s) {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Preserves formatting: newlines -> <br>, multiple spaces -> &nbsp;
 * @param {string} html
 * @return {string}
 */
function _preserveFormat_(html) {
  if (!html) return '';
  return String(html)
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n/g, '<br>')
    .replace(/  +/g, function(m) { return ' ' + '\u00A0'.repeat(m.length - 1); });
}
