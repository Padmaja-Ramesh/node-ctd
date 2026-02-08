const jwt = require("jsonwebtoken");
const { StatusCodes } = require("http-status-codes");

const send401 = (res) =>
  res
    .status(StatusCodes.UNAUTHORIZED)
    .json({ message: "No user is authenticated." });

module.exports = (req, res, next) => {
  const token = req?.cookies?.jwt; // or use Authorization header if needed

  if (!token) return send401(res);

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err || !decoded.id) return send401(res);

    // Attach user info
    req.user = {
      id: decoded.id,
      role: decoded.role || "USER",
    };

    // ✅ Skip CSRF check for testing / curl / Swagger
    // if you want CSRF, implement separately only for browser forms

    next(); // authenticated
  });
};
