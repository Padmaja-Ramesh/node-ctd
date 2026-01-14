const express = require("express");
const {
  userProductivityAnalytics,
  search,
  userAnalytics,
} = require("../controllers/analyticsController");

const router = express.Router();
router.get("/users", userAnalytics);
router.get("/users/:id", userProductivityAnalytics);
router.get("/tasks/search", search);
module.exports = router;
