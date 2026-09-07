const express = require("express");

const {
  createSettlement,
  getGroupSettlements,
} = require("../controllers/settlementController");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.post(
  "/",
  authMiddleware,
  createSettlement
);

router.get(
  "/group/:groupId",
  authMiddleware,
  getGroupSettlements
);

module.exports = router;