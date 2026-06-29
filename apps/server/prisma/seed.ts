import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await hash("admin123456", 10);
  const user = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      email: "admin@example.com",
      name: "管理员",
      passwordHash
    }
  });

  const project = await prisma.project.upsert({
    where: { id: "seed-project" },
    update: {},
    create: {
      id: "seed-project",
      name: "示例项目",
      description: "用于本地体验的默认项目",
      ownerId: user.id
    }
  });

  await prisma.application.upsert({
    where: { appKey: "demo-app-key" },
    update: {},
    create: {
      name: "示例应用",
      projectId: project.id,
      appKey: "demo-app-key",
      allowedDomains: ["localhost", "127.0.0.1"],
      environment: "production"
    }
  });
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
