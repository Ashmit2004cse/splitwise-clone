const { db } = require("../config/firebase");

// GET MY PROFILE
const getMyProfile = async (req, res) => {
  try {
    const userDoc = await db
      .collection("users")
      .doc(req.userId)
      .get();

    if (!userDoc.exists) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const userData = userDoc.data();

    // Don't send password to frontend
    const { password, ...user } = userData;

    res.json({
      _id: userDoc.id,
      id: userDoc.id,
      ...user,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// SEARCH OR LIST USERS (for adding to groups)
const searchUsers = async (req, res) => {
  try {
    const { query } = req.query;

    let queryRef = db
      .collection("users")
      .limit(20);

    // If search query exists, search by name/email
    if (query) {
      const searchQuery = query.toLowerCase();

      const snapshot = await db
        .collection("users")
        .limit(100)
        .get();

      const users = snapshot.docs
        .map((doc) => {
          const data = doc.data();

          return {
            _id: doc.id,
            id: doc.id,
            name: data.name || "",
            email: data.email || "",
          };
        })
        .filter((user) => {
          if (user.id === req.userId) return false;

          return (
            user.name.toLowerCase().includes(searchQuery) ||
            user.email.toLowerCase().includes(searchQuery)
          );
        })
        .slice(0, 20);

      return res.json(users);
    }

    // List users when no search query
    const snapshot = await queryRef.get();

    const users = snapshot.docs
      .map((doc) => {
        const data = doc.data();

        return {
          _id: doc.id,
          id: doc.id,
          name: data.name || "",
          email: data.email || "",
        };
      })
      .filter((user) => user.id !== req.userId);

    res.json(users);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// UPDATE USER PROFILE (Name, UPI ID, Phone)
const updateProfile = async (req, res) => {
  try {
    const { name, upiId, phone } = req.body;

    const userRef = db
      .collection("users")
      .doc(req.userId);

    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const updateData = {};

    if (name && name.trim()) {
      updateData.name = name.trim();
    }

    if (upiId !== undefined) {
      updateData.upiId = upiId.trim();
    }

    if (phone !== undefined) {
      updateData.phone = phone.trim();
    }

    await userRef.update(updateData);

    // Get updated user
    const updatedDoc = await userRef.get();
    const updatedUser = updatedDoc.data();

    res.json({
      message: "Profile updated successfully",
      user: {
        _id: updatedDoc.id,
        id: updatedDoc.id,
        name: updatedUser.name || "",
        email: updatedUser.email || "",
        upiId: updatedUser.upiId || "",
        phone: updatedUser.phone || "",
      },
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

module.exports = {
  getMyProfile,
  searchUsers,
  updateProfile,
};

