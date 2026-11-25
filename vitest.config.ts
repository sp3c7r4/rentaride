import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

if (existsSync(".env")) process.loadEnvFile(".env");

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // `server-only` throws outside React Server Components; tests run in Node.
      "server-only": fileURLToPath(
        new URL("./tests/server-only.ts", import.meta.url),
      ),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Integration tests share one database; run files one at a time.
    fileParallelism: false,
    env: {
      NODE_ENV: "test",
      // Tests never touch the development database.
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? "",
      // Separate Redis database: queued test emails never reach the dev worker.
      REDIS_URL: "redis://127.0.0.1:6383/1",
      // Payments and payouts simulate without a Paystack key.
      PAYSTACK_SECRET_KEY: "",
    },
  },
});
