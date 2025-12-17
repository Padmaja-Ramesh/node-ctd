const express = require("express");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const dogsRouter = require("./routes/dogs");
const userRouter = require("../routes/userRoutes");
const { StatusCodes } = require("http-status-codes");
const { UnauthorizedError, InternalServerError } = require("./errors");

global.user_id = null;
global.users = [];
global.tasks = [];

const app = express();

// Your middleware here
app.use(express.json({ limit: "1kb" }), express.urlencoded({ limit: "1mb" }));
app.use("/images", express.static("public/images"));
app.use((req, res, next) => {
  req.requestId = uuidv4();
  res.setHeader("X-Request-Id", req.requestId);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  const timestamp = new Date().toISOString();
  console.log(
    `[${timestamp}]: ${req.method} ${req.originalUrl} (${req.requestId})`
  );
  next();
});

app.use((req, res, next) => {
  if (req.method === "POST" && req.get("content-type") != "application/json") {
    return res.status(StatusCodes.BAD_REQUEST).json({
      requestId: req.requestId,
      error: "Content-Type must be application/json",
    });
  }
  next();
});

app.use("/", dogsRouter); // Do not remove this line
app.use("/api/users", userRouter);

app.post("/api/users", (req, res) => {
  const newUser = { ...req.body }; // this makes a copy
  global.users.push(newUser);
  global.user_id = newUser; // After the registration step, the user is set to logged on.
  delete req.body.password;
  res.status(201).json(req.body);
});
app.get("/error", (req, res) => {
  throw new Error("Test error");
});

//custom middleware
app.use((err, req, res, next) => {
  if (!res.headersSent) {
    console.log(`ERROR: ${err}`);
    if (err.name === "ValidationError") {
      console.warn(`WARN: ValidationError ${err}`);
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ requestId: req.requestId, error: err.message });
    }
    if (err.name === "NotFoundError") {
      console.warn(`WARN: NotFoundError ${err}`);
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ requestId: req.requestId, error: err.message });
    }
    if (err.name === "UnauthorizedError") {
      console.warn(`WARNING: ${err}`);
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json({ requestId: req.requestId, error: err.message });
    }

    console.error(`ERROR: Error ${err}`);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      requestId: req.requestId,
      error: "Internal Server Error",
    });
  }
});
app.use((req, res) => {
  res.status(404).json({
    error: "Route not found",
    requestId: req.requestId,
  });
});
const server = app.listen(3000, () =>
  console.log("Server listening on port 3000")
);
module.exports = server;
