import dotenv from "dotenv";
import { defineConfig } from "prisma/config";

// `.env.local` must win over `.env` (Prisma’s default `.env` often has localhost).
dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local", override: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
