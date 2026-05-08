/**
 * Email.gs — Monthly email triggers and HTML template.
 */

/**
 * Send reminder email on the 28th to all active members.
 * Includes current month data and a reminder to submit expenses.
 */
function sendReminderEmail() {
  var now = new Date();
  var month = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM');
  var groupName = getConfigValue('GROUP_NAME') || 'Expense Group';
  var currency = getConfigValue('CURRENCY') || '$';
  var sheetUrl = getConfigValue('SHEET_URL') || '';

  var result = calculateBalance(month);
  var balances = result.balances;
  var settlements = result.settlements;
  var expenses = getExpenses(month);

  var members = getActiveMembers();

  for (var i = 0; i < members.length; i++) {
    var member = members[i];
    if (!member.email) continue;

    var html = buildEmailHtml(member.name, month, groupName, currency, balances, settlements, expenses, sheetUrl, 'reminder');
    var subject = groupName + ' \u2014 ' + getMonthName(month) + ' Expense Reminder';

    MailApp.sendEmail({
      to: member.email,
      subject: subject,
      htmlBody: html
    });
  }
}

/**
 * Send final summary email on the 1st for the previous month.
 * Only sends if there were expenses in the previous month.
 */
function sendSummaryEmail() {
  var now = new Date();
  var year = now.getFullYear();
  var monthNum = now.getMonth(); // 0-indexed; on the 1st this is the new month
  if (monthNum === 0) {
    year = year - 1;
    monthNum = 12;
  }
  var month = year + '-' + ('0' + monthNum).slice(-2);

  var groupName = getConfigValue('GROUP_NAME') || 'Expense Group';
  var currency = getConfigValue('CURRENCY') || '$';
  var sheetUrl = getConfigValue('SHEET_URL') || '';

  var result = calculateBalance(month);
  var balances = result.balances;
  var settlements = result.settlements;
  var expenses = getExpenses(month);

  // Don't send if no expenses in the previous month
  if (expenses.length === 0) return;

  var members = getActiveMembers();

  for (var i = 0; i < members.length; i++) {
    var member = members[i];
    if (!member.email) continue;

    var html = buildEmailHtml(member.name, month, groupName, currency, balances, settlements, expenses, sheetUrl, 'summary');
    var subject = groupName + ' \u2014 ' + getMonthName(month) + ' Final Summary';

    MailApp.sendEmail({
      to: member.email,
      subject: subject,
      htmlBody: html
    });
  }
}

/**
 * Build HTML email body for a specific member.
 * emailType: 'reminder' or 'summary'
 */
function buildEmailHtml(memberName, month, groupName, currency, balances, settlements, expenses, sheetUrl, emailType) {
  var totalSpent = 0;
  for (var i = 0; i < expenses.length; i++) {
    totalSpent += expenses[i].amount;
  }

  var myBalance = balances[memberName] || 0;
  var mySettlements = [];
  for (var i = 0; i < settlements.length; i++) {
    if (settlements[i].from === memberName || settlements[i].to === memberName) {
      mySettlements.push(settlements[i]);
    }
  }

  var html = '';
  html += '<div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">';
  html += '<h2 style="color: #333;">' + groupName + ' \u2014 ' + getMonthName(month) + '</h2>';

  // Reminder banner
  if (emailType === 'reminder') {
    html += '<div style="background: #FFF8E1; border-left: 4px solid #FFC107; padding: 12px 15px; border-radius: 4px; margin-bottom: 20px;">';
    html += '<p style="margin: 0; color: #F57F17;"><strong>Reminder:</strong> Please submit any outstanding expenses before the end of the month.</p>';
    html += '</div>';
  }

  // Summary
  html += '<div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px;">';
  html += '<p style="margin: 5px 0;"><strong>Total group expenses:</strong> ' + currency + totalSpent.toFixed(2) + '</p>';
  html += '<p style="margin: 5px 0;"><strong>Number of expenses:</strong> ' + expenses.length + '</p>';
  html += '</div>';

  // Personal settlement
  html += '<h3 style="color: #555;">Your Settlement</h3>';
  if (mySettlements.length === 0) {
    html += '<p style="color: #4CAF50;">You\'re all settled up!</p>';
  } else {
    html += '<ul style="list-style: none; padding: 0;">';
    for (var i = 0; i < mySettlements.length; i++) {
      var s = mySettlements[i];
      if (s.from === memberName) {
        html += '<li style="padding: 8px; background: #FFF3E0; border-radius: 4px; margin: 4px 0;">You owe <strong>' + s.to + '</strong> ' + currency + s.amount.toFixed(2) + '</li>';
      } else {
        html += '<li style="padding: 8px; background: #E8F5E9; border-radius: 4px; margin: 4px 0;"><strong>' + s.from + '</strong> owes you ' + currency + s.amount.toFixed(2) + '</li>';
      }
    }
    html += '</ul>';
  }

  // All balances
  html += '<h3 style="color: #555;">All Settlements</h3>';
  if (settlements.length === 0) {
    html += '<p>No outstanding balances this month.</p>';
  } else {
    html += '<table style="width: 100%; border-collapse: collapse;">';
    html += '<tr style="background: #f0f0f0;"><th style="padding: 8px; text-align: left;">From</th><th style="padding: 8px; text-align: left;">To</th><th style="padding: 8px; text-align: right;">Amount</th></tr>';
    for (var i = 0; i < settlements.length; i++) {
      var s = settlements[i];
      html += '<tr><td style="padding: 8px; border-bottom: 1px solid #eee;">' + s.from + '</td>';
      html += '<td style="padding: 8px; border-bottom: 1px solid #eee;">' + s.to + '</td>';
      html += '<td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">' + currency + s.amount.toFixed(2) + '</td></tr>';
    }
    html += '</table>';
  }

  // Link to sheet
  if (sheetUrl) {
    html += '<p style="margin-top: 20px;"><a href="' + sheetUrl + '" style="color: #1976D2;">View full details in Google Sheets</a></p>';
  }

  html += '<hr style="border: none; border-top: 1px solid #eee; margin-top: 30px;">';
  html += '<p style="color: #999; font-size: 12px;">Sent automatically by ' + groupName + ' Expense Tracker</p>';
  html += '</div>';

  return html;
}

/**
 * Get human-readable month name from YYYY-MM string.
 */
function getMonthName(yearMonth) {
  var parts = yearMonth.split('-');
  var date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 1);
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'MMMM yyyy');
}

/**
 * Create the email triggers.
 * Run this function once manually to set up the recurring triggers.
 */
function createEmailTriggers() {
  // Delete existing triggers to avoid duplicates
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    var fn = triggers[i].getHandlerFunction();
    if (fn === 'sendReminderEmail' || fn === 'sendSummaryEmail' || fn === 'sendMonthlyEmail') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  // Reminder email: 28th at 8 AM
  ScriptApp.newTrigger('sendReminderEmail')
    .timeBased()
    .onMonthDay(28)
    .atHour(8)
    .create();

  // Summary email: 1st at 8 AM
  ScriptApp.newTrigger('sendSummaryEmail')
    .timeBased()
    .onMonthDay(1)
    .atHour(8)
    .create();
}
