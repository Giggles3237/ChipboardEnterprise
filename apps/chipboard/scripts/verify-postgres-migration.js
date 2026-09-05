const {
  createClassicPool,
  createPostgresPool,
  getMapping,
  loadEnv,
} = require('./migration-utils');

const CANONICAL_LEGACY_ORGANIZATION_ID = 'bmw-mini-of-pittsburgh';

async function mysqlCount(pool, tableName) {
  const [rows] = await pool.query(`SELECT COUNT(*) AS count FROM \`${tableName}\``);
  return Number(rows[0]?.count || 0);
}

async function pgOne(pool, sql, params = []) {
  const result = await pool.query(sql, params);
  return result.rows[0] || null;
}

async function pgCount(pool, tableName, where = '', params = []) {
  const result = await pool.query(`SELECT COUNT(*)::int AS count FROM ${tableName} ${where}`, params);
  return Number(result.rows[0]?.count || 0);
}

async function main() {
  loadEnv();
  const mysqlPool = createClassicPool();
  const pgPool = createPostgresPool();

  try {
    const organizationId = await getMapping(pgPool, 'organization', CANONICAL_LEGACY_ORGANIZATION_ID);
    if (!organizationId) {
      throw new Error('Canonical BMW/MINI of Pittsburgh organization mapping was not found. Run migration:import-foundation -- --write first.');
    }

    const organization = await pgOne(pgPool, 'SELECT id, name, slug, status FROM organizations WHERE id = $1', [organizationId]);
    const classicSales = await mysqlCount(mysqlPool, 'vehicle_sales');
    const classicUsers = await mysqlCount(mysqlPool, 'users');

    const report = {
      generatedAt: new Date().toISOString(),
      organization,
      counts: {
        classicUsers,
        enterpriseUsers: await pgCount(pgPool, 'users', 'WHERE organization_id = $1', [organizationId]),
        classicSales,
        enterpriseSales: await pgCount(pgPool, 'sales', 'WHERE organization_id = $1', [organizationId]),
        stores: await pgCount(pgPool, 'stores', 'WHERE organization_id = $1', [organizationId]),
        roles: await pgCount(pgPool, 'roles', 'WHERE organization_id = $1', [organizationId]),
        saleMappings: await pgCount(pgPool, 'migration_legacy_ids', "WHERE source_system = 'classic_mysql' AND entity_type = 'sale'"),
        userMappings: await pgCount(pgPool, 'migration_legacy_ids', "WHERE source_system = 'classic_mysql' AND entity_type = 'user'"),
      },
      salesBreakdown: {
        byDeliveryStatus: (await pgPool.query(
          `SELECT delivery_status, COUNT(*)::int AS count
           FROM sales
           WHERE organization_id = $1
           GROUP BY delivery_status
           ORDER BY delivery_status`,
          [organizationId]
        )).rows,
        bySaleType: (await pgPool.query(
          `SELECT COALESCE(sale_type, 'Unspecified') AS sale_type, COUNT(*)::int AS count
           FROM sales
           WHERE organization_id = $1
           GROUP BY COALESCE(sale_type, 'Unspecified')
           ORDER BY count DESC, sale_type`,
          [organizationId]
        )).rows,
        latestFive: (await pgPool.query(
          `SELECT stock_number, client_name, delivery_status, delivery_date, sale_type
           FROM sales
           WHERE organization_id = $1
           ORDER BY delivery_date DESC NULLS LAST, created_at DESC
           LIMIT 5`,
          [organizationId]
        )).rows,
      },
    };

    report.countsMatch = {
      users: report.counts.classicUsers === report.counts.enterpriseUsers,
      sales: report.counts.classicSales === report.counts.enterpriseSales,
    };

    console.log(JSON.stringify(report, null, 2));

    if (!report.countsMatch.users || !report.countsMatch.sales) {
      process.exitCode = 1;
    }
  } finally {
    await mysqlPool.end();
    await pgPool.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
