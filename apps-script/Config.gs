/**
 * Config.gs — Sheet reading helpers
 * Reads configuration, members, and weight schemes from the spreadsheet.
 */

/**
 * Get the active spreadsheet (bound script) or by ID if running standalone.
 */
function getSpreadsheet() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

/**
 * Read a config value from the Config tab by key name.
 */
function getConfigValue(key) {
  var sheet = getSpreadsheet().getSheetByName('Config');
  var data = sheet.getDataRange().getValues();
  for (var i = 0; i < data.length; i++) {
    if (data[i][0] === key) {
      return data[i][1];
    }
  }
  return null;
}

/**
 * Get all active members from the Members tab.
 * Returns array of {name, email} objects.
 */
function getActiveMembers() {
  var sheet = getSpreadsheet().getSheetByName('Members');
  var data = sheet.getDataRange().getValues();
  var members = [];
  // Skip header row
  for (var i = 1; i < data.length; i++) {
    if (data[i][2] === true || data[i][2] === 'TRUE') {
      members.push({
        name: data[i][0],
        email: data[i][1]
      });
    }
  }
  return members;
}

/**
 * Get all weight schemes from the WeightSchemes tab.
 * Returns array of {name, weights} objects where weights is a parsed JSON object.
 */
function getWeightSchemes() {
  var sheet = getSpreadsheet().getSheetByName('WeightSchemes');
  var data = sheet.getDataRange().getValues();
  var schemes = [];
  // Skip header row
  for (var i = 1; i < data.length; i++) {
    if (data[i][0]) {
      schemes.push({
        name: data[i][0],
        weights: JSON.parse(data[i][1])
      });
    }
  }
  return schemes;
}
