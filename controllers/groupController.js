const { db } = require("../config/firebase");

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

// Helper function to populate group members and creator
const populateGroup = async (groupDoc) => {
  const groupData = groupDoc.data();

  const memberIds = Array.isArray(groupData.members)
    ? groupData.members
    : [];

  const members = await Promise.all(
    memberIds.map((memberId) => getUserDetails(memberId))
  );

  const createdBy = await getUserDetails(groupData.createdBy);

  return {
    _id: groupDoc.id,
    id: groupDoc.id,
    name: groupData.name,
    createdBy,
    members: members.filter((member) => member !== null),
    createdAt: groupData.createdAt || null,
  };
};

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

    // Make sure current user is always a member
    const groupMembers = [
      req.userId,
      ...memberIds.filter(
        (id) => id.toString() !== req.userId.toString()
      ),
    ];

    const groupRef = await db.collection("groups").add({
      name,
      createdBy: req.userId,
      members: groupMembers,
      createdAt: new Date(),
    });

    const groupDoc = await groupRef.get();

    const populatedGroup = await populateGroup(groupDoc);

    res.status(201).json({
      message: "Group created successfully",
      group: populatedGroup,
    });
  } catch (error) {
    console.error("Create group error:", error);

    res.status(500).json({
      message: error.message,
    });
  }
};

// GET MY GROUPS
const getMyGroups = async (req, res) => {
  try {
    const snapshot = await db
      .collection("groups")
      .where("members", "array-contains", req.userId)
      .get();

    const groups = await Promise.all(
      snapshot.docs.map((doc) => populateGroup(doc))
    );

    res.json(groups);
  } catch (error) {
    console.error("Get groups error:", error);

    res.status(500).json({
      message: error.message,
    });
  }
};

// GET SINGLE GROUP
const getGroup = async (req, res) => {
  try {
    const groupDoc = await db
      .collection("groups")
      .doc(req.params.id)
      .get();

    if (!groupDoc.exists) {
      return res.status(404).json({
        message: "Group not found",
      });
    }

    const groupData = groupDoc.data();

    const memberIds = Array.isArray(groupData.members)
      ? groupData.members
      : [];

    const isMember = memberIds.some(
      (memberId) =>
        memberId.toString() === req.userId.toString()
    );

    if (!isMember) {
      return res.status(403).json({
        message: "You are not a member of this group",
      });
    }

    const group = await populateGroup(groupDoc);

    res.json(group);
  } catch (error) {
    console.error("Get group error:", error);

    res.status(500).json({
      message: error.message,
    });
  }
};

// ADD MEMBER
const addMember = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: "Email is required",
      });
    }

    const groupRef = db
      .collection("groups")
      .doc(req.params.id);

    const groupDoc = await groupRef.get();

    if (!groupDoc.exists) {
      return res.status(404).json({
        message: "Group not found",
      });
    }

    const groupData = groupDoc.data();

    // Check group creator
    if (
      groupData.createdBy.toString() !==
      req.userId.toString()
    ) {
      return res.status(403).json({
        message: "Only group creator can add members",
      });
    }

    // Find user by email
    const userSnapshot = await db
      .collection("users")
      .where("email", "==", email)
      .limit(1)
      .get();

    if (userSnapshot.empty) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const userDoc = userSnapshot.docs[0];

    const members = Array.isArray(groupData.members)
      ? groupData.members
      : [];

    // Check if already member
    const isAlreadyMember = members.some(
      (memberId) =>
        memberId.toString() === userDoc.id.toString()
    );

    if (isAlreadyMember) {
      return res.status(400).json({
        message: "User already belongs to this group",
      });
    }

    // Add new member
    members.push(userDoc.id);

    await groupRef.update({
      members,
    });

    // Get updated group
    const updatedGroupDoc = await groupRef.get();

    const populatedGroup = await populateGroup(
      updatedGroupDoc
    );

    res.json({
      message: "Member added successfully",
      group: populatedGroup,
    });
  } catch (error) {
    console.error("Add member error:", error);

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

