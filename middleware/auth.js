const { StatusCodes } = require("http-status-codes");
const jwt = require("jsonwebtoken");

const authenticateUser = (req, res, next) => {
  const token = req.cookies?.jwt;

  if (!token) {
    return res
      .status(StatusCodes.UNAUTHORIZED)
      .json({ message: "Authentication required" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    req.user = {
      userId: payload.id,
      role: payload.role,
      csrfToken: payload.csrfToken,
    };

    next();
  } catch (err) {
    return res
      .status(StatusCodes.UNAUTHORIZED)
      .json({ message: "Invalid or expired token" });
  }
};

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res
        .status(StatusCodes.FORBIDDEN)
        .json({ message: "Access denied" });
    }
    next();
  };
};

const authorizeOwnerOrAdmin = (req, res, next) => {
  const requestedUserId = Number(req.params.id);

  if (req.user.role !== "ADMIN" && req.user.userId !== requestedUserId) {
    return res
      .status(StatusCodes.FORBIDDEN)
      .json({ message: "Not authorized" });
  }

  next();
};

module.exports = {
  authenticateUser,
  authorizeRoles,
  authorizeOwnerOrAdmin,
};
