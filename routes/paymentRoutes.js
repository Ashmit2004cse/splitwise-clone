const express = require("express");
const {
  createPaymentOrder,
  confirmPayment,
  getPaymentHistory,
} = require("../controllers/paymentController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/create-order", authMiddleware, createPaymentOrder);
router.post("/confirm", authMiddleware, confirmPayment);
router.get("/history", authMiddleware, getPaymentHistory);

module.exports = router;

