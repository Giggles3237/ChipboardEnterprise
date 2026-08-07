const test = require('node:test');
const assert = require('node:assert/strict');

const {
  MysqlIdentityAuditLogger,
  MysqlIdentityEventOutboxPublisher
} = require('../services/identityEvents');
const { MysqlUsersRepository } = require('../services/usersRepository');
const { UsersService } = require('../services/usersService');

const createPoolStub = (handler) => {
  const calls = [];
  return {
    calls,
    async query(sql, params = []) {
      calls.push({ sql, params });
      return handler ? handler(sql, params) : [{ affectedRows: 1 }];
    }
  };
};

test('identity events are persisted to the enterprise event outbox', async () => {
  const pool = createPoolStub();
  const publisher = new MysqlIdentityEventOutboxPublisher(pool);

  await publisher.publish({
    id: 'identity-event-1',
    organizationId: 42,
    type: 'user.role.updated',
    payload: { userId: 9, role: 'Manager' },
    actorUserId: 7,
    occurredAt: '2026-08-06T12:00:00.000Z'
  });

  assert.match(pool.calls[0].sql, /CREATE TABLE IF NOT EXISTS event_outbox/);
  assert.match(pool.calls[1].sql, /INSERT INTO event_outbox/);
  assert.deepEqual(pool.calls[1].params.slice(0, 5), [
    'identity-event-1',
    42,
    null,
    'user.role.updated',
    JSON.stringify({ userId: 9, role: 'Manager' })
  ]);
});

test('identity audit entries are persisted with tenant metadata', async () => {
  const pool = createPoolStub();
  const audit = new MysqlIdentityAuditLogger(pool);

  await audit.record({
    organizationId: 42,
    actorUserId: 7,
    action: 'update',
    entityType: 'user',
    entityId: 9,
    previousValue: { status: 'active' },
    newValue: { status: 'inactive' }
  });

  assert.match(pool.calls[0].sql, /CREATE TABLE IF NOT EXISTS audit_logs/);
  assert.match(pool.calls[1].sql, /INSERT INTO audit_logs/);
  assert.deepEqual(pool.calls[1].params, [
    42,
    7,
    'update',
    'user',
    9,
    JSON.stringify({ status: 'active' }),
    JSON.stringify({ status: 'inactive' })
  ]);
});

test('user repository scopes role updates to the authenticated organization', async () => {
  const pool = createPoolStub((sql) => {
    if (/SELECT u\.\*, r\.name as role_name/.test(sql)) {
      return [[{ id: 9, organization_id: 42, role_id: 1, role_name: 'Salesperson' }]];
    }
    if (/SELECT id FROM roles/.test(sql)) {
      return [[{ id: 2 }]];
    }
    if (/UPDATE users SET role_id/.test(sql)) {
      return [{ affectedRows: 1 }];
    }
    return [[]];
  });
  const repository = new MysqlUsersRepository(pool, {});

  const result = await repository.updateRole({ organizationId: 42 }, '9', 'Manager');

  assert.equal(result.user.role_id, 2);
  const updateCall = pool.calls.find(call => /UPDATE users SET role_id/.test(call.sql));
  assert.match(updateCall.sql, /WHERE id = \? AND organization_id = \?/);
  assert.deepEqual(updateCall.params, [2, '9', 42]);
});

test('users service emits durable event and audit records for role updates', async () => {
  const events = [];
  const audits = [];
  const service = new UsersService({
    repository: {
      async updateRole(context, userId, role) {
        return {
          previousUser: { id: userId, organization_id: context.organizationId, role_name: 'Salesperson' },
          user: { id: userId, organization_id: context.organizationId, role_name: role }
        };
      }
    },
    bcrypt: {},
    events: {
      async publish(event) {
        events.push(event);
      }
    },
    audit: {
      async record(entry) {
        audits.push(entry);
      }
    }
  });

  const user = await service.updateRole(
    { organizationId: 42, actorUserId: 7 },
    '9',
    { role: 'Manager' }
  );

  assert.equal(user.role_name, 'Manager');
  assert.equal(events[0].type, 'user.role.updated');
  assert.equal(events[0].organizationId, 42);
  assert.equal(audits[0].action, 'update');
  assert.equal(audits[0].entityType, 'user');
  assert.deepEqual(audits[0].previousValue, { id: '9', organization_id: 42, role_name: 'Salesperson' });
  assert.deepEqual(audits[0].newValue, { id: '9', organization_id: 42, role_name: 'Manager' });
});
