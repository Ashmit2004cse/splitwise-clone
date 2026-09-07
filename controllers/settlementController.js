const Settlement = require("../models/Settlement");
const Group = require("../models/Group");

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

    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({
        message: "Group not found",
      });
    }

    const isFromMember = group.members.some(
      (member) =>
        member.toString() === req.userId.toString()
    );

    const isToMember = group.members.some(
      (member) =>
        member.toString() === to.toString()
    );

    if (!isFromMember || !isToMember) {
      return res.status(400).json({
        message: "Both users must belong to the group",
      });
    }

    const settlement = await Settlement.create({
      group: groupId,
      from: req.userId,
      to,
      amount,
    });

    const populatedSettlement =
      await settlement.populate([
        {
          path: "from",
          select: "name email",
        },
        {
          path: "to",
          select: "name email",
        },
      ]);

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

    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({
        message: "Group not found",
      });
    }

    const isMember = group.members.some(
      (member) => member.toString() === req.userId.toString()
    );

    if (!isMember) {
      return res.status(403).json({
        message: "You are not a member of this group",
      });
    }

    const settlements = await Settlement.find({ group: groupId })
      .populate("from", "name email")
      .populate("to", "name email")
      .sort({ createdAt: -1 });

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