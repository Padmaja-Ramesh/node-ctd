const express = require("express");
const {
  getUserAnalytics,
  searchTasks,
  getUsersWithStats,
} = require("../controllers/analyticsController");

const {
  authenticateUser,
  authorizeRoles,
  authorizeOwnerOrAdmin,
} = require("../middleware/auth");

const router = express.Router();

router.get(
  "/users/stats",
  authenticateUser,
  authorizeRoles("ADMIN"),
  getUsersWithStats,
);

router.get(
  "/users/:id",
  authenticateUser,
  authorizeOwnerOrAdmin,
  getUserAnalytics,
);

router.get("/tasks/search", authenticateUser, searchTasks);

module.exports = router;
