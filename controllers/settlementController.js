const { db } = require("../config/firebase");

// CREATE SETTLEMENT
const createSettlement = async (req, res) => {
  try {
    const {
      groupId,
      to,
      amount,
    } = req.body;

    if (!groupId || !to || !amount) {
      return res.status(400).json({
        message:
          "groupId, to and amount are required",
      });
    }

    if (req.userId.toString() === to.toString()) {
      return res.status(400).json({
        message: "You cannot settle with yourself",
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

    const isFromMember = members.some(
      (member) =>
        member.toString() === req.userId.toString()
    );

    const isToMember = members.some(
      (member) =>
        member.toString() === to.toString()
    );

    if (!isFromMember || !isToMember) {
      return res.status(400).json({
        message: "Both users must belong to the group",
      });
    }

    const settlementRef = await db
      .collection("settlements")
      .add({
        group: groupId,
        from: req.userId,
        to,
        amount: Number(amount),
        createdAt: new Date(),
      });

    const settlementDoc = await settlementRef.get();
    const settlementData = settlementDoc.data();

    // Get FROM user details
    const fromUserDoc = await db
      .collection("users")
      .doc(settlementData.from)
      .get();

    const fromUser = fromUserDoc.exists
      ? {
          _id: fromUserDoc.id,
          id: fromUserDoc.id,
          name: fromUserDoc.data().name || "",
          email: fromUserDoc.data().email || "",
        }
      : null;

    // Get TO user details
    const toUserDoc = await db
      .collection("users")
      .doc(settlementData.to)
      .get();

    const toUser = toUserDoc.exists
      ? {
          _id: toUserDoc.id,
          id: toUserDoc.id,
          name: toUserDoc.data().name || "",
          email: toUserDoc.data().email || "",
        }
      : null;

    const populatedSettlement = {
      _id: settlementDoc.id,
      id: settlementDoc.id,
      group: settlementData.group,
      from: fromUser,
      to: toUser,
      amount: settlementData.amount,
      createdAt: settlementData.createdAt || null,
    };

    res.status(201).json({
      message: "Settlement recorded successfully",
      settlement: populatedSettlement,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// GET GROUP SETTLEMENTS
const getGroupSettlements = async (req, res) => {
  try {
    const { groupId } = req.params;

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

    const isMember = members.some(
      (member) =>
        member.toString() === req.userId.toString()
    );

    if (!isMember) {
      return res.status(403).json({
        message: "You are not a member of this group",
      });
    }

    const settlementSnapshot = await db
      .collection("settlements")
      .where("group", "==", groupId)
      .get();

    const settlements = await Promise.all(
      settlementSnapshot.docs.map(async (settlementDoc) => {
        const settlementData = settlementDoc.data();

        // Get FROM user details
        const fromUserDoc = await db
          .collection("users")
          .doc(settlementData.from)
          .get();

        const fromUser = fromUserDoc.exists
          ? {
              _id: fromUserDoc.id,
              id: fromUserDoc.id,
              name: fromUserDoc.data().name || "",
              email: fromUserDoc.data().email || "",
            }
          : null;

        // Get TO user details
        const toUserDoc = await db
          .collection("users")
          .doc(settlementData.to)
          .get();

        const toUser = toUserDoc.exists
          ? {
              _id: toUserDoc.id,
              id: toUserDoc.id,
              name: toUserDoc.data().name || "",
              email: toUserDoc.data().email || "",
            }
          : null;

        return {
          _id: settlementDoc.id,
          id: settlementDoc.id,
          group: settlementData.group,
          from: fromUser,
          to: toUser,
          amount: settlementData.amount,
          createdAt: settlementData.createdAt || null,
        };
      })
    );

    // Same behavior as .sort({ createdAt: -1 })
    settlements.sort((a, b) => {
      const dateA = a.createdAt?.toDate
        ? a.createdAt.toDate()
        : new Date(a.createdAt || 0);

      const dateB = b.createdAt?.toDate
        ? b.createdAt.toDate()
        : new Date(b.createdAt || 0);

      return dateB - dateA;
    });

    res.json(settlements);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

module.exports = {
  createSettlement,
  getGroupSettlements,
};