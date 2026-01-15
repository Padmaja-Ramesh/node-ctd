const express = require("express");
const {
  getUserAnalytics,
  searchTasks,
  getUsersWithStats,
} = require("../controllers/analyticsController");

const router = express.Router();
router.get("/users", getUsersWithStats);
router.get("/users/:id", getUserAnalytics);
router.get("/tasks/search", searchTasks);
module.exports = router;
