const { StatusCodes } = require("http-status-codes");
const crypto = require("crypto");
const util = require("util");
const scrypt = util.promisify(crypto.scrypt);
//const pool = require("../db/pg-pool");
const prisma = require("../db/prisma");
const { userSchema } = require("../validation/userSchema");
const { randomUUID } = require("crypto");
const jwt = require("jsonwebtoken");

const cookieFlags = (req) => {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // only when HTTPS is available
    sameSite: "Strict",
  };
};

const setJwtCookie = (req, res, user) => {
  // Sign JWT
  const payload = { id: user.id, role: user.role, csrfToken: randomUUID() };
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" }); // 1 hour expiration
  // Set cookie.  Note that the cookie flags have to be different in production and in test.
  res.cookie("jwt", token, { ...cookieFlags(req), maxAge: 3600000 }); // 1 hour expiration
  return payload.csrfToken; // this is needed in the body returned by logon() or register()
};
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
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "Request body is required" });
  }
  let isPerson = false;
  if (req.body.recaptchaToken) {
    const token = req.body.recaptchaToken;
    const params = new URLSearchParams();
    params.append("secret", process.env.RECAPTCHA_SECRET);
    params.append("response", token);
    params.append("remoteip", req.ip);
    const response = await fetch(
      // might throw an error that would cause a 500 from the error handler
      "https://www.google.com/recaptcha/api/siteverify",
      {
        method: "POST",
        body: params.toString(),
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    );
    const data = await response.json();
    if (data.success) isPerson = true;
    delete req.body.recaptchaToken;
  } else if (
    process.env.RECAPTCHA_BYPASS &&
    req.get("X-Recaptcha-Test") === process.env.RECAPTCHA_BYPASS
  ) {
    // might be a test environment
    isPerson = true;
  }
  if (!isPerson) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "We can't tell if you're a person or a bot." });
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
    const result = await prisma.$transaction(async (tx) => {
      // Create user account (similar to Assignment 6, but using tx instead of prisma)
      const newUser = await tx.user.create({
        data: {
          name: value.name,
          email: value.email.toLowerCase(),
          hashedPassword,
        },
        select: { id: true, email: true, name: true },
      });

      // Create 3 welcome tasks using createMany
      const welcomeTaskData = [
        {
          title: "Complete your profile",
          userId: newUser.id,
          priority: "medium",
        },
        { title: "Add your first task", userId: newUser.id, priority: "high" },
        { title: "Explore the app", userId: newUser.id, priority: "low" },
      ];
      await tx.task.createMany({ data: welcomeTaskData });

      // Fetch the created tasks to return them
      const welcomeTasks = await tx.task.findMany({
        where: {
          userId: newUser.id,
          title: { in: welcomeTaskData.map((t) => t.title) },
        },
        select: {
          id: true,
          title: true,
          isCompleted: true,
          userId: true,
          priority: true,
        },
      });

      return { user: newUser, welcomeTasks };
    });

    // Store the user ID globally for session management (not secure for production)
    // req.user.id = result.user.id;

    // Send response with status 201
    const csrfToken = setJwtCookie(req, res, result.user);
    res.status(StatusCodes.CREATED);
    res.json({
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
      },
      csrfToken,
      welcomeTasks: result.welcomeTasks,
    });
    return;
  } catch (err) {
    if (err.code === "P2002") {
      // send the appropriate error back -- the email was already registered
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ error: "Email already registered" });
    } else {
      return next(err); // the error handler takes care of other errors
    }
  }
}

// async function login(req, res) {
//   let { email, password } = req.body;
//   email = email.toLowerCase();

//   if (!email || !password) {
//     return res
//       .status(StatusCodes.BAD_REQUEST)
//       .json({ error: "Email and password required" });
//   }
//   // const result = await pool.query("SELECT * FROM users WHERE email = $1", [
//   //   email,
//   // ]);
//   const result = await prisma.user.findUnique({ where: { email } });
//   if (!result) {
//     return res
//       .status(StatusCodes.UNAUTHORIZED)
//       .json({ error: "Invalid credentials" });
//   }

//   if (!result.hashedPassword) {
//     return res
//       .status(StatusCodes.INTERNAL_SERVER_ERROR)
//       .json({ error: "User password not set" });
//   }

//   const isValid = await comparePassword(password, result.hashedPassword);

//   if (!isValid) {
//     return res
//       .status(StatusCodes.UNAUTHORIZED)
//       .json({ error: "Invalid credentials" });
//   }

//   res.status(StatusCodes.OK).json({ id: result.id, name: result.name });
// }

async function logon(req, res, next) {
  try {
    let { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ error: "Email and password required" });
    }

    email = email.toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email },
    });

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

    const csrfToken = setJwtCookie(req, res, user);
    // ✅ SUCCESS
    return res.status(StatusCodes.OK).json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      csrfToken,
    });
  } catch (err) {
    // 🔥 THIS is what you were missing
    console.error("LOGIN ERROR:", err);
    return next(err);
  }
}

function logoff(req, res) {
  // if (req.user) {
  //   req.user.id = null;
  // }
  res.clearCookie("jwt", cookieFlags(req));
  return res.status(StatusCodes.OK).json({ message: "Logged off" });
}

module.exports = { register, logon, logoff };
