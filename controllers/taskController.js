// controllers/taskController.js
const { StatusCodes } = require("http-status-codes");

const taskCounter = (() => {
  let lastTaskNumber = 0;
  return () => ++lastTaskNumber;
})();

function create(req, res) {
  global.tasks = global.tasks || []; // ensure tasks array exists

  const newTask = {
    ...req.body,
    id: taskCounter(),
    userId: global.user_id.email,
    isCompleted: false,
  };

  global.tasks.push(newTask);

  const { userId, ...sanitizedTask } = newTask;
  return res.status(StatusCodes.CREATED).json(sanitizedTask);
}

function index(req, res) {
  if (!global.user_id) {
    return res
      .status(StatusCodes.UNAUTHORIZED)
      .json({ message: "Unauthorized" });
  }

  const userTasks = global.tasks.filter(
    (task) => task.userId === global.user_id.email
  );

  if (userTasks.length === 0) {
    return res
      .status(StatusCodes.NOT_FOUND)
      .json({ message: "No tasks found" });
  }

  const sanitizedTasks = userTasks.map(({ userId, ...task }) => task);
  return res.status(StatusCodes.OK).json(sanitizedTasks);
}

function show(req, res) {
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

  const task = global.tasks.find(
    (t) => t.id === taskId && t.userId === global.user_id.email
  );

  if (!task) {
    return res
      .status(StatusCodes.NOT_FOUND)
      .json({ message: "That task was not found" });
  }

  const { userId, ...sanitizedTask } = task;
  return res.status(StatusCodes.OK).json(sanitizedTask);
}

function update(req, res) {
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

  const task = global.tasks.find(
    (t) => t.id === taskId && t.userId === global.user_id.email
  );

  if (!task) {
    return res
      .status(StatusCodes.NOT_FOUND)
      .json({ message: "That task was not found" });
  }

  // PATCH semantics — update only provided fields
  Object.assign(task, req.body);

  const { userId, ...sanitizedTask } = task;
  return res.status(StatusCodes.OK).json(sanitizedTask);
}

function deleteTask(req, res) {
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

  const taskIndex = global.tasks.findIndex(
    (t) => t.id === taskId && t.userId === global.user_id.email
  );

  if (taskIndex === -1) {
    return res
      .status(StatusCodes.NOT_FOUND)
      .json({ message: "That task was not found" });
  }

  const { userId, ...deletedTask } = global.tasks[taskIndex];
  global.tasks.splice(taskIndex, 1);
  return res.status(StatusCodes.OK).json(deletedTask);
}

module.exports = { index, show, create, update, deleteTask };
