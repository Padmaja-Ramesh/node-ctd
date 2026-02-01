const { StatusCodes } = require("http-status-codes");

module.exports = function authMiddleware(req, res, next) {
  if (!req.user.id) {
    return res
      .status(StatusCodes.UNAUTHORIZED)
      .json({ message: "Unauthorized" });
  }
  next();
};
