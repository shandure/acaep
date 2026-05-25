import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Prisma CLI doesn't load Next.js's .env.local automatically, so we load it here.
config({ path: ".env.local" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
