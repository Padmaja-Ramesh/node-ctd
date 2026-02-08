// controllers/taskController.js
const { StatusCodes } = require("http-status-codes");
const { taskSchema, patchTaskSchema } = require("../validation/taskSchema");
const prisma = require("../db/prisma");

async function create(req, res, next) {
  if (!req.body)
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "Request body required" });
  if (!req.user?.id) throw new TypeError("Not authenticated");

  const { error, value } = taskSchema.validate(req.body, { abortEarly: false });
  if (error)
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "Validation failed", details: error.details });

  const task = await prisma.task.create({
    data: {
      title: value.title,
      isCompleted: value.isCompleted ?? false,
      priority: value.priority ?? "medium",
      userId: req.user.id,
    },
    select: { id: true, title: true, isCompleted: true, priority: true },
  });
  res.status(StatusCodes.CREATED).json(task);
}

async function bulkCreate(req, res, next) {
  if (!req.user?.id) {
    return res
      .status(StatusCodes.UNAUTHORIZED)
      .json({ message: "Not authenticated" });
  }

  const { tasks } = req.body;
  if (!Array.isArray(tasks) || tasks.length === 0) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ error: "Invalid request data. Expected an array of tasks." });
  }

  const validTasks = [];
  for (const task of tasks) {
    const { error, value } = taskSchema.validate(task);
    if (error) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ error: "Validation failed", details: error.details });
    }
    validTasks.push({
      title: value.title,
      isCompleted: value.isCompleted ?? false,
      priority: value.priority ?? "medium",
      userId: req.user.id,
    });
  }

  try {
    const result = await prisma.task.createMany({ data: validTasks });
    res.status(StatusCodes.CREATED).json({ tasksCreated: result.count });
  } catch (err) {
    return next(err);
  }
}

// async function index(req, res, next) {
//   if (!req.user?.id) return res.status(401).json({ message: "Unauthorized" });

//   try {
//     const tasks = await prisma.task.findMany({
//       where: { userId: req.user.id },
//       select: { id: true, title: true, isCompleted: true, priority: true },
//       orderBy: { createdAt: "desc" },
//     });
//     if (!tasks.length)
//       return res.status(404).json({ message: "No tasks found" });
//     res.status(200).json({ tasks });
//   } catch (err) {
//     next(err);
//   }
// }
async function index(req, res, next) {
  if (!req.user?.id) {
    return res
      .status(StatusCodes.UNAUTHORIZED)
      .json({ message: "Unauthorized" });
  }

  try {
    const { sortBy = "createdAt", sortDirection = "desc", find } = req.query;

    const allowedSortFields = ["createdAt", "priority", "title", "isCompleted"];

    const safeSortBy = allowedSortFields.includes(sortBy)
      ? sortBy
      : "createdAt";

    const safeSortDirection = sortDirection === "asc" ? "asc" : "desc";

    const whereClause = {};

    if (req.user.role !== "ADMIN") {
      whereClause.userId = req.user.id;
    }

    if (find) {
      whereClause.title = { contains: find, mode: "insensitive" };
    }

    const tasks = await prisma.task.findMany({
      where: whereClause,
      select: {
        id: true,
        title: true,
        isCompleted: true,
        priority: true,
        createdAt: true,
        userId: true,
        User:
          req.user.role === "ADMIN"
            ? { select: { role: true, name: true, email: true } }
            : undefined,
      },
      orderBy: {
        [safeSortBy]: safeSortDirection,
      },
    });

    if (!tasks.length) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: "No tasks found" });
    }

    res.status(StatusCodes.OK).json({ tasks });
  } catch (err) {
    next(err);
  }
}

async function show(req, res, next) {
  if (!req.user?.id)
    return res
      .status(StatusCodes.UNAUTHORIZED)
      .json({ message: "Unauthorized" });
  const taskId = parseInt(req.params?.id);
  if (!taskId)
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "Invalid task ID" });

  try {
    const task = await prisma.task.findUnique({
      where: { id: taskId, userId: req.user.id },
      select: {
        id: true,
        title: true,
        isCompleted: true,
        priority: true,
        User:
          req.user.role === "ADMIN"
            ? { select: { role: true, name: true, email: true } }
            : false,
      },
    });
    if (!task)
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: "Task not found" });
    if (req.user.role !== "ADMIN" && task.userId !== req.user.userId) {
      return res
        .status(StatusCodes.FORBIDDEN)
        .json({ message: "Not authorized" });
    }
    res.status(StatusCodes.OK).json(task);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  if (!req.user?.id)
    return res
      .status(StatusCodes.UNAUTHORIZED)
      .json({ message: "Unauthorized" });

  const taskId = parseInt(req.params?.id);
  if (!taskId)
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "Invalid task ID" });

  const { error, value } = patchTaskSchema.validate(req.body, {
    abortEarly: false,
  });
  if (error)
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "Validation failed", details: error.details });

  try {
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task)
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: "Task not found" });

    if (req.user.role !== "ADMIN" && task.userId !== req.user.userId) {
      return res
        .status(StatusCodes.FORBIDDEN)
        .json({ message: "Not authorized" });
    }
    const updatedTask = await prisma.task.update({
      where: { id_userId: { id: taskId, userId: req.user.id } },
      data: value,
      select: {
        id: true,
        title: true,
        isCompleted: true,
        priority: true,
        userId: true,
      },
    });

    res.status(StatusCodes.OK).json(updatedTask);
  } catch (err) {
    if (err.code === "P2025")
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: "Task not found" });
    return next(err);
  }
}

async function deleteTask(req, res, next) {
  if (!req.user?.id)
    return res
      .status(StatusCodes.UNAUTHORIZED)
      .json({ message: "Unauthorized" });

  const taskId = parseInt(req.params?.id);
  if (!taskId)
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "Invalid task ID" });

  try {
    const deletedTask = await prisma.task.delete({
      where: { id_userId: { id: taskId, userId: req.user.id } },
    });

    res.status(StatusCodes.OK).json(deletedTask);
  } catch (err) {
    if (err.code === "P2025")
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: "Task not found" });
    return next(err);
  }
}

module.exports = { create, bulkCreate, index, show, update, deleteTask };
