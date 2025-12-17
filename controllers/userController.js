const { StatusCodes } = require("http-status-codes");

///controllers/userController.js with functions logon, register, and logoff

function register(req, res) {
  const newUser = { ...req.body };
  global.users.push(newUser);
  global.user_id = newUser;
  delete req.body.password;
  res.status(StatusCodes.CREATED).json(req.body);
}

function logon(req, res) {
  const userDetail = { ...req.body };
  const checkUser = global.users.find(
    (user) =>
      user.email === userDetail.email && user.password === userDetail.password
  );
  if (checkUser) {
    const userName = checkUser.name;
    global.user_id = checkUser;
    res.status(StatusCodes.OK).json({ name: userName });
  } else {
    res.status(StatusCodes.UNAUTHORIZED);
  }
}

function logoff(req, res) {
  res.status(StatusCodes.OK);
}

module.exports = { register, logoff, logon };
