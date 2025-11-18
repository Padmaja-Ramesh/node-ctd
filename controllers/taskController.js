///controllers/taskController.js with functions index, create, show, update, and deleteTask.
const { StatusCodes } = require("http-status-codes");

function index(req, res) {
  res.status(StatusCodes.ACCEPTED).json(req.body);
}

function create(req, res) {
  res.status(StatusCodes.ACCEPTED).json(req.body);
}

function show(req, res) {
  res.status(StatusCodes.ACCEPTED).json(req.body);
}

function update(req, res) {
  res.status(StatusCodes.ACCEPTED).json(req.body);
}

function deleteTask(req, res) {
  res.status(StatusCodes.ACCEPTED).json(req.body);
}
