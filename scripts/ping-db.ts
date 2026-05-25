import { config } from "dotenv";
config({ path: ".env.local" });

import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const result = await prisma.$queryRaw<{ ok: number }[]>`SELECT 1 AS ok`;
    console.log("DB ping OK:", result);

    const tableCount = await prisma.$queryRaw<{ count: string }[]>`
      SELECT COUNT(*) as count FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name != '_prisma_migrations'
    `;
    console.log("Tables in DB:", tableCount[0].count);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch(console.error);
