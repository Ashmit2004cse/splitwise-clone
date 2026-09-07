const express = require("express");

const {
  getMyProfile,
  searchUsers,
  updateProfile,
} = require("../controllers/userController");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/me", authMiddleware, getMyProfile);
router.get("/search", authMiddleware, searchUsers);
router.get("/", authMiddleware, searchUsers);
router.put("/profile", authMiddleware, updateProfile);
router.put("/me", authMiddleware, updateProfile);

module.exports = router;