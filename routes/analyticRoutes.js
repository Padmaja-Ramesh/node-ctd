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

/**
 * @swagger
 * tags:
 *   name: Analytics
 *   description: User and task analytics (role-based access)
 */

/**
 * @swagger
 * /api/analytics/users/stats:
 *   get:
 *     summary: Get all users with statistics (ADMIN only)
 *     description: Returns aggregated statistics for all users. Requires ADMIN role.
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users with analytics data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (ADMIN role required)
 */
router.get(
  "/users/stats",
  authenticateUser,
  authorizeRoles("ADMIN"),
  getUsersWithStats,
);

/**
 * @swagger
 * /api/analytics/users/{id}:
 *   get:
 *     summary: Get analytics for a specific user
 *     description: Accessible by the user themselves or an ADMIN.
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User analytics data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (not owner or admin)
 *       404:
 *         description: User not found
 */
router.get(
  "/users/:id",
  authenticateUser,
  authorizeOwnerOrAdmin,
  getUserAnalytics,
);

/**
 * @swagger
 * /api/analytics/tasks/search:
 *   get:
 *     summary: Search tasks
 *     description: Search tasks belonging to the authenticated user.
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search keyword
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           example: false
 *         description: Filter by task status
 *     responses:
 *       200:
 *         description: Matching tasks
 *       401:
 *         description: Unauthorized
 */
router.get("/tasks/search", authenticateUser, searchTasks);

module.exports = router;
