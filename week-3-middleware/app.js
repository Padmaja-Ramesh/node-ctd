const express = require("express");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const dogsRouter = require("./routes/dogs");
const userRouter = require("./routes/userRoutes");

global.user_id = null;
global.users = [];
global.tasks = [];

const app = express();
app.use(express.json({ limit: "1kb" }));

// Your middleware here
app.use("/api/users", userRouter);

app.use("/", dogsRouter); // Do not remove this line
app.post("/api/users", (req, res) => {
  const newUser = { ...req.body }; // this makes a copy
  global.users.push(newUser);
  global.user_id = newUser; // After the registration step, the user is set to logged on.
  delete req.body.password;
  res.status(201).json(req.body);
});

const server = app.listen(3000, () =>
  console.log("Server listening on port 3000")
);
module.exports = server;
