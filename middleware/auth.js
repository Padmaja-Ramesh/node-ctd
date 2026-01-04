const { StatusCodes } = require("http-status-codes");

module.exports = function authMiddleware(req, res, next) {
  if (!global.user_id) {
    return res
      .status(StatusCodes.UNAUTHORIZED)
      .json({ message: "Unauthorized" });
  }
  next();
};
