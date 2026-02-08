// controllers/analyticsController.js
const { StatusCodes } = require("http-status-codes");
const prisma = require("../db/prisma");

async function getUserAnalytics(req, res, next) {
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

async function searchTasks(req, res) {
  const searchQuery = req.query.q;
  if (!searchQuery || searchQuery.trim().length < 2) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      error: "Search query must be at least 2 characters long",
    });
  }

  const limit = Number.parseInt(req.query.limit, 10) || 20;

  const loggedInUserId = req.user.id;
  const role = req.user.role || "USER";

  // Patterns for ranking
  const exactMatch = searchQuery;
  const startsWith = `${searchQuery}%`;
  const contains = `%${searchQuery}%`;

  // Build base SQL query
  let baseQuery = `
    SELECT 
      t.id,
      t.title,
      t.is_completed AS "isCompleted",
      t.priority,
      t.created_at AS "createdAt",
      t.user_id AS "userId",
      u.name AS "user_name"
    FROM tasks t
    JOIN users u ON t.user_id = u.id
    WHERE t.title ILIKE $1
  `;

  const params = [contains]; // $1

  // Admins can also search by user name
  if (role === "ADMIN") {
    baseQuery += ` OR u.name ILIKE $2`;
    params.push(contains); // $2
  }

  // Normal users can only see their own tasks
  if (role !== "ADMIN") {
    baseQuery += ` AND t.user_id = $${params.length + 1}`;
    params.push(loggedInUserId);
  }

  // Order by ranking
  baseQuery += `
    ORDER BY
      CASE
        WHEN t.title ILIKE $${params.length + 1} THEN 1
        WHEN t.title ILIKE $${params.length + 2} THEN 2
        WHEN t.title ILIKE $${params.length + 3} THEN 3
        ELSE 4
      END,
      t.created_at DESC
    LIMIT $${params.length + 4}
  `;

  // Add ranking parameters
  params.push(exactMatch, startsWith, contains, limit);

  try {
    const searchResults = await prisma.$queryRawUnsafe(baseQuery, ...params);

    res.status(StatusCodes.OK).json({
      query: searchQuery,
      count: searchResults.length,
      results: searchResults,
    });
  } catch (err) {
    console.error(err);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "An error occurred while searching tasks",
    });
  }
}

async function getUsersWithStats(req, res) {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const usersRaw = await prisma.user.findMany({
    include: {
      Task: {
        where: { isCompleted: false },
        select: { id: true },
        take: 5,
      },
      _count: {
        select: {
          Task: true,
        },
      },
    },
    skip: skip,
    take: limit,
    orderBy: { createdAt: "desc" },
  });

  // Transform to only include the fields we want
  const users = usersRaw.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
    _count: user._count,
    Task: user.Task,
  }));

  // Get total count for pagination
  const totalUsers = await prisma.user.count();

  // Build pagination object with page, limit, total, pages, hasNext, hasPrev
  // Hint: Use Math.ceil() for pages, compare page * limit with total for hasNext
  const pagination = {
    page,
    limit,
    total: totalUsers,
    pages: Math.ceil(totalUsers / limit),
    hasNext: page * limit < totalUsers,
    hasPrev: page > 1,
  };
  // Return users and pagination
  res.status(StatusCodes.OK).json({
    users,
    pagination,
  });
}

module.exports = { getUserAnalytics, searchTasks, getUsersWithStats };
