import { config } from "dotenv";
import pg from "pg";

config({ path: "../../.env" });
config({ path: "../../.env.local", override: true });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString,
  ssl: { rejectUnauthorized: true },
});

try {
  const result = await pool.query(
    "select table_name from information_schema.tables where table_schema = 'public' order by table_name"
  );
  console.log(result.rows.map((row) => row.table_name).join("\n"));
} finally {
  await pool.end();
}