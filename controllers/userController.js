const { StatusCodes } = require("http-status-codes");

global.users = global.users || [];
global.user_id = global.user_id || null;

function register(req, res) {
  if (!req.body) {
    return res.status(400).json({ message: "Request body is required" });
  }

  global.users = global.users || [];
  global.user_id = global.user_id || null;

  const newUser = { ...req.body };
  global.users.push(newUser);
  global.user_id = newUser;

  const { password, ...safeUser } = newUser; // safer than deleting directly
  return res.status(StatusCodes.CREATED).json(safeUser);
}

function logon(req, res) {
  const userDetail = { ...req.body };
  const checkUser = global.users.find(
    (user) =>
      user.email === userDetail.email && user.password === userDetail.password
  );
  if (checkUser) {
    global.user_id = checkUser;
    res.status(StatusCodes.OK).json({ name: checkUser.name });
  } else {
    res.status(StatusCodes.UNAUTHORIZED).json({ error: "Invalid credentials" });
  }
}

function logoff(req, res) {
  global.user_id = null;
  res.status(StatusCodes.OK).json({ message: "Logged off" });
}

module.exports = { register, logon, logoff };
