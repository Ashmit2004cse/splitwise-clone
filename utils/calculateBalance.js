const calculateBalances = (expenses = [], settlements = []) => {
  const balances = {};

  const getId = (val) => {
    if (!val) return "";
    if (typeof val === "object") {
      return (val._id || val.id || val).toString();
    }
    return val.toString();
  };

  // Expense balances
  for (const expense of expenses) {
    const paidBy = getId(expense.paidBy);
    if (!paidBy) continue;

    if (!balances[paidBy]) {
      balances[paidBy] = 0;
    }

    balances[paidBy] += Number(expense.amount || 0);

    if (Array.isArray(expense.splits)) {
      for (const split of expense.splits) {
        const userId = getId(split.user);
        if (!userId) continue;

        if (!balances[userId]) {
          balances[userId] = 0;
        }

        balances[userId] -= Number(split.amount || 0);
      }
    }
  }

  // Settlement balances
  for (const settlement of settlements) {
    const from = getId(settlement.from);
    const to = getId(settlement.to);
    if (!from || !to) continue;

    if (!balances[from]) {
      balances[from] = 0;
    }

    if (!balances[to]) {
      balances[to] = 0;
    }

    const settleAmt = Number(settlement.amount || 0);
    balances[from] += settleAmt;
    balances[to] -= settleAmt;
  }

  return balances;
};

module.exports = calculateBalances;