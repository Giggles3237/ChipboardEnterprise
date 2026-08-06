import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: "../../.env" });
config({ path: "../../.env.local", override: true });

if (!process.env.DATABASE_URL) {
  console.warn("DATABASE_URL is not set. Commands that connect to the database will fail until it is provided.");
}

export default defineConfig({
  schema: "./src/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgresql://placeholder:placeholder@localhost:5432/chipboard",
  },
});