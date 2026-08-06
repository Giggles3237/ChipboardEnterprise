import { config } from "dotenv";
import pg from "pg";

config({ path: "../../.env" });
config({ path: "../../.env.local", override: true });

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes("sslmode=require") ? { rejectUnauthorized: true } : undefined,
});

try {
  const result = await pool.query("select current_database() as database, current_user as user, version() as version");
  const row = result.rows[0];
  console.log(`Connected to ${row.database} as ${row.user}`);
  console.log(row.version);
} finally {
  await pool.end();
}