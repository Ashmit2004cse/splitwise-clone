const express = require("express");

const {
  createGroup,
  getMyGroups,
  getGroup,
  addMember,
} = require("../controllers/groupController");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", authMiddleware, createGroup);

router.get("/", authMiddleware, getMyGroups);

router.get("/:id", authMiddleware, getGroup);

router.post(
  "/:id/members",
  authMiddleware,
  addMember
);

module.exports = router;