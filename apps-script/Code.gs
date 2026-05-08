/**
 * Code.gs — Main entry point for the Web App
 * Handles doGet/doPost routing and JSON response formatting.
 */

/**
 * Handle GET requests. Routes based on 'action' query parameter.
 */
function doGet(e) {
  var action = e.parameter.action;
  var pin = e.parameter.pin;

  if (action === 'ping') {
    return jsonResponse({ success: true, data: { status: 'ok' } });
  }

  if (!validatePin(pin)) {
    return jsonResponse({ success: false, error: 'Invalid PIN' });
  }

  switch (action) {
    case 'getMembers':
      return jsonResponse({ success: true, data: getActiveMembers() });

    case 'getSchemes':
      return jsonResponse({ success: true, data: getWeightSchemes() });

    case 'getExpenses':
      var month = e.parameter.month;
      if (!month) {
        return jsonResponse({ success: false, error: 'Missing month parameter (YYYY-MM)' });
      }
      return jsonResponse({ success: true, data: getExpenses(month) });

    case 'getBalance':
      var month = e.parameter.month;
      if (!month) {
        return jsonResponse({ success: false, error: 'Missing month parameter (YYYY-MM)' });
      }
      return jsonResponse({ success: true, data: calculateBalance(month) });

    case 'getMonths':
      return jsonResponse({ success: true, data: getMonthsWithData() });

    default:
      return jsonResponse({ success: false, error: 'Unknown action: ' + action });
  }
}

/**
 * Handle POST requests. Routes based on 'action' field in JSON body.
 */
function doPost(e) {
  var body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonResponse({ success: false, error: 'Invalid JSON body' });
  }

  if (!validatePin(body.pin)) {
    return jsonResponse({ success: false, error: 'Invalid PIN' });
  }

  switch (body.action) {
    case 'addExpense':
      return jsonResponse({ success: true, data: addExpense(body) });

    case 'deleteExpense':
      if (!body.id) {
        return jsonResponse({ success: false, error: 'Missing expense id' });
      }
      return jsonResponse({ success: true, data: deleteExpense(body.id) });

    case 'editExpense':
      if (!body.id) {
        return jsonResponse({ success: false, error: 'Missing expense id' });
      }
      return jsonResponse({ success: true, data: editExpense(body) });

    default:
      return jsonResponse({ success: false, error: 'Unknown action: ' + body.action });
  }
}

/**
 * Create a JSON response for the Web App.
 */
function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
