/**
 * Expenses.gs — CRUD operations on the Expenses sheet tab.
 *
 * Columns: A=ID, B=Date, C=Description, D=Amount, E=PaidBy, F=SplitScheme,
 *          G=SplitMembers(JSON), H=CreatedAt, I=CreatedBy, J=Month,
 *          K=Location, L=CustomWeights(JSON)
 */

/**
 * Get all expenses for a given month (YYYY-MM format).
 */
function getExpenses(month) {
  var sheet = getSpreadsheet().getSheetByName('Expenses');
  var data = sheet.getDataRange().getValues();
  var expenses = [];

  // Skip header row
  for (var i = 1; i < data.length; i++) {
    // Derive month from the date column (B) to avoid type mismatch issues
    // Google Sheets may store dates as Date objects or month as auto-formatted
    var rowMonth = getMonthFromRow(data[i]);
    if (rowMonth === month) {
      var customWeights = data[i][11] ? JSON.parse(data[i][11]) : null;
      var dateVal = formatDate(data[i][1]);
      expenses.push({
        id: data[i][0],
        date: dateVal,
        description: data[i][2],
        amount: data[i][3],
        paidBy: data[i][4],
        splitScheme: data[i][5],
        splitMembers: JSON.parse(data[i][6]),
        createdAt: data[i][7],
        createdBy: data[i][8],
        month: rowMonth,
        location: data[i][10] || '',
        customWeights: customWeights
      });
    }
  }
  return expenses;
}

/**
 * Extract YYYY-MM from a row, trying column J first, then deriving from column B (date).
 */
function getMonthFromRow(row) {
  // Try column J (index 9) as a string
  var monthVal = row[9];
  if (monthVal) {
    if (monthVal instanceof Date) {
      // Sheets auto-converted to Date object
      var y = monthVal.getFullYear();
      var m = ('0' + (monthVal.getMonth() + 1)).slice(-2);
      return y + '-' + m;
    }
    var str = monthVal.toString().trim();
    if (/^\d{4}-\d{2}$/.test(str)) {
      return str;
    }
  }
  // Fallback: derive from date column B (index 1)
  var dateVal = row[1];
  if (dateVal instanceof Date) {
    var y = dateVal.getFullYear();
    var m = ('0' + (dateVal.getMonth() + 1)).slice(-2);
    return y + '-' + m;
  }
  if (dateVal) {
    return dateVal.toString().substring(0, 7);
  }
  return '';
}

/**
 * Format a date value (Date object or string) to YYYY-MM-DD string.
 */
function formatDate(val) {
  if (val instanceof Date) {
    var y = val.getFullYear();
    var m = ('0' + (val.getMonth() + 1)).slice(-2);
    var d = ('0' + val.getDate()).slice(-2);
    return y + '-' + m + '-' + d;
  }
  return val ? val.toString().substring(0, 10) : '';
}

/**
 * Get list of months that have expense data.
 */
function getMonthsWithData() {
  var sheet = getSpreadsheet().getSheetByName('Expenses');
  var data = sheet.getDataRange().getValues();
  var months = {};

  for (var i = 1; i < data.length; i++) {
    var m = getMonthFromRow(data[i]);
    if (m) {
      months[m] = true;
    }
  }

  return Object.keys(months).sort().reverse();
}

/**
 * Add a new expense row.
 * Expects: date, description, amount, paidBy, splitScheme, splitMembers, createdBy
 * Optional: location, customWeights
 */
function addExpense(body) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    var sheet = getSpreadsheet().getSheetByName('Expenses');
    var id = Utilities.getUuid();
    var now = new Date().toISOString();
    var date = body.date;
    var month = date.substring(0, 7); // YYYY-MM from YYYY-MM-DD

    // Validate required fields
    if (!body.description || !body.amount || !body.paidBy || !body.splitScheme || !body.splitMembers) {
      throw new Error('Missing required fields');
    }

    var amount = parseFloat(body.amount);
    if (isNaN(amount) || amount <= 0) {
      throw new Error('Amount must be a positive number');
    }

    // Validate paidBy is a known member
    var members = getActiveMembers().map(function(m) { return m.name; });
    if (members.indexOf(body.paidBy) === -1) {
      throw new Error('Unknown member: ' + body.paidBy);
    }

    // Validate splitMembers are all known members
    var splitMembers = body.splitMembers;
    for (var i = 0; i < splitMembers.length; i++) {
      if (members.indexOf(splitMembers[i]) === -1) {
        throw new Error('Unknown member in split: ' + splitMembers[i]);
      }
    }

    var row = [
      id,
      date,
      body.description,
      amount,
      body.paidBy,
      body.splitScheme,
      JSON.stringify(splitMembers),
      now,
      body.createdBy || body.paidBy,
      month,
      body.location || '',
      body.customWeights ? JSON.stringify(body.customWeights) : ''
    ];

    sheet.appendRow(row);

    return {
      id: id,
      date: date,
      description: body.description,
      amount: amount,
      paidBy: body.paidBy,
      splitScheme: body.splitScheme,
      splitMembers: splitMembers,
      createdAt: now,
      createdBy: body.createdBy || body.paidBy,
      month: month,
      location: body.location || '',
      customWeights: body.customWeights || null
    };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Delete an expense by ID.
 */
function deleteExpense(id) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    var sheet = getSpreadsheet().getSheetByName('Expenses');
    var data = sheet.getDataRange().getValues();

    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === id) {
        sheet.deleteRow(i + 1); // +1 because sheet rows are 1-indexed
        return { deleted: id };
      }
    }
    throw new Error('Expense not found: ' + id);
  } finally {
    lock.releaseLock();
  }
}

/**
 * Edit an existing expense by ID.
 * Only updates fields that are provided in the body.
 */
function editExpense(body) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    var sheet = getSpreadsheet().getSheetByName('Expenses');
    var data = sheet.getDataRange().getValues();

    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === body.id) {
        var rowIndex = i + 1; // 1-indexed

        if (body.date) {
          sheet.getRange(rowIndex, 2).setValue(body.date);
          sheet.getRange(rowIndex, 10).setValue(body.date.substring(0, 7));
        }
        if (body.description) {
          sheet.getRange(rowIndex, 3).setValue(body.description);
        }
        if (body.amount) {
          var amount = parseFloat(body.amount);
          if (isNaN(amount) || amount <= 0) {
            throw new Error('Amount must be a positive number');
          }
          sheet.getRange(rowIndex, 4).setValue(amount);
        }
        if (body.paidBy) {
          sheet.getRange(rowIndex, 5).setValue(body.paidBy);
        }
        if (body.splitScheme) {
          sheet.getRange(rowIndex, 6).setValue(body.splitScheme);
        }
        if (body.splitMembers) {
          sheet.getRange(rowIndex, 7).setValue(JSON.stringify(body.splitMembers));
        }
        if (body.location !== undefined) {
          sheet.getRange(rowIndex, 11).setValue(body.location || '');
        }
        if (body.customWeights) {
          sheet.getRange(rowIndex, 12).setValue(JSON.stringify(body.customWeights));
        }

        return { updated: body.id };
      }
    }
    throw new Error('Expense not found: ' + body.id);
  } finally {
    lock.releaseLock();
  }
}
