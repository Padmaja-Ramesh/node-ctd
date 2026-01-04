const express = require("express");
const userRouter = require("./routes/userRoutes");
const taskRouter = require("./routes/taskRoutes");
const authMiddleware = require("./middleware/auth");
const pool = require("./db/pg-pool");

const app = express();
app.use(express.json());

global.users = [];
global.tasks = [];
global.user_id = null;

app.get("/", (req, res) => {
  res.send("Hello, World!");
  res.status(200);
});

app.post("/testpost", (req, res) => {
  res.status(200).send("ok");
});
console.log("userRouter:", userRouter);
console.log("taskRouter:", taskRouter);
app.use("/api/users", userRouter);
app.use("/api/tasks", authMiddleware, taskRouter);

const errorHandler = require("./middleware/error-handler");
app.use(errorHandler);
const notFound = require("./middleware/not-found");
app.use(notFound);
const port = process.env.PORT || 3000;
const server = app.listen(port, () =>
  console.log(`Server is listening on port ${port}...`)
);

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
  await pool.end();
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

app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", db: "connected" });
  } catch (err) {
    res
      .status(500)
      .json({ message: `db not connected, error: ${err.message}` });
  }
});

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
