const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function test() {
  try {
    const result = await prisma.$queryRaw`SELECT 1`;
    console.log("DB connected:", result);
  } catch (err) {
    console.error(err);
  }
}

test();
