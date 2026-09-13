const { db } = require("../config/firebase");
const calculateBalances = require("../utils/calculateBalance");

// Helper function to get user details
const getUserDetails = async (userId) => {
  const userDoc = await db
    .collection("users")
    .doc(userId)
    .get();

  if (!userDoc.exists) {
    return null;
  }

  const userData = userDoc.data();

  return {
    _id: userDoc.id,
    id: userDoc.id,
    name: userData.name || "",
    email: userData.email || "",
  };
};

// Helper function to populate expense
const populateExpense = async (expenseDoc) => {
  const expenseData = expenseDoc.data();

  const paidBy = await getUserDetails(expenseData.paidBy);

  const splits = Array.isArray(expenseData.splits)
    ? await Promise.all(
        expenseData.splits.map(async (split) => {
          const user = await getUserDetails(split.user);

          return {
            user,
            amount: split.amount,
          };
        })
      )
    : [];

  return {
    _id: expenseDoc.id,
    id: expenseDoc.id,
    description: expenseData.description,
    amount: expenseData.amount,
    group: expenseData.group,
    paidBy,
    splitType: expenseData.splitType,
    splits,
    createdAt: expenseData.createdAt || null,
  };
};

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

    // Get group from Firebase
    const groupDoc = await db
      .collection("groups")
      .doc(groupId)
      .get();

    if (!groupDoc.exists) {
      return res.status(404).json({
        message: "Group not found",
      });
    }

    const group = groupDoc.data();

    const groupMembers = Array.isArray(group.members)
      ? group.members
      : [];

    // Check whether current user is a group member
    const isMember = groupMembers.some(
      (memberId) =>
        memberId.toString() === req.userId.toString()
    );

    if (!isMember) {
      return res.status(403).json({
        message: "You are not a member of this group",
      });
    }

    const totalAmount = Number(amount);

    if (isNaN(totalAmount) || totalAmount <= 0) {
      return res.status(400).json({
        message: "Invalid expense amount",
      });
    }

    // If paidBy isn't supplied, current user is payer
    const payer =
      paidBy &&
      paidBy !== "undefined" &&
      paidBy !== "null" &&
      paidBy.toString().trim() !== ""
        ? paidBy
        : req.userId;

    // Check whether payer belongs to group
    const isPayerMember = groupMembers.some(
      (memberId) =>
        memberId.toString() === payer.toString()
    );

    if (!isPayerMember) {
      return res.status(400).json({
        message: "Payer must be a group member",
      });
    }

    const memberCount = groupMembers.length || 1;

    const baseSplit =
      Math.floor((totalAmount / memberCount) * 100) / 100;

    let accumulated = 0;

    const splits = groupMembers.map(
      (memberId, index) => {
        let splitVal = baseSplit;

        // Give remaining decimal amount to last member
        if (index === memberCount - 1) {
          splitVal = Number(
            (totalAmount - accumulated).toFixed(2)
          );
        } else {
          accumulated += splitVal;
        }

        return {
          user: memberId,
          amount: splitVal,
        };
      }
    );

    // Create expense in Firebase
    const expenseRef = await db
      .collection("expenses")
      .add({
        description: description.trim(),
        amount: totalAmount,
        group: groupId,
        paidBy: payer,
        splitType: "equal",
        splits,
        createdAt: new Date(),
      });

    const expenseDoc = await expenseRef.get();

    const populatedExpense =
      await populateExpense(expenseDoc);

    res.status(201).json({
      message: "Expense added successfully",
      expense: populatedExpense,
    });
  } catch (error) {
    console.error("Add expense error:", error);

    res.status(500).json({
      message: error.message,
    });
  }
};

// GET GROUP EXPENSES
const getGroupExpenses = async (req, res) => {
  try {
    // Get group
    const groupDoc = await db
      .collection("groups")
      .doc(req.params.groupId)
      .get();

    if (!groupDoc.exists) {
      return res.status(404).json({
        message: "Group not found",
      });
    }

    const group = groupDoc.data();

    const groupMembers = Array.isArray(group.members)
      ? group.members
      : [];

    // Check membership
    const isMember = groupMembers.some(
      (memberId) =>
        memberId.toString() === req.userId.toString()
    );

    if (!isMember) {
      return res.status(403).json({
        message: "You are not a group member",
      });
    }

    // Get expenses
    const snapshot = await db
      .collection("expenses")
      .where("group", "==", req.params.groupId)
      .get();

    const expenses = await Promise.all(
      snapshot.docs.map((doc) =>
        populateExpense(doc)
      )
    );

    // Sort newest first
    expenses.sort((a, b) => {
      const dateA = a.createdAt
        ? new Date(a.createdAt)
        : new Date(0);

      const dateB = b.createdAt
        ? new Date(b.createdAt)
        : new Date(0);

      return dateB - dateA;
    });

    res.json(expenses);
  } catch (error) {
    console.error("Get group expenses error:", error);

    res.status(500).json({
      message: error.message,
    });
  }
};

// GET GROUP BALANCES
const getGroupBalances = async (req, res) => {
  try {
    // Get group
    const groupDoc = await db
      .collection("groups")
      .doc(req.params.groupId)
      .get();

    if (!groupDoc.exists) {
      return res.status(404).json({
        message: "Group not found",
      });
    }

    const group = groupDoc.data();

    const groupMembers = Array.isArray(group.members)
      ? group.members
      : [];

    // Check membership
    const isMember = groupMembers.some(
      (memberId) =>
        memberId.toString() === req.userId.toString()
    );

    if (!isMember) {
      return res.status(403).json({
        message: "You are not a member of this group",
      });
    }

    // Get expenses
    const expenseSnapshot = await db
      .collection("expenses")
      .where("group", "==", req.params.groupId)
      .get();

    const expenses = expenseSnapshot.docs.map(
      (doc) => ({
        id: doc.id,
        ...doc.data(),
      })
    );

    // Get settlements
    const settlementSnapshot = await db
      .collection("settlements")
      .where("group", "==", req.params.groupId)
      .get();

    const settlements = settlementSnapshot.docs.map(
      (doc) => ({
        id: doc.id,
        ...doc.data(),
      })
    );

    // Calculate balances
    const balances = calculateBalances(
      expenses,
      settlements
    );

    // Get member details
    const members = await Promise.all(
      groupMembers.map((memberId) =>
        getUserDetails(memberId)
      )
    );

    const result = members
      .filter((member) => member !== null)
      .map((member) => ({
        user: member,
        balance: Number(
          (
            balances[member._id.toString()] || 0
          ).toFixed(2)
        ),
      }));

    res.json(result);
  } catch (error) {
    console.error("Get group balances error:", error);

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

