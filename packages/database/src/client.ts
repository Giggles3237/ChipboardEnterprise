import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema.js";

export type DatabaseConfig = {
  connectionString?: string;
};

export function createPostgresPool(config: DatabaseConfig = {}): Pool {
  const connectionString = config.connectionString ?? process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is required to connect to Postgres.");
  }

  return new Pool({
    connectionString,
    ssl: connectionString.includes("sslmode=require") ? { rejectUnauthorized: true } : undefined,
  });
}

export function createDatabase(config: DatabaseConfig = {}) {
  return drizzle(createPostgresPool(config), { schema });
}

export { schema };