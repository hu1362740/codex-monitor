import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

try {
  await prisma.$queryRawUnsafe("SELECT 1");
  console.log("Database connection succeeded.");
} catch (error) {
  console.error(`Database connection failed${error.code ? ` (${error.code})` : ""}.`);
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
