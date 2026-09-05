const path = require('path');
const dotenv = require('dotenv');
const mysql = require('mysql2/promise');


const rootDir = path.resolve(__dirname, '../../..');
const classicDir = path.resolve(__dirname, '..');

function loadEnv() {
  for (const file of [
    path.join(rootDir, '.env'),
    path.join(rootDir, '.env.local'),
    path.join(classicDir, '.env'),
    path.join(classicDir, '.env.local'),
  ]) {
    dotenv.config({ path: file, override: true });
  }
}

function parseArgs(argv = process.argv.slice(2)) {
  const args = { write: false, update: false, limit: undefined };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--write') args.write = true;
    if (arg === '--update') args.update = true;
    if (arg === '--limit') args.limit = Number(argv[index + 1]);
  }

  return args;
}

function createClassicPool() {
  for (const key of ['MYSQL_HOST', 'MYSQL_USER', 'MYSQL_PASSWORD', 'MYSQL_DATABASE']) {
    if (!process.env[key]) throw new Error(`${key} is required for Classic MySQL migration scripts.`);
  }

  return mysql.createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    ssl: { rejectUnauthorized: false },
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,
  });
}

function createPostgresPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is required for enterprise Postgres migration scripts.');

  const pg = require('pg');
  return new pg.Pool({
    connectionString,
    ssl: connectionString.includes('sslmode=require') ? { rejectUnauthorized: true } : undefined,
  });
}

async function getClassicTables(mysqlPool) {
  const [rows] = await mysqlPool.query(
    `SELECT TABLE_NAME AS tableName FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() ORDER BY TABLE_NAME`
  );
  return new Set(rows.map((row) => row.tableName));
}

async function getClassicColumns(mysqlPool, tableName) {
  const [rows] = await mysqlPool.query(
    `SELECT COLUMN_NAME AS columnName, DATA_TYPE AS dataType FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? ORDER BY ORDINAL_POSITION`,
    [tableName]
  );
  return rows;
}

async function requirePostgresColumns(pgPool, requirements) {
  const missing = [];
  for (const [tableName, columns] of Object.entries(requirements)) {
    const result = await pgPool.query(
      `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1`,
      [tableName]
    );
    const existing = new Set(result.rows.map((row) => row.column_name));
    for (const column of columns) {
      if (!existing.has(column)) missing.push(`${tableName}.${column}`);
    }
  }

  if (missing.length > 0) {
    throw new Error(`Postgres schema is missing required columns: ${missing.join(', ')}. Run pnpm db:migrate first.`);
  }
}

async function ensureMigrationMap(pgPool) {
  await pgPool.query(`
    CREATE TABLE IF NOT EXISTS migration_legacy_ids (
      source_system text NOT NULL,
      entity_type text NOT NULL,
      legacy_id text NOT NULL,
      enterprise_id uuid NOT NULL,
      metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
      migrated_at timestamptz DEFAULT now() NOT NULL,
      PRIMARY KEY (source_system, entity_type, legacy_id)
    )
  `);
}

async function getMapping(pgPool, entityType, legacyId) {
  const result = await pgPool.query(
    `SELECT enterprise_id FROM migration_legacy_ids WHERE source_system = 'classic_mysql' AND entity_type = $1 AND legacy_id = $2`,
    [entityType, String(legacyId)]
  );
  return result.rows[0]?.enterprise_id ?? null;
}

async function saveMapping(pgPool, entityType, legacyId, enterpriseId, metadata = {}) {
  await pgPool.query(
    `INSERT INTO migration_legacy_ids (source_system, entity_type, legacy_id, enterprise_id, metadata)
     VALUES ('classic_mysql', $1, $2, $3, $4::jsonb)
     ON CONFLICT (source_system, entity_type, legacy_id)
     DO UPDATE SET enterprise_id = EXCLUDED.enterprise_id, metadata = EXCLUDED.metadata, migrated_at = now()`,
    [entityType, String(legacyId), enterpriseId, JSON.stringify(metadata)]
  );
}

function slugify(value) {
  return String(value || 'chipboard')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 63) || 'chipboard';
}

function uniqueSlug(base, legacyId) {
  const suffix = String(legacyId || '').replace(/[^a-z0-9]/gi, '').slice(0, 8).toLowerCase();
  const slug = slugify(base);
  return suffix ? `${slug.slice(0, Math.max(1, 62 - suffix.length))}-${suffix}`.slice(0, 63) : slug;
}

function storeCode(value, fallbackId) {
  const raw = String(value || `store-${fallbackId || 'main'}`)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return raw || 'MAIN';
}

function normalizeStatus(value) {
  const status = String(value || '').toLowerCase();
  if (status === 'active') return 'active';
  if (status === 'inactive' || status === 'disabled') return 'disabled';
  return 'invited';
}

function normalizeDeliveryStatus(row) {
  if (String(row.delivery_status || '').toLowerCase() === 'cancelled') return 'cancelled';
  return Number(row.delivered ?? row.deliveryStatus ?? 0) === 1 ? 'delivered' : 'pending';
}

function normalizeDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function readField(row, names, fallback = null) {
  for (const name of names) {
    if (row[name] !== undefined && row[name] !== null && row[name] !== '') return row[name];
  }
  return fallback;
}

function redactRow(row) {
  const redacted = { ...row };
  for (const key of Object.keys(redacted)) {
    if (/password|token|secret|hash/i.test(key)) redacted[key] = '[redacted]';
  }
  return redacted;
}

function logDryRun(write) {
  if (!write) {
    console.log('DRY RUN: no Postgres writes will be made. Re-run with --write to import.');
  }
}

module.exports = {
  createClassicPool,
  createPostgresPool,
  ensureMigrationMap,
  getClassicColumns,
  getClassicTables,
  getMapping,
  loadEnv,
  logDryRun,
  normalizeDate,
  normalizeDeliveryStatus,
  normalizeStatus,
  parseArgs,
  readField,
  redactRow,
  requirePostgresColumns,
  saveMapping,
  slugify,
  storeCode,
  uniqueSlug,
};
