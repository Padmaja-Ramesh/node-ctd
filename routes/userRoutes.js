const express = require("express");
const { register, login, logoff } = require("../controllers/userController");

const router = express.Router();

router.post("/register", register);
router.post("/logon", login);
router.post("/logoff", logoff);

module.exports = router;
