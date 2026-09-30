import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Même ordre de priorité que Next.js : .env.local puis .env
config({ path: [".env.local", ".env"], quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: {
    // Valeur factice si absente : permet `prisma generate` sans base configurée.
    url: process.env.DATABASE_URL ?? "postgresql://user:password@localhost:5432/kairos",
  },
});
