// taskRoutes.js
const express = require("express");
const {
  index,
  create,
  show,
  update,
  deleteTask,
  bulkCreate,
} = require("../controllers/taskController");
const jwtMiddleware = require("../middleware/jwtMiddleware");

const router = express.Router();
router.use(jwtMiddleware);

router.get("/", index);
router.post("/", create);
router.post("/bulk-task", bulkCreate);
router.get("/:id", show);
router.patch("/:id", update);
router.delete("/:id", deleteTask);

module.exports = router;
