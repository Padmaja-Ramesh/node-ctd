// controllers/analyticsController.js
const { StatusCodes } = require("http-status-codes");
const prisma = require("../db/prisma");

async function userProductivityAnalytics(req, res, next) {
  // 1️⃣ Parse & validate user ID
  const userId = parseInt(req.params.id);

  if (isNaN(userId)) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "Invalid user ID" });
  }

  // 2️⃣ Check if user exists (REQUIRED)
  const userExists = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  if (!userExists) {
    return res
      .status(StatusCodes.NOT_FOUND)
      .json({ message: "User not found" });
  }

  // 3️⃣ Count tasks by completion status
  const taskStats = await prisma.task.groupBy({
    by: ["isCompleted"],
    where: { userId },
    _count: {
      id: true,
    },
  });

  // 4️⃣ Fetch recent tasks with eager loading (User name)
  const recentTasks = await prisma.task.findMany({
    where: { userId },
    select: {
      id: true,
      title: true,
      isCompleted: true,
      priority: true,
      createdAt: true,
      userId: true,
      User: {
        select: { name: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  // 5️⃣ Calculate date 7 days ago
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  // 6️⃣ Weekly progress using groupBy
  const weeklyProgress = await prisma.task.groupBy({
    by: ["createdAt"],
    where: {
      userId,
      createdAt: {
        gte: oneWeekAgo,
      },
    },
    _count: {
      id: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  // 7️⃣ Return response
  return res.status(StatusCodes.OK).json({
    taskStats,
    recentTasks,
    weeklyProgress,
  });
}

module.exports = { userProductivityAnalytics };
