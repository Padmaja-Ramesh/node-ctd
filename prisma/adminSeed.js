const { PrismaClient } = require("@prisma/client");
const crypto = require("crypto");
const util = require("util");

const prisma = new PrismaClient();
const scrypt = util.promisify(crypto.scrypt);

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = await scrypt(password, salt, 64);
  return `${salt}:${derivedKey.toString("hex")}`;
}

async function createAdmin() {
  const email = "admin@example.com";
  const password = "Admin@123";

  const hashedPassword = await hashPassword(password);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      name: "Admin",
      email,
      hashedPassword,
      role: "ADMIN",
    },
  });

  console.log("✅ Admin user created:", admin.email);
}

createAdmin()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
