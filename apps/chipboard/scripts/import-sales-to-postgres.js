const {
  createClassicPool,
  createPostgresPool,
  ensureMigrationMap,
  getClassicTables,
  getMapping,
  loadEnv,
  logDryRun,
  normalizeDate,
  normalizeDeliveryStatus,
  parseArgs,
  readField,
  requirePostgresColumns,
  saveMapping,
} = require('./migration-utils');

const CANONICAL_LEGACY_ORGANIZATION_ID = 'bmw-mini-of-pittsburgh';

async function fetchSales(mysqlPool, limit) {
  const sql = `SELECT * FROM vehicle_sales ORDER BY id${limit ? ' LIMIT ?' : ''}`;
  const [rows] = await mysqlPool.query(sql, limit ? [limit] : []);
  return rows;
}

async function fetchUserOrganizationMap(mysqlPool, tables) {
  const map = new Map();
  if (!tables.has('users')) return map;

  const [rows] = await mysqlPool.query('SELECT id, organization_id FROM users WHERE organization_id IS NOT NULL');
  for (const row of rows) {
    map.set(String(row.id), row.organization_id);
  }
  return map;
}

function resolveLegacyOrganizationId(sale, userOrganizationMap) {
  const directOrganizationId = readField(sale, ['organization_id', 'organizationId'], null);
  if (directOrganizationId) return { legacyOrganizationId: directOrganizationId, source: 'sale' };

  const legacyUserId = readField(sale, ['user_id', 'salesperson_user_id', 'created_by_user_id'], null);
  if (legacyUserId && userOrganizationMap.has(String(legacyUserId))) {
    return { legacyOrganizationId: userOrganizationMap.get(String(legacyUserId)), source: 'user' };
  }

  return { legacyOrganizationId: CANONICAL_LEGACY_ORGANIZATION_ID, source: 'canonical_default' };
}

async function insertSale(pgPool, sale, organizationId, storeId, salespersonUserId, createdByUserId) {
  const clientName = String(readField(sale, ['clientName', 'client_name'], 'Unknown Client')).trim() || 'Unknown Client';
  const stockNumber = String(readField(sale, ['stockNumber', 'stock_number'], `legacy-${sale.id}`)).trim() || `legacy-${sale.id}`;
  const year = Number(readField(sale, ['year'], 0)) || null;

  const result = await pgPool.query(
    `INSERT INTO sales (
       organization_id,
       store_id,
       salesperson_user_id,
       client_name,
       stock_number,
       year,
       make,
       model,
       color,
       advisor,
       delivery_status,
       delivery_date,
       sale_type,
       source_system,
       source_id,
       created_by_user_id,
       created_at,
       updated_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'classic_mysql', $14, $15, COALESCE($16, now()), COALESCE($17, now()))
     RETURNING id`,
    [
      organizationId,
      storeId,
      salespersonUserId,
      clientName,
      stockNumber,
      year,
      readField(sale, ['make'], null),
      readField(sale, ['model'], null),
      readField(sale, ['color'], null),
      readField(sale, ['advisor'], null),
      normalizeDeliveryStatus(sale),
      normalizeDate(readField(sale, ['deliveryDate', 'delivery_date'], null)),
      readField(sale, ['type', 'sale_type'], null),
      String(sale.id),
      createdByUserId,
      normalizeDate(readField(sale, ['created_at', 'createdAt'], null)),
      normalizeDate(readField(sale, ['updated_at', 'updatedAt'], null)),
    ]
  );

  return result.rows[0].id;
}

async function main() {
  loadEnv();
  const args = parseArgs();
  logDryRun(args.write);

  const mysqlPool = createClassicPool();
  const pgPool = createPostgresPool();

  try {
    await requirePostgresColumns(pgPool, {
      sales: [
        'id',
        'organization_id',
        'store_id',
        'salesperson_user_id',
        'client_name',
        'stock_number',
        'year',
        'make',
        'model',
        'color',
        'advisor',
        'delivery_status',
        'delivery_date',
        'sale_type',
        'source_system',
        'source_id',
        'created_by_user_id',
      ],
    });

    const tables = await getClassicTables(mysqlPool);
    if (!tables.has('vehicle_sales')) {
      throw new Error('Classic MySQL table vehicle_sales was not found. Nothing to import.');
    }

    if (args.write) await ensureMigrationMap(pgPool);

    const userOrganizationMap = await fetchUserOrganizationMap(mysqlPool, tables);
    const sales = await fetchSales(mysqlPool, args.limit);
    const summary = {
      scanned: sales.length,
      imported: 0,
      skippedExisting: 0,
      skippedMissingOrganizationMapping: 0,
      skippedErrors: 0,
      organizationFromSale: 0,
      organizationFromUser: 0,
      organizationFromCanonicalDefault: 0,
    };

    for (const sale of sales) {
      try {
        if (args.write) {
          const existing = await getMapping(pgPool, 'sale', sale.id);
          if (existing && !args.update) {
            summary.skippedExisting += 1;
            continue;
          }
        }

        const { legacyOrganizationId, source } = resolveLegacyOrganizationId(sale, userOrganizationMap);
        if (source === 'sale') summary.organizationFromSale += 1;
        if (source === 'user') summary.organizationFromUser += 1;
        if (source === 'canonical_default') summary.organizationFromCanonicalDefault += 1;

        if (!args.write) {
          summary.imported += 1;
          continue;
        }

        const organizationId = await getMapping(pgPool, 'organization', legacyOrganizationId);
        const storeId = await getMapping(pgPool, 'store', `${legacyOrganizationId}:default`);
        if (!organizationId) {
          summary.skippedMissingOrganizationMapping += 1;
          continue;
        }

        const legacyUserId = readField(sale, ['user_id', 'salesperson_user_id', 'created_by_user_id'], null);
        const userId = legacyUserId ? await getMapping(pgPool, 'user', legacyUserId) : null;
        const enterpriseSaleId = await insertSale(pgPool, sale, organizationId, storeId, userId, userId);
        await saveMapping(pgPool, 'sale', sale.id, enterpriseSaleId, {
          stockNumber: readField(sale, ['stockNumber', 'stock_number'], null),
          legacyOrganizationId,
          organizationSource: source,
          collapsedToCanonical: true,
        });
        summary.imported += 1;
      } catch (error) {
        summary.skippedErrors += 1;
        console.error(`Skipping sale ${sale.id}: ${error.message}`);
      }
    }

    console.log(JSON.stringify({ write: args.write, update: args.update, canonicalOrganization: 'BMW/MINI of Pittsburgh', summary }, null, 2));
  } finally {
    await mysqlPool.end();
    await pgPool.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
