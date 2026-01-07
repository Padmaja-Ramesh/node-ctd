const { StatusCodes } = require("http-status-codes");
const crypto = require("crypto");
const util = require("util");
const scrypt = util.promisify(crypto.scrypt);
//const pool = require("../db/pg-pool");
const prisma = require("../db/prisma");
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
  delete value.password;

  try {
    let user = null;
    user = await prisma.user.create({
      data: {
        name: value.name,
        email: value.email.toLowerCase(),
        hashedPassword,
      },
      select: { name: true, email: true, id: true }, // specify the column values to return
    });
    global.user_id = user.id;

    return res.status(StatusCodes.CREATED).json({
      id: user.id,
      name: user.name,
      email: user.email,
    });
  } catch (err) {
    if (err.name === "PrismaClientKnownRequestError" && err.code === "P2002") {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: "Email already registered",
      });
    } else {
      return next(err); // the error handler takes care of other errors
    }
  }
}

async function logon(req, res) {
  let { email, password } = req.body;
  email = email.toLowerCase();

  if (!email || !password) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ error: "Email and password required" });
  }
  // const result = await pool.query("SELECT * FROM users WHERE email = $1", [
  //   email,
  // ]);
  const result = await prisma.user.findUnique({ where: { email } });
  if (!result) {
    return res
      .status(StatusCodes.UNAUTHORIZED)
      .json({ error: "Invalid credentials" });
  }

  if (!result.hashedPassword) {
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "User password not set" });
  }

  const isValid = await comparePassword(password, result.hashedPassword);

  if (!isValid) {
    return res
      .status(StatusCodes.UNAUTHORIZED)
      .json({ error: "Invalid credentials" });
  }

  global.user_id = result.id;
  res.status(StatusCodes.OK).json({ name: result.name });
}

function logoff(req, res) {
  global.user_id = null;
  res.status(StatusCodes.OK).json({ message: "Logged off" });
}

module.exports = { register, logon, logoff };
