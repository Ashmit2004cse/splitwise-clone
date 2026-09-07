const calculateBalances = (expenses, settlements = []) => {
  const balances = {};

  // Expense balances
  for (const expense of expenses) {
    const paidBy = expense.paidBy.toString();

    if (!balances[paidBy]) {
      balances[paidBy] = 0;
    }

    balances[paidBy] += expense.amount;

    for (const split of expense.splits) {
      const userId = split.user.toString();

      if (!balances[userId]) {
        balances[userId] = 0;
      }

      balances[userId] -= split.amount;
    }
  }

  // Settlement balances
  for (const settlement of settlements) {
    const from = settlement.from.toString();
    const to = settlement.to.toString();

    if (!balances[from]) {
      balances[from] = 0;
    }

    if (!balances[to]) {
      balances[to] = 0;
    }

    balances[from] += settlement.amount;
    balances[to] -= settlement.amount;
  }

  return balances;
};

module.exports = calculateBalances;