const {
  createClassicPool,
  getClassicColumns,
  getClassicTables,
  loadEnv,
  parseArgs,
  redactRow,
} = require('./migration-utils');

const CORE_TABLES = [
  'organizations',
  'roles',
  'users',
  'vehicle_sales',
  'monthly_goals',
  'contests',
  'contest_bonuses',
  'loaner_settings',
  'loaner_sheets',
];

async function countRows(pool, tableName) {
  const [rows] = await pool.query(`SELECT COUNT(*) AS count FROM \`${tableName}\``);
  return Number(rows[0]?.count || 0);
}

async function sampleRows(pool, tableName) {
  const [rows] = await pool.query(`SELECT * FROM \`${tableName}\` LIMIT 3`);
  return rows.map(redactRow);
}

async function profileTable(pool, tableName, includeSample) {
  const columns = await getClassicColumns(pool, tableName);
  return {
    table: tableName,
    rowCount: await countRows(pool, tableName),
    columns,
    sample: includeSample ? await sampleRows(pool, tableName) : undefined,
  };
}

async function main() {
  loadEnv();
  const args = parseArgs();
  const mysqlPool = createClassicPool();

  try {
    const tables = await getClassicTables(mysqlPool);
    const selectedTables = args.limit ? [...tables].slice(0, args.limit) : [...tables];
    const coreTables = CORE_TABLES.filter((table) => tables.has(table));
    const missingCoreTables = CORE_TABLES.filter((table) => !tables.has(table));

    const report = {
      generatedAt: new Date().toISOString(),
      source: {
        host: process.env.MYSQL_HOST,
        database: process.env.MYSQL_DATABASE,
      },
      summary: {
        tableCount: tables.size,
        coreTables,
        missingCoreTables,
      },
      coreProfiles: [],
      allTableCounts: [],
      nextSteps: [
        'Review missing core tables and confirm which Classic modules are in scope.',
        'Run migration:import-foundation first, then migration:import-sales.',
        'Use --write only after dry-run counts look correct.',
      ],
    };

    for (const tableName of coreTables) {
      report.coreProfiles.push(await profileTable(mysqlPool, tableName, true));
    }

    for (const tableName of selectedTables) {
      report.allTableCounts.push({ table: tableName, rowCount: await countRows(mysqlPool, tableName) });
    }

    console.log(JSON.stringify(report, null, 2));
  } finally {
    await mysqlPool.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
