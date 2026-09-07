const Payment = require("../models/Payment");
const Group = require("../models/Group");
const User = require("../models/User");
const Settlement = require("../models/Settlement");

// CREATE PAYMENT ORDER (INITIATE DIRECT PAYMENT)
const createPaymentOrder = async (req, res) => {
  try {
    const { groupId, to, amount, paymentMethod = "UPI" } = req.body;

    if (!groupId || !to || !amount) {
      return res.status(400).json({
        message: "groupId, to (recipient) and amount are required",
      });
    }

    if (req.userId.toString() === to.toString()) {
      return res.status(400).json({
        message: "You cannot pay yourself",
      });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    const isPayerInGroup = group.members.some(
      (m) => m.toString() === req.userId.toString()
    );
    const isRecipientInGroup = group.members.some(
      (m) => m.toString() === to.toString()
    );

    if (!isPayerInGroup || !isRecipientInGroup) {
      return res.status(400).json({
        message: "Both payer and recipient must belong to this group",
      });
    }

    const recipient = await User.findById(to);
    if (!recipient) {
      return res.status(404).json({ message: "Recipient user not found" });
    }

    // Generate unique transaction ID
    const transactionId = `TXN_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

    // Build UPI Payment URI (Universal UPI standard across GPay, PhonePe, Paytm, BHIM)
    const upiId = recipient.upiId || `${recipient.email.split("@")[0]}@upi`;
    const cleanAmount = Number(amount).toFixed(2);
    const upiUri = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(recipient.name)}&am=${cleanAmount}&cu=INR&tn=${encodeURIComponent(`Settlement in ${group.name}`)}`;

    // Generate dynamic QR code URL
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiUri)}`;

    const payment = await Payment.create({
      payer: req.userId,
      recipient: to,
      group: groupId,
      amount: Number(cleanAmount),
      currency: "INR",
      paymentMethod,
      status: "PENDING",
      transactionId,
      paymentNotes: `Direct web payment to ${recipient.name}`,
    });

    res.status(201).json({
      message: "Payment order created",
      transactionId,
      amount: Number(cleanAmount),
      currency: "INR",
      recipient: {
        id: recipient._id,
        name: recipient.name,
        email: recipient.email,
        upiId,
      },
      upiUri,
      qrCodeUrl,
      paymentId: payment._id,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// CONFIRM & FINALIZE DIRECT PAYMENT
const confirmPayment = async (req, res) => {
  try {
    const { transactionId, paymentMethod = "UPI" } = req.body;

    if (!transactionId) {
      return res.status(400).json({ message: "transactionId is required" });
    }

    const payment = await Payment.findOne({ transactionId });
    if (!payment) {
      return res.status(404).json({ message: "Payment transaction not found" });
    }

    if (payment.payer.toString() !== req.userId.toString()) {
      return res.status(403).json({ message: "Unauthorized payment confirmation" });
    }

    if (payment.status === "COMPLETED") {
      return res.json({
        message: "Payment was already completed",
        payment,
      });
    }

    // Automatically create and link the Settlement record in the database
    const settlement = await Settlement.create({
      group: payment.group,
      from: payment.payer,
      to: payment.recipient,
      amount: payment.amount,
    });

    payment.status = "COMPLETED";
    payment.paymentMethod = paymentMethod;
    payment.settlement = settlement._id;
    await payment.save();

    const populatedPayment = await payment.populate([
      { path: "payer", select: "name email" },
      { path: "recipient", select: "name email" },
      { path: "group", select: "name" },
    ]);

    res.json({
      message: "Payment confirmed and debt settled successfully!",
      payment: populatedPayment,
      settlement,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET USER'S PAYMENT HISTORY
const getPaymentHistory = async (req, res) => {
  try {
    const payments = await Payment.find({
      $or: [{ payer: req.userId }, { recipient: req.userId }],
    })
      .populate("payer", "name email")
      .populate("recipient", "name email")
      .populate("group", "name")
      .sort({ createdAt: -1 });

    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createPaymentOrder,
  confirmPayment,
  getPaymentHistory,
};

