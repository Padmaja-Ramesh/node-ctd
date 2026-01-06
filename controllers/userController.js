const { StatusCodes } = require("http-status-codes");
const crypto = require("crypto");
const util = require("util");
const scrypt = util.promisify(crypto.scrypt);

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

async function register(req, res) {
  if (!req.body) {
    return res.status(400).json({ message: "Request body is required" });
  }

  global.users = global.users || [];
  global.user_id = global.user_id || null;
  const { password, ...rest } = req.body;
  const hashedPassword = await hashPassword(password);

  const newUser = { ...rest, hashedPassword };
  global.users.push(newUser);
  global.user_id = newUser;

  const { hashedPassword: _, ...safeUser } = newUser; // safer than deleting directly
  return res.status(StatusCodes.CREATED).json(safeUser);
}

async function logon(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ error: "Email and password required" });
  }
  const user = global.users.find((u) => u.email === email);

  if (!user) {
    return res
      .status(StatusCodes.UNAUTHORIZED)
      .json({ error: "Invalid credentials" });
  }

  if (!user.hashedPassword) {
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "User password not set" });
  }

  const isValid = await comparePassword(password, user.hashedPassword);

  if (!isValid) {
    return res
      .status(StatusCodes.UNAUTHORIZED)
      .json({ error: "Invalid credentials" });
  }

  global.user_id = user;
  res.status(StatusCodes.OK).json({ name: user.name });
}

function logoff(req, res) {
  global.user_id = null;
  res.status(StatusCodes.OK).json({ message: "Logged off" });
}

module.exports = { register, logon, logoff };
