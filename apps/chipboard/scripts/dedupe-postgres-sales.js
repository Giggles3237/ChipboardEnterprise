const {
  createPostgresPool,
  getMapping,
  loadEnv,
} = require('./migration-utils');

const CANONICAL_LEGACY_ORGANIZATION_ID = 'bmw-mini-of-pittsburgh';

function parseArgs(argv = process.argv.slice(2)) {
  return { write: argv.includes('--write') };
}

async function main() {
  loadEnv();
  const args = parseArgs();
  const pgPool = createPostgresPool();

  try {
    const organizationId = await getMapping(pgPool, 'organization', CANONICAL_LEGACY_ORGANIZATION_ID);
    if (!organizationId) {
      throw new Error('Canonical BMW/MINI of Pittsburgh organization mapping was not found.');
    }

    const duplicateResult = await pgPool.query(
      `SELECT source_id, array_agg(id ORDER BY created_at DESC, id) AS ids, COUNT(*)::int AS count
       FROM sales
       WHERE organization_id = $1
       AND source_system = 'classic_mysql'
       AND source_id IS NOT NULL
       GROUP BY source_id
       HAVING COUNT(*) > 1
       ORDER BY COUNT(*) DESC, source_id`,
      [organizationId]
    );

    const idsToDelete = [];
    const duplicateGroups = [];

    for (const row of duplicateResult.rows) {
      const mappedId = await getMapping(pgPool, 'sale', row.source_id);
      const ids = row.ids.map(String);
      const keepId = mappedId && ids.includes(String(mappedId)) ? String(mappedId) : ids[0];
      const deleteIds = ids.filter((id) => id !== keepId);

      idsToDelete.push(...deleteIds);
      duplicateGroups.push({ sourceId: row.source_id, count: row.count, keepId, deleteCount: deleteIds.length });
    }

    const summary = {
      write: args.write,
      duplicateGroups: duplicateGroups.length,
      rowsToDelete: idsToDelete.length,
      sample: duplicateGroups.slice(0, 10),
    };

    if (!args.write) {
      console.log(JSON.stringify(summary, null, 2));
      console.log('DRY RUN: no rows deleted. Re-run with --write to delete duplicate Classic sales rows.');
      return;
    }

    if (idsToDelete.length > 0) {
      await pgPool.query('DELETE FROM sales WHERE id = ANY($1::uuid[])', [idsToDelete]);
    }

    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await pgPool.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
