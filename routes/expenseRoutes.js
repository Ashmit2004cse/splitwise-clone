const express = require("express");

const {
  addExpense,
  getGroupExpenses,
  getGroupBalances,
} = require("../controllers/expenseController");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.post(
  "/",
  authMiddleware,
  addExpense
);

router.get(
  "/group/:groupId",
  authMiddleware,
  getGroupExpenses
);

router.get(
  "/group/:groupId/balances",
  authMiddleware,
  getGroupBalances
);

module.exports = router;