/**
 * Balance.gs — Balance calculation and debt settlement.
 */

/**
 * Calculate net balances for a given month.
 * Returns { balances: {name: amount}, settlements: [{from, to, amount}] }
 *
 * Positive balance = is owed money. Negative balance = owes money.
 */
function calculateBalance(month) {
  var expenses = getExpenses(month);
  var schemes = getWeightSchemes();
  var schemeMap = {};
  for (var s = 0; s < schemes.length; s++) {
    schemeMap[schemes[s].name] = schemes[s].weights;
  }

  // Net balance per person
  var balances = {};
  var members = getActiveMembers();
  for (var m = 0; m < members.length; m++) {
    balances[members[m].name] = 0;
  }

  // Process each expense
  for (var i = 0; i < expenses.length; i++) {
    var expense = expenses[i];
    var amount = expense.amount;
    var payer = expense.paidBy;
    var splitMembers = expense.splitMembers;
    // Use custom weights if present, otherwise look up the scheme
    var schemeWeights = expense.customWeights || schemeMap[expense.splitScheme] || {};

    // Get weights for included members only
    var totalWeight = 0;
    var memberWeights = {};
    for (var j = 0; j < splitMembers.length; j++) {
      var member = splitMembers[j];
      var weight = schemeWeights[member] || 1; // default weight of 1 if not in scheme
      memberWeights[member] = weight;
      totalWeight += weight;
    }

    // Credit the payer
    if (balances[payer] === undefined) balances[payer] = 0;
    balances[payer] += amount;

    // Debit each member their share
    for (var j = 0; j < splitMembers.length; j++) {
      var member = splitMembers[j];
      var share = (memberWeights[member] / totalWeight) * amount;
      if (balances[member] === undefined) balances[member] = 0;
      balances[member] -= share;
    }
  }

  // Round balances to 2 decimal places
  for (var name in balances) {
    balances[name] = Math.round(balances[name] * 100) / 100;
  }

  // Calculate simplified settlements
  var settlements = simplifyDebts(balances);

  return {
    balances: balances,
    settlements: settlements
  };
}

/**
 * Simplify debts using a greedy algorithm.
 * Input: { name: netBalance } where positive = owed, negative = owes.
 * Output: array of { from, to, amount } settlement directives.
 */
function simplifyDebts(balances) {
  var creditors = []; // positive balance (owed money)
  var debtors = [];   // negative balance (owes money)

  for (var name in balances) {
    var amount = balances[name];
    if (amount > 0.01) {
      creditors.push({ name: name, amount: amount });
    } else if (amount < -0.01) {
      debtors.push({ name: name, amount: -amount }); // store as positive
    }
  }

  // Sort descending by amount
  creditors.sort(function(a, b) { return b.amount - a.amount; });
  debtors.sort(function(a, b) { return b.amount - a.amount; });

  var settlements = [];
  var ci = 0;
  var di = 0;

  while (ci < creditors.length && di < debtors.length) {
    var transfer = Math.min(creditors[ci].amount, debtors[di].amount);
    transfer = Math.round(transfer * 100) / 100;

    if (transfer > 0.01) {
      settlements.push({
        from: debtors[di].name,
        to: creditors[ci].name,
        amount: transfer
      });
    }

    creditors[ci].amount -= transfer;
    debtors[di].amount -= transfer;

    if (creditors[ci].amount < 0.01) ci++;
    if (debtors[di].amount < 0.01) di++;
  }

  return settlements;
}
