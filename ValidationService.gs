/**
 * SafetyOS | ValidationService.gs — Input validation layer v1.0
 * ----------------------------------------------------------------
 * SRP: The ONLY place that validates incoming data before it
 *      touches a spreadsheet.
 *      Returns { valid: true } or throws a descriptive Error.
 *
 * Principle: Fail fast with clear messages rather than silently
 *            corrupting data in the spreadsheet.
 *
 * Consumed by: TicketService.gs, ScenarioService.gs
 */

/**
 * Validate a logTicket payload.
 * @param {Object} p  - the payload object
 * @throws {Error}    if validation fails
 */
function validateTicketPayload(p) {
  if (!p || typeof p !== 'object') {
    throw new Error('ValidationError: logTicket payload must be an object');
  }

  // blissLink — required string, non-empty
  if (!p.blissLink || typeof p.blissLink !== 'string' || p.blissLink.trim() === '') {
    throw new Error('ValidationError: blissLink is required and must be a non-empty string');
  }
  
  // ⚡ RESTORED: Strict pattern check for Uber Bliss links
  var BLISS_REGEX = /^https:\/\/blissnxt\.uberinternal\.com\/.+/;
  if (!BLISS_REGEX.test(p.blissLink)) {
    throw new Error('ValidationError: Invalid Bliss link. Must start with https://blissnxt.uberinternal.com/');
  }

  if (p.blissLink.length > 2000) {
    throw new Error('ValidationError: blissLink exceeds maximum length of 2000 characters');
  }

  // status — must be one of the allowed values
  var ALLOWED_STATUSES = ['Solved', 'Awaiting', 'Open', 'Closed'];
  if (!p.status || ALLOWED_STATUSES.indexOf(p.status) === -1) {
    throw new Error('ValidationError: status must be one of: ' + ALLOWED_STATUSES.join(', ') + '. Got: ' + p.status);
  }

  // startTime — must be a valid ISO string if provided
  if (p.startTime) {
    var start = new Date(p.startTime);
    if (isNaN(start.getTime())) {
      throw new Error('ValidationError: startTime must be a valid ISO 8601 string. Got: ' + p.startTime);
    }
    // Guard against times far in the future (likely a client clock error)
    var now = new Date();
    if (start > new Date(now.getTime() + 60 * 60 * 1000)) {
      throw new Error('ValidationError: startTime cannot be in the future by more than 1 hour. Possible client clock error.');
    }
  }

  // endTime — must be a valid ISO string if provided, and after startTime
  if (p.endTime) {
    var end = new Date(p.endTime);
    if (isNaN(end.getTime())) {
      throw new Error('ValidationError: endTime must be a valid ISO 8601 string. Got: ' + p.endTime);
    }
    if (p.startTime) {
      var startCheck = new Date(p.startTime);
      if (!isNaN(startCheck.getTime()) && end < startCheck) {
        throw new Error('ValidationError: endTime cannot be before startTime');
      }
    }
  }

  // durationMin — must be a non-negative number if provided
  if (p.durationMin !== undefined && p.durationMin !== null && p.durationMin !== '') {
    var dur = parseFloat(p.durationMin);
    if (isNaN(dur) || dur < 0) {
      throw new Error('ValidationError: durationMin must be a non-negative number. Got: ' + p.durationMin);
    }
    if (dur > 720) { // Max 12 hours — allows for 9h shifts + overtime
      throw new Error('ValidationError: durationMin exceeds 720 minutes (12 hours). Value: ' + dur);
    }
  }

  return { valid: true };
}

/**
 * Validate a scenario CRUD payload (add or update).
 * @param {Object} p          - the payload object
 * @param {string} operation  - 'add' | 'update'
 * @throws {Error} if validation fails
 */
function validateScenarioPayload(p, operation) {
  if (!p || typeof p !== 'object') {
    throw new Error('ValidationError: Scenario payload must be an object');
  }

  // sheetName — required
  if (!p.sheetName || typeof p.sheetName !== 'string' || p.sheetName.trim() === '') {
    throw new Error('ValidationError: sheetName is required');
  }

  // scenario — required, reasonable length
  if (!p.scenario || typeof p.scenario !== 'string' || p.scenario.trim() === '') {
    throw new Error('ValidationError: scenario name is required');
  }
  if (p.scenario.length > 300) {
    throw new Error('ValidationError: scenario name exceeds 300 characters');
  }

  // rowIndex — required for updates
  if (operation === 'update') {
    if (p.rowIndex === undefined || p.rowIndex === null) {
      throw new Error('ValidationError: rowIndex is required for update operations');
    }
    var ri = parseInt(p.rowIndex, 10);
    if (isNaN(ri) || ri < 2) {
      throw new Error('ValidationError: rowIndex must be a valid integer >= 2. Got: ' + p.rowIndex);
    }
  }

  return { valid: true };
}

/**
 * Validate a delete payload.
 * @param {Object} p
 * @throws {Error}
 */
function validateDeletePayload(p) {
  if (!p || typeof p !== 'object') {
    throw new Error('ValidationError: Delete payload must be an object');
  }
  if (!p.sheetName || typeof p.sheetName !== 'string') {
    throw new Error('ValidationError: sheetName is required for delete operations');
  }
  var ri = parseInt(p.rowIndex, 10);
  if (isNaN(ri) || ri < 2) {
    throw new Error('ValidationError: rowIndex must be a valid integer >= 2 for delete operations. Got: ' + p.rowIndex);
  }
  return { valid: true };
}
