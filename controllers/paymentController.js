const { db } = require("../config/firebase");

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
    const members = Array.isArray(group.members)
      ? group.members
      : [];

    const isPayerInGroup = members.some(
      (m) => m.toString() === req.userId.toString()
    );

    const isRecipientInGroup = members.some(
      (m) => m.toString() === to.toString()
    );

    if (!isPayerInGroup || !isRecipientInGroup) {
      return res.status(400).json({
        message: "Both payer and recipient must belong to this group",
      });
    }

    const recipientDoc = await db
      .collection("users")
      .doc(to)
      .get();

    if (!recipientDoc.exists) {
      return res.status(404).json({
        message: "Recipient user not found",
      });
    }

    const recipient = recipientDoc.data();

    // Generate unique transaction ID
    const transactionId = `TXN_${Date.now()}_${Math.floor(
      1000 + Math.random() * 9000
    )}`;

    // Build UPI Payment URI
    const upiId =
      recipient.upiId ||
      `${recipient.email.split("@")[0]}@upi`;

    const cleanAmount = Number(amount).toFixed(2);
    const recipientName = recipient.name || "Friend";
    const groupName = group.name || "SplitEasy";

    // Standard Universal UPI URI
    const upiUri = `upi://pay?pa=${encodeURIComponent(
      upiId
    )}&pn=${encodeURIComponent(
      recipientName
    )}&am=${cleanAmount}&cu=INR&tn=${encodeURIComponent(
      `Settlement in ${groupName}`
    )}`;

    // App-specific UPI deep links
    const phonepeUri = `phonepe://pay?pa=${encodeURIComponent(
      upiId
    )}&pn=${encodeURIComponent(
      recipientName
    )}&am=${cleanAmount}&cu=INR&tn=${encodeURIComponent(
      `Settlement in ${groupName}`
    )}`;

    const gpayUri = `tez://upi/pay?pa=${encodeURIComponent(
      upiId
    )}&pn=${encodeURIComponent(
      recipientName
    )}&am=${cleanAmount}&cu=INR&tn=${encodeURIComponent(
      `Settlement in ${groupName}`
    )}`;

    const paytmUri = `paytmmp://pay?pa=${encodeURIComponent(
      upiId
    )}&pn=${encodeURIComponent(
      recipientName
    )}&am=${cleanAmount}&cu=INR&tn=${encodeURIComponent(
      `Settlement in ${groupName}`
    )}`;

    const bhimUri = `bhim://pay?pa=${encodeURIComponent(
      upiId
    )}&pn=${encodeURIComponent(
      recipientName
    )}&am=${cleanAmount}&cu=INR&tn=${encodeURIComponent(
      `Settlement in ${groupName}`
    )}`;

    // Generate dynamic QR code URL
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
      upiUri
    )}`;

    const paymentRef = await db
      .collection("payments")
      .add({
        payer: req.userId,
        recipient: to,
        group: groupId,
        amount: Number(cleanAmount),
        currency: "INR",
        paymentMethod,
        status: "PENDING",
        transactionId,
        paymentNotes: `Direct web payment to ${recipientName}`,
        createdAt: new Date(),
      });

    res.status(201).json({
      message: "Payment order created",
      transactionId,
      amount: Number(cleanAmount),
      currency: "INR",
      recipient: {
        id: recipientDoc.id,
        name: recipientName,
        email: recipient.email,
        upiId,
      },
      upiUri,
      appLinks: {
        universal: upiUri,
        phonepe: phonepeUri,
        gpay: gpayUri,
        paytm: paytmUri,
        bhim: bhimUri,
      },
      qrCodeUrl,
      paymentId: paymentRef.id,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// CONFIRM & FINALIZE DIRECT PAYMENT
const confirmPayment = async (req, res) => {
  try {
    const {
      transactionId,
      paymentMethod = "UPI",
    } = req.body;

    if (!transactionId) {
      return res.status(400).json({
        message: "transactionId is required",
      });
    }

    const paymentSnapshot = await db
      .collection("payments")
      .where("transactionId", "==", transactionId)
      .limit(1)
      .get();

    if (paymentSnapshot.empty) {
      return res.status(404).json({
        message: "Payment transaction not found",
      });
    }

    const paymentDoc = paymentSnapshot.docs[0];
    const payment = paymentDoc.data();

    if (
      payment.payer.toString() !==
      req.userId.toString()
    ) {
      return res.status(403).json({
        message: "Unauthorized payment confirmation",
      });
    }

    if (payment.status === "COMPLETED") {
      return res.json({
        message: "Payment was already completed",
        payment: {
          _id: paymentDoc.id,
          id: paymentDoc.id,
          ...payment,
        },
      });
    }

    // Automatically create and link the Settlement record
    const settlementRef = await db
      .collection("settlements")
      .add({
        group: payment.group,
        from: payment.payer,
        to: payment.recipient,
        amount: payment.amount,
        createdAt: new Date(),
      });

    // Update payment
    await paymentDoc.ref.update({
      status: "COMPLETED",
      paymentMethod,
      settlement: settlementRef.id,
    });

    // Get payer details
    const payerDoc = await db
      .collection("users")
      .doc(payment.payer)
      .get();

    const payer = payerDoc.exists
      ? {
          _id: payerDoc.id,
          id: payerDoc.id,
          name: payerDoc.data().name || "",
          email: payerDoc.data().email || "",
        }
      : null;

    // Get recipient details
    const recipientDoc = await db
      .collection("users")
      .doc(payment.recipient)
      .get();

    const recipient = recipientDoc.exists
      ? {
          _id: recipientDoc.id,
          id: recipientDoc.id,
          name: recipientDoc.data().name || "",
          email: recipientDoc.data().email || "",
        }
      : null;

    // Get group details
    const groupDoc = await db
      .collection("groups")
      .doc(payment.group)
      .get();

    const group = groupDoc.exists
      ? {
          _id: groupDoc.id,
          id: groupDoc.id,
          name: groupDoc.data().name || "",
        }
      : null;

    const populatedPayment = {
      _id: paymentDoc.id,
      id: paymentDoc.id,
      ...payment,
      status: "COMPLETED",
      paymentMethod,
      settlement: settlementRef.id,
      payer,
      recipient,
      group,
    };

    const settlementDoc = await settlementRef.get();

    const settlement = {
      _id: settlementDoc.id,
      id: settlementDoc.id,
      ...settlementDoc.data(),
    };

    res.json({
      message: "Payment confirmed and debt settled successfully!",
      payment: populatedPayment,
      settlement,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// GET USER'S PAYMENT HISTORY
const getPaymentHistory = async (req, res) => {
  try {
    const payerSnapshot = await db
      .collection("payments")
      .where("payer", "==", req.userId)
      .get();

    const recipientSnapshot = await db
      .collection("payments")
      .where("recipient", "==", req.userId)
      .get();

    const paymentMap = new Map();

    payerSnapshot.docs.forEach((doc) => {
      paymentMap.set(doc.id, doc);
    });

    recipientSnapshot.docs.forEach((doc) => {
      paymentMap.set(doc.id, doc);
    });

    const payments = await Promise.all(
      Array.from(paymentMap.values()).map(
        async (paymentDoc) => {
          const payment = paymentDoc.data();

          // Get payer
          const payerDoc = await db
            .collection("users")
            .doc(payment.payer)
            .get();

          const payer = payerDoc.exists
            ? {
                _id: payerDoc.id,
                id: payerDoc.id,
                name: payerDoc.data().name || "",
                email: payerDoc.data().email || "",
              }
            : null;

          // Get recipient
          const recipientDoc = await db
            .collection("users")
            .doc(payment.recipient)
            .get();

          const recipient = recipientDoc.exists
            ? {
                _id: recipientDoc.id,
                id: recipientDoc.id,
                name: recipientDoc.data().name || "",
                email: recipientDoc.data().email || "",
              }
            : null;

          // Get group
          const groupDoc = await db
            .collection("groups")
            .doc(payment.group)
            .get();

          const group = groupDoc.exists
            ? {
                _id: groupDoc.id,
                id: groupDoc.id,
                name: groupDoc.data().name || "",
              }
            : null;

          return {
            _id: paymentDoc.id,
            id: paymentDoc.id,
            ...payment,
            payer,
            recipient,
            group,
          };
        }
      )
    );

    // Same behavior as .sort({ createdAt: -1 })
    payments.sort((a, b) => {
      const dateA = a.createdAt?.toDate
        ? a.createdAt.toDate()
        : new Date(a.createdAt || 0);

      const dateB = b.createdAt?.toDate
        ? b.createdAt.toDate()
        : new Date(b.createdAt || 0);

      return dateB - dateA;
    });

    res.json(payments);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

module.exports = {
  createPaymentOrder,
  confirmPayment,
  getPaymentHistory,
};