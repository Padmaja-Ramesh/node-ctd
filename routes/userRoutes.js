const express = require("express");
const { register, logon, logoff } = require("../controllers/userController");

const router = express.Router();
/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User authentication and management
 */

/**
 * @swagger
 * /api/users/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 example: John Doe
 *               email:
 *                 type: string
 *                 example: john@example.com
 *               password:
 *                 type: string
 *                 example: Pa$$word20
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Invalid input
 */
router.post("/register", register);
/**
 * @swagger
 * /api/users/logon:
 *   post:
 *     summary: Log in a user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: test3@test.com
 *               password:
 *                 type: string
 *                 example: Test@1234
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
router.post("/logon", logon);
/**
 * @swagger
 * /api/users/logoff:
 *   post:
 *     summary: Log out the current user
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Logout successful
 */
router.post("/logoff", logoff);

module.exports = router;
