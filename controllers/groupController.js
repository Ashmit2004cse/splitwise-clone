const Group = require("../models/Group");
const User = require("../models/User");

// CREATE GROUP
const createGroup = async (req, res) => {
  try {
    const { name, members } = req.body;

    if (!name) {
      return res.status(400).json({
        message: "Group name is required",
      });
    }

    const memberIds = Array.isArray(members) ? members : [];

    const group = await Group.create({
      name,
      createdBy: req.userId,
      members: [
        req.userId,
        ...memberIds.filter(
          (id) => id.toString() !== req.userId.toString()
        ),
      ],
    });

    const populatedGroup = await group.populate(
      "members",
      "name email"
    );

    res.status(201).json({
      message: "Group created successfully",
      group: populatedGroup,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// GET MY GROUPS
const getMyGroups = async (req, res) => {
  try {
    const groups = await Group.find({
      members: req.userId,
    })
      .populate("members", "name email")
      .populate("createdBy", "name email");

    res.json(groups);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// GET SINGLE GROUP
const getGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate("members", "name email")
      .populate("createdBy", "name email");

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

    res.json(group);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// ADD MEMBER
const addMember = async (req, res) => {
  try {
    const { email } = req.body;

    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({
        message: "Group not found",
      });
    }

    if (
      group.createdBy.toString() !==
      req.userId.toString()
    ) {
      return res.status(403).json({
        message: "Only group creator can add members",
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const isAlreadyMember = group.members.some(
      (memberId) => memberId.toString() === user._id.toString()
    );

    if (isAlreadyMember) {
      return res.status(400).json({
        message: "User already belongs to this group",
      });
    }

    group.members.push(user._id);

    await group.save();

    const populatedGroup = await group.populate(
      "members",
      "name email"
    );

    res.json({
      message: "Member added successfully",
      group: populatedGroup,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

module.exports = {
  createGroup,
  getMyGroups,
  getGroup,
  addMember,
};