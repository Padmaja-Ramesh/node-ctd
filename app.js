const express = require("express");
const userRouter = require("./routes/userRoutes");
const taskRouter = require("./routes/taskRoutes");
const analyticRouter = require("./routes/analyticRoutes");
//const pool = require("./db/pg-pool");
const prisma = require("./db/prisma");
const helmet = require("helmet");
const { xss } = require("express-xss-sanitizer");
const rateLimiter = require("express-rate-limit");
const cookieParser = require("cookie-parser");
const notFound = require("./middleware/not-found");
const { StatusCodes } = require("http-status-codes");
const errorHandler = require("./middleware/error-handler");

const app = express();
app.use(express.json());

global.users = [];
global.tasks = [];
global.user_id = null;

const port = process.env.PORT || 3000;
const server = app.listen(port, () =>
  console.log(`Server is listening on port ${port}...`),
);

app.set("trust proxy", 1);

// app.get("/", (req, res) => {
//   res.send("Hello, World!");
//   res.status(StatusCodes.OK);
// });

app.get("/health", async (req, res) => {
  try {
    // await pool.query("SELECT 1");
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", db: "connected" });
  } catch (err) {
    if (err.name === "PrismaClientInitializationError") {
      console.error("Couldn't connect to the database. Is it running?");
    }
    res
      .status(500)
      .json({ message: `db not connected, error: ${err.message}` });
  }
});

app.post("/testpost", (req, res) => {
  res.status(200).send("ok");
});

app.use(cookieParser());
app.use(
  rateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
  }),
);
app.use(helmet());
app.use(xss());
// app.use("/", userRouter);
app.use("/api/users", userRouter);

app.use("/api/tasks", taskRouter);
app.use("/api/analytics", analyticRouter);

app.use(errorHandler);

app.use(notFound);

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`Port ${port} is already in use.`);
  } else {
    console.error("Server error:", err);
  }
  process.exit(1);
});

let isShuttingDown = false;
async function shutdown(code = 0) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  //await pool.end();
  await prisma.$disconnect();
  console.log("Prisma disconnected");
  console.log("Shutting down gracefully...");
  try {
    await new Promise((resolve) => server.close(resolve));
    console.log("HTTP server closed.");
    // If you have DB connections, close them here
  } catch (err) {
    console.error("Error during shutdown:", err);
    code = 1;
  } finally {
    console.log("Exiting process...");
    process.exit(code);
  }
}

process.on("SIGINT", () => shutdown(0)); // ctrl+c
process.on("SIGTERM", () => shutdown(0)); // e.g. `docker stop`
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
  shutdown(1);
});
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
  shutdown(1);
});

module.exports = { app, server };
