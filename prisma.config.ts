import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  engine: "classic",
  datasource: {
    url: env("DATABASE_URL"),
    directUrl: env("DIRECT_URL"),
  },
  // @ts-ignore - seed is not yet in the type definition but supported
  seed: {
    command: 'ts-node --compiler-options {"module":"CommonJS"} prisma/seed.ts',
  },
});
