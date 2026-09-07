const Expense = require("../models/Expense");
const Group = require("../models/Group");
const Settlement = require("../models/Settlement");
const calculateBalances = require("../utils/calculateBalance");

// ADD EXPENSE
const addExpense = async (req, res) => {
  try {
    const {
      description,
      amount,
      groupId,
      paidBy,
    } = req.body;

    if (!description || !amount || !groupId) {
      return res.status(400).json({
        message:
          "Description, amount and groupId are required",
      });
    }

    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({
        message: "Group not found",
      });
    }

    const isMember = group.members.some(
      (member) =>
        member.toString() === req.userId.toString()
    );

    if (!isMember) {
      return res.status(403).json({
        message: "You are not a member of this group",
      });
    }

    const totalAmount = Number(amount);
    if (isNaN(totalAmount) || totalAmount <= 0) {
      return res.status(400).json({ message: "Invalid expense amount" });
    }

    const payer = (paidBy && paidBy !== "undefined" && paidBy !== "null" && paidBy.toString().trim() !== "")
      ? paidBy
      : req.userId;

    const isPayerMember = group.members.some(
      (member) => (member._id ? member._id.toString() : member.toString()) === payer.toString()
    );

    if (!isPayerMember) {
      return res.status(400).json({
        message: "Payer must be a group member",
      });
    }

    const memberCount = group.members.length || 1;
    const baseSplit = Math.floor((totalAmount / memberCount) * 100) / 100;
    let accumulated = 0;

    const splits = group.members.map((member, index) => {
      let splitVal = baseSplit;
      if (index === memberCount - 1) {
        splitVal = Number((totalAmount - accumulated).toFixed(2));
      } else {
        accumulated += splitVal;
      }
      return {
        user: member._id || member,
        amount: splitVal,
      };
    });

    const expense = await Expense.create({
      description: description.trim(),
      amount: totalAmount,
      group: groupId,
      paidBy: payer,
      splitType: "equal",
      splits,
    });

    const populatedExpense = await expense.populate([
      {
        path: "paidBy",
        select: "name email",
      },
      {
        path: "splits.user",
        select: "name email",
      },
    ]);

    res.status(201).json({
      message: "Expense added successfully",
      expense: populatedExpense,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// GET GROUP EXPENSES
const getGroupExpenses = async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);

    if (!group) {
      return res.status(404).json({
        message: "Group not found",
      });
    }

    const isMember = group.members.some(
      (member) =>
        member.toString() === req.userId.toString()
    );

    if (!isMember) {
      return res.status(403).json({
        message: "You are not a group member",
      });
    }

    const expenses = await Expense.find({
      group: req.params.groupId,
    })
      .populate("paidBy", "name email")
      .populate("splits.user", "name email")
      .sort({ createdAt: -1 });

    res.json(expenses);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// GET GROUP BALANCES
const getGroupBalances = async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId)
      .populate("members", "name email");

    if (!group) {
      return res.status(404).json({
        message: "Group not found",
      });
    }

    const isMember = group.members.some(
      (member) =>
        member._id.toString() === req.userId.toString()
    );

    if (!isMember) {
      return res.status(403).json({
        message: "You are not a member of this group",
      });
    }

    const expenses = await Expense.find({
      group: req.params.groupId,
    });

    const settlements = await Settlement.find({
      group: req.params.groupId,
    });

    const balances = calculateBalances(
      expenses,
      settlements
    );

    const result = group.members.map((member) => ({
      user: member,
      balance: Number(
        (balances[member._id.toString()] || 0).toFixed(2)
      ),
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

module.exports = {
  addExpense,
  getGroupExpenses,
  getGroupBalances,
};