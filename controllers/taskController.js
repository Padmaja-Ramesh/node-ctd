// controllers/taskController.js
const { StatusCodes } = require("http-status-codes");
const { taskSchema, patchTaskSchema } = require("../validation/taskSchema");
const pool = require("../db/pg-pool");
const prisma = require("../db/prisma");

const taskCounter = (() => {
  let lastTaskNumber = 0;
  return () => ++lastTaskNumber;
})();

async function create(req, res, next) {
  if (!req.body) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "Request body is required" });
  }
  const { error, value } = taskSchema.validate(req.body, { abortEarly: false });

  if (!global.user_id) {
    return res.status(StatusCodes.UNAUTHORIZED).json({
      message: "Not authenticated",
    });
  }
  try {
    const task = await prisma.task.create({
      data: {
        title: value.title,
        isCompleted: value.isCompleted,
        userId: global.user_id,
      },
      select: { title: true, isCompleted: true, userId: true },
    });

    return res.status(StatusCodes.CREATED).json(task);
  } catch (err) {
    return next(err);
  }
}

async function index(req, res, next) {
  if (!global.user_id) {
    return res
      .status(StatusCodes.UNAUTHORIZED)
      .json({ message: "Unauthorized" });
  }

  // const tasks = await pool.query(
  //   "SELECT id, title, is_completed FROM tasks WHERE user_id = $1",
  //   [global.user_id]
  // );
  const tasks = await prisma.task.findMany({
    where: {
      userId: global.user_id, // only the tasks for this user!
    },
    select: { title: true, isCompleted: true, id: true },
  });

  if (!tasks) {
    return res
      .status(StatusCodes.NOT_FOUND)
      .json({ message: "No tasks found" });
  }
  return res.status(StatusCodes.OK).json(tasks.rows);
}

async function show(req, res, next) {
  if (!global.user_id) {
    return res
      .status(StatusCodes.UNAUTHORIZED)
      .json({ message: "Unauthorized" });
  }

  const taskId = parseInt(req.params?.id);
  if (!taskId) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "The task ID passed is not valid." });
  }
  const task = await pool.query(
    `SELECT id, title, is_completed
       FROM tasks
       WHERE id = $1 AND user_id = $2`,
    [taskId, global.user_id]
  );

  if (task.rows.length === 0) {
    return res
      .status(StatusCodes.NOT_FOUND)
      .json({ message: "That task was not found" });
  }
  return res.status(StatusCodes.OK).json(task.rows[0]);
}

async function update(req, res, next) {
  if (!global.user_id) {
    return res
      .status(StatusCodes.UNAUTHORIZED)
      .json({ message: "Unauthorized" });
  }

  const taskId = parseInt(req.params?.id);
  if (!taskId) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "The task ID passed is not valid." });
  }

  const { error, value: taskChange } = patchTaskSchema.validate(req.body, {
    abortEarly: false,
  });

  if (error) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      message: "Validation failed",
      details: error.details,
    });
  }

  const columnMap = {
    title: "title",
    isCompleted: "is_completed",
  };

  let keys = Object.keys(taskChange);
  const setClauses = keys
    .map((key, i) => `${columnMap[key]} = $${i + 1}`)
    .join(", ");
  const idParm = `$${keys.length + 1}`;
  const userParm = `$${keys.length + 2}`;
  const updatedTask = await pool.query(
    `UPDATE tasks SET ${setClauses} 
    WHERE id = ${idParm} AND user_id = ${userParm} RETURNING id, title, is_completed`,
    [...Object.values(taskChange), req.params.id, global.user_id]
  );

  if (updatedTask.rows.length === 0) {
    return res
      .status(StatusCodes.NOT_FOUND)
      .json({ message: "That task was not found" });
  }
  return res.status(StatusCodes.OK).json(updatedTask.rows[0]);
}

async function deleteTask(req, res) {
  if (!global.user_id) {
    return res
      .status(StatusCodes.UNAUTHORIZED)
      .json({ message: "Unauthorized" });
  }

  const taskId = parseInt(req.params?.id);
  if (!taskId) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "The task ID passed is not valid." });
  }

  const task = await pool.query(
    `DELETE FROM tasks
       WHERE id = $1 AND user_id = $2
       RETURNING id, title, is_completed`,
    [taskId, global.user_id]
  );

  if (task.rows.length === 0) {
    return res
      .status(StatusCodes.NOT_FOUND)
      .json({ message: "That task was not found" });
  }
  return res.status(StatusCodes.OK).json(task.rows[0]);
}

module.exports = { index, show, create, update, deleteTask };
