const {
  createClassicPool,
  createPostgresPool,
  ensureMigrationMap,
  getClassicTables,
  getMapping,
  loadEnv,
  logDryRun,
  normalizeStatus,
  parseArgs,
  readField,
  requirePostgresColumns,
  saveMapping,
} = require('./migration-utils');

const CANONICAL_LEGACY_ORGANIZATION_ID = 'bmw-mini-of-pittsburgh';
const CANONICAL_ORGANIZATION = {
  legacyId: CANONICAL_LEGACY_ORGANIZATION_ID,
  name: 'BMW/MINI of Pittsburgh',
  slug: 'bmw-mini-of-pittsburgh',
  storeName: 'BMW/MINI of Pittsburgh',
  storeCode: 'PIT',
};

const ROLE_PERMISSIONS = {
  Admin: ['view_users', 'manage_users', 'view_sales', 'manage_sales', 'view_goals', 'manage_goals', 'view_contests', 'manage_contests'],
  Manager: ['view_users', 'view_sales', 'manage_sales', 'view_goals', 'manage_goals', 'view_contests', 'manage_contests'],
  Salesperson: ['view_sales', 'manage_sales', 'view_goals', 'view_contests'],
};

function roleKey(name) {
  return String(name || 'salesperson').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'salesperson';
}

async function fetchLegacyOrganizationIds(mysqlPool, tables) {
  const ids = new Set([CANONICAL_LEGACY_ORGANIZATION_ID]);

  if (tables.has('organizations')) {
    const [rows] = await mysqlPool.query('SELECT id FROM organizations ORDER BY id');
    for (const row of rows) ids.add(String(row.id));
  }

  if (tables.has('users')) {
    const [rows] = await mysqlPool.query('SELECT DISTINCT organization_id FROM users WHERE organization_id IS NOT NULL ORDER BY organization_id');
    for (const row of rows) ids.add(String(row.organization_id));
  }

  if (tables.has('vehicle_sales')) {
    const [rows] = await mysqlPool.query('SELECT DISTINCT organization_id FROM vehicle_sales WHERE organization_id IS NOT NULL ORDER BY organization_id');
    for (const row of rows) ids.add(String(row.organization_id));
  }

  return [...ids];
}

async function upsertOrganization(pgPool) {
  const result = await pgPool.query(
    `INSERT INTO organizations (name, slug, status, timezone)
     VALUES ($1, $2, 'active', $3)
     ON CONFLICT (slug)
     DO UPDATE SET name = EXCLUDED.name, status = 'active', timezone = EXCLUDED.timezone, updated_at = now()
     RETURNING id`,
    [CANONICAL_ORGANIZATION.name, CANONICAL_ORGANIZATION.slug, process.env.MIGRATION_DEFAULT_TIMEZONE || 'America/New_York']
  );
  return result.rows[0].id;
}

async function upsertDefaultStore(pgPool, organizationId) {
  const result = await pgPool.query(
    `INSERT INTO stores (organization_id, name, code, status, timezone)
     VALUES ($1, $2, $3, 'active', $4)
     ON CONFLICT (organization_id, code)
     DO UPDATE SET name = EXCLUDED.name, status = 'active', timezone = EXCLUDED.timezone, updated_at = now()
     RETURNING id`,
    [organizationId, CANONICAL_ORGANIZATION.storeName, CANONICAL_ORGANIZATION.storeCode, process.env.MIGRATION_DEFAULT_TIMEZONE || 'America/New_York']
  );
  return result.rows[0].id;
}

async function upsertRole(pgPool, organizationId, roleName) {
  const key = roleKey(roleName);
  const result = await pgPool.query(
    `INSERT INTO roles (organization_id, key, name, description, system_role)
     VALUES ($1, $2, $3, $4, true)
     ON CONFLICT (organization_id, key)
     DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, updated_at = now()
     RETURNING id`,
    [organizationId, key, roleName, `Imported Classic ${roleName} role`]
  );

  const roleId = result.rows[0].id;
  for (const permission of ROLE_PERMISSIONS[roleName] || []) {
    await pgPool.query(
      `INSERT INTO role_permissions (organization_id, role_id, permission)
       VALUES ($1, $2, $3)
       ON CONFLICT (role_id, permission) DO NOTHING`,
      [organizationId, roleId, permission]
    );
  }

  return roleId;
}

async function fetchUsers(mysqlPool, tables) {
  if (!tables.has('users')) return [];
  const [rows] = await mysqlPool.query(`
    SELECT u.*, r.name AS role_name, o.name AS organization_name
    FROM users u
    LEFT JOIN roles r ON u.role_id = r.id
    LEFT JOIN organizations o ON u.organization_id = o.id
    ORDER BY u.id
  `);
  return rows;
}

async function upsertUser(pgPool, user, organizationId) {
  const email = String(readField(user, ['email'], `legacy-user-${user.id}@migration.local`)).trim().toLowerCase();
  const displayName = String(readField(user, ['name', 'display_name', 'displayName'], email)).trim();
  const legacyPassword = readField(user, ['password', 'password_hash'], null);
  const passwordHash = typeof legacyPassword === 'string' && (legacyPassword.startsWith('$2') || legacyPassword.startsWith('pbkdf2:'))
    ? legacyPassword
    : null;
  const status = passwordHash ? normalizeStatus(user.status) : 'invited';

  const result = await pgPool.query(
    `INSERT INTO users (organization_id, external_auth_id, email, display_name, password_hash, status)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (organization_id, email)
     DO UPDATE SET display_name = EXCLUDED.display_name, password_hash = EXCLUDED.password_hash, status = EXCLUDED.status, updated_at = now()
     RETURNING id`,
    [organizationId, `classic:mysql:user:${user.id}`, email, displayName, passwordHash, status]
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
      organizations: ['id', 'name', 'slug', 'status', 'timezone'],
      stores: ['id', 'organization_id', 'name', 'code', 'status', 'timezone'],
      roles: ['id', 'organization_id', 'key', 'name'],
      role_permissions: ['organization_id', 'role_id', 'permission'],
      users: ['id', 'organization_id', 'email', 'display_name', 'password_hash', 'status'],
      user_roles: ['organization_id', 'user_id', 'role_id'],
    });

    const tables = await getClassicTables(mysqlPool);
    const legacyOrganizationIds = await fetchLegacyOrganizationIds(mysqlPool, tables);
    const users = await fetchUsers(mysqlPool, tables);
    const summary = { organizations: 1, legacyOrganizationMappings: legacyOrganizationIds.length, stores: 1, roles: Object.keys(ROLE_PERMISSIONS).length, users: 0, userRoles: 0, skippedUsers: 0 };

    if (!args.write) {
      summary.users = users.length;
      summary.userRoles = users.filter((user) => user.role_name).length;
      console.log(JSON.stringify({ write: args.write, canonicalOrganization: CANONICAL_ORGANIZATION.name, summary }, null, 2));
      return;
    }

    await ensureMigrationMap(pgPool);

    const organizationId = await upsertOrganization(pgPool);
    const storeId = await upsertDefaultStore(pgPool, organizationId);

    for (const legacyOrganizationId of legacyOrganizationIds) {
      await saveMapping(pgPool, 'organization', legacyOrganizationId, organizationId, { name: CANONICAL_ORGANIZATION.name, collapsedToCanonical: true });
      await saveMapping(pgPool, 'store', `${legacyOrganizationId}:default`, storeId, { name: CANONICAL_ORGANIZATION.storeName, defaultStore: true, collapsedToCanonical: true });
    }

    const roleIds = new Map();
    for (const roleName of Object.keys(ROLE_PERMISSIONS)) {
      roleIds.set(roleName, await upsertRole(pgPool, organizationId, roleName));
    }

    for (const user of users) {
      const userId = await upsertUser(pgPool, user, organizationId);
      await saveMapping(pgPool, 'user', user.id, userId, { email: user.email, role: user.role_name, collapsedToCanonical: true });
      summary.users += 1;

      const roleId = roleIds.get(user.role_name || 'Salesperson');
      if (roleId) {
        await pgPool.query(
          `INSERT INTO user_roles (organization_id, user_id, role_id)
           VALUES ($1, $2, $3)
           ON CONFLICT (user_id, role_id) DO NOTHING`,
          [organizationId, userId, roleId]
        );
        summary.userRoles += 1;
      }
    }

    console.log(JSON.stringify({ write: args.write, canonicalOrganization: CANONICAL_ORGANIZATION.name, summary }, null, 2));
  } finally {
    await mysqlPool.end();
    await pgPool.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
