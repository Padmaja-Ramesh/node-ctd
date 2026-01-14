// controllers/taskController.js
const { StatusCodes } = require("http-status-codes");
const { taskSchema, patchTaskSchema } = require("../validation/taskSchema");
//const pool = require("../db/pg-pool");
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
        priority: value.priority,
      },
      select: { title: true, isCompleted: true, id: true, priority: true },
    });

    return res.status(StatusCodes.CREATED).json(task);
  } catch (err) {
    return next(err);
  }
}

async function bulkCreate(req, res, next) {
  const { tasks } = req.body;

  // Validate the tasks array
  if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      error: "Invalid request data. Expected an array of tasks.",
    });
  }

  // Validate all tasks before insertion
  const validTasks = [];
  for (const task of tasks) {
    const { error, value } = taskSchema.validate(task);
    if (error) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        error: "Validation failed",
        details: error.details,
      });
    }
    validTasks.push({
      title: value.title,
      isCompleted: value.isCompleted || false,
      priority: value.priority || "medium",
      userId: global.user_id,
    });
  }

  // Use createMany for batch insertion
  try {
    const result = await prisma.task.createMany({
      data: validTasks,
      skipDuplicates: false,
    });

    res.status(StatusCodes.CREATED).json({
      message: "success!",
      tasksCreated: result.count,
      totalRequested: validTasks.length,
    });
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

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  // Build where clause with optional search filter
  const whereClause = { userId: global.user_id };
  if (req.query.find) {
    whereClause.title = {
      contains: req.query.find, // Matches %find% pattern
      mode: "insensitive", // Case-insensitive search (ILIKE in PostgreSQL)
    };
  }

  const tasks = await prisma.task.findMany({
    where: whereClause, // only the tasks for this user!,
    select: {
      id: true,
      title: true,
      isCompleted: true,
      priority: true,
      createdAt: true,
      User: {
        select: {
          name: true,
          email: true,
        },
      },
    },
    skip: skip,
    take: limit,
    orderBy: { createdAt: "desc" },
  });

  // Get total count for pagination metadata
  const totalTasks = await prisma.task.count({
    where: whereClause,
  });

  // Build pagination object with complete metadata
  // Hint: The test expects page, limit, total, pages, hasNext, hasPrev
  // Use Math.ceil() to calculate pages, and compare page * limit with total for hasNext
  // Build pagination object with complete metadata
  const pagination = {
    page,
    limit,
    total: totalTasks,
    pages: Math.ceil(totalTasks / limit),
    hasNext: page * limit < totalTasks,
    hasPrev: page > 1,
  };

  // Return tasks with pagination information
  res.status(StatusCodes.OK).json({
    tasks,
    pagination,
  });
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
  const task = await prisma.task.findUnique({
    where: { id_userId: { id: taskId, userId: global.user_id } },
  });

  try {
    if (!task) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: "That task was not found" });
    }
    return res.status(StatusCodes.OK).json(task);
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ message: "The task was not found." });
    } else {
      return next(err); // pass other errors to the global error handler
    }
  }
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

  const { error, value } = patchTaskSchema.validate(req.body, {
    abortEarly: false,
  });

  if (error) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      message: "Validation failed",
      details: error.details,
    });
  }

  try {
    const updatedTask = await prisma.task.update({
      data: value,
      where: {
        id_userId: { id: taskId, userId: global.user_id },
      },
      select: { title: true, isCompleted: true, id: true },
    });
    return res.status(200).json(updatedTask);
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ message: "The task was not found." });
    } else {
      return next(err); // pass other errors to the global error handler
    }
  }
}

async function deleteTask(req, res, next) {
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
  try {
    const deletedTask = await prisma.task.delete({
      where: {
        id_userId: { id: taskId, userId: global.user_id },
      },
    });
    return res.status(200).json(deletedTask);
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ message: "The task was not found." });
    } else {
      return next(err); // pass other errors to the global error handler
    }
  }
}

module.exports = { index, show, create, update, deleteTask, bulkCreate };
