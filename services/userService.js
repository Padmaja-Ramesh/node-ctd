const prisma = require("../db/prisma");
const crypto = require("crypto");
const util = require("util");
const scrypt = util.promisify(crypto.scrypt);

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = await scrypt(password, salt, 64);
  return `${salt}:${derivedKey.toString("hex")}`;
}

const createUser = async ({ name, email, password }) => {
  const hashedPassword = await hashPassword(password);

  return prisma.user.create({
    data: {
      name,
      email,
      hashedPassword,
    },
  });
};

module.exports = {
  createUser,
};
