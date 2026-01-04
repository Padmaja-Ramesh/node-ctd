const { StatusCodes } = require("http-status-codes");
const crypto = require("crypto");
const util = require("util");
const scrypt = util.promisify(crypto.scrypt);
const pool = require("../db/pg-pool");
const { userSchema } = require("../validation/userSchema");

global.users = global.users || [];
global.user_id = global.user_id || null;

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = await scrypt(password, salt, 64);
  return `${salt}:${derivedKey.toString("hex")}`;
}

async function comparePassword(inputPassword, storedHash) {
  const [salt, key] = storedHash.split(":");
  const keyBuffer = Buffer.from(key, "hex");
  const derivedKey = await scrypt(inputPassword, salt, 64);
  return crypto.timingSafeEqual(keyBuffer, derivedKey);
}

async function register(req, res, next) {
  if (!req.body) {
    return res.status(400).json({ message: "Request body is required" });
  }
  const { error, value } = userSchema.validate(req.body, {
    abortEarly: false,
  });

  if (error) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      message: "Validation failed",
      details: error.details,
    });
  }

  const hashedPassword = await hashPassword(value.password);

  try {
    const result = await pool.query(
      `INSERT INTO users (email, name, hashed_password)
       VALUES ($1, $2, $3)
       RETURNING id, email, name`,
      [value.email, value.name, hashedPassword]
    );

    const newUser = result.rows[0];
    global.user_id = newUser.id;
    return res.status(StatusCodes.CREATED).json({
      email: newUser.email,
      name: newUser.name,
    });
  } catch (e) {
    if (e.code === "23505") {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: "Email already registered",
      });
    }
    return next(e);
  }
}

async function logon(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ error: "Email and password required" });
  }
  const result = await pool.query("SELECT * FROM users WHERE email = $1", [
    email,
  ]);

  if (result.rows.length == 0) {
    return res
      .status(StatusCodes.UNAUTHORIZED)
      .json({ error: "Invalid credentials" });
  }

  if (!result.rows[0].hashed_password) {
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "User password not set" });
  }

  const isValid = await comparePassword(
    password,
    result.rows[0].hashed_password
  );

  if (!isValid) {
    return res
      .status(StatusCodes.UNAUTHORIZED)
      .json({ error: "Invalid credentials" });
  }

  global.user_id = result.rows[0].id;
  res.status(StatusCodes.OK).json({ name: result.rows[0].name });
}

function logoff(req, res) {
  global.user_id = null;
  res.status(StatusCodes.OK).json({ message: "Logged off" });
}

module.exports = { register, logon, logoff };
