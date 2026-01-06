// taskRoutes.js
const express = require("express");
const {
  index,
  create,
  show,
  update,
  deleteTask,
} = require("../controllers/taskController");

const router = express.Router();

router.get("/", index);
router.post("/", create);
router.get("/:id", show);
router.patch("/:id", update);
router.delete("/:id", deleteTask);

module.exports = router;
