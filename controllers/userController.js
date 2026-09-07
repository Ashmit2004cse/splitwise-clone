const User = require("../models/User");

const getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.json(user);
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

    const filter = {
      _id: { $ne: req.userId },
    };

    if (query) {
      filter.$or = [
        { name: { $regex: query, $options: "i" } },
        { email: { $regex: query, $options: "i" } },
      ];
    }

    const users = await User.find(filter)
      .select("name email")
      .limit(20);

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

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (name && name.trim()) user.name = name.trim();
    if (upiId !== undefined) user.upiId = upiId.trim();
    if (phone !== undefined) user.phone = phone.trim();

    await user.save();

    res.json({
      message: "Profile updated successfully",
      user: {
        _id: user._id,
        id: user._id,
        name: user.name,
        email: user.email,
        upiId: user.upiId || "",
        phone: user.phone || "",
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getMyProfile,
  searchUsers,
  updateProfile,
};