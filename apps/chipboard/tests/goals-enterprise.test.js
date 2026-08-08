const test = require('node:test');
const assert = require('node:assert/strict');

const { oldPool } = require('../db');
const goalsRouter = require('../routes/goals');
const { MysqlGoalsAuditLogger, MysqlGoalsEventOutboxPublisher } = require('../services/goalsEvents');
const { GoalsService } = require('../services/goalsService');

const findRouteHandler = (method, path) => {
  const layer = goalsRouter.stack.find(candidate =>
    candidate.route?.path === path && candidate.route.methods[method]
  );

  assert.ok(layer, `${method.toUpperCase()} ${path} must exist`);
  return layer.route.stack.at(-1).handle;
};

const invokeHandler = async (handler, options = {}) => {
  const { params = {}, body = {}, role = 'Admin', name = 'Chris', organizationId = 42 } = options;
  let statusCode = 200;
  let responseBody;
  const req = {
    params,
    body,
    auth: { userId: 7, role, name, organizationId }
  };
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(payload) {
      responseBody = payload;
      return this;
    }
  };

  await handler(req, res);
  return { statusCode, responseBody };
};

const createPoolStub = () => {
  const calls = [];
  return {
    calls,
    async query(sql, params = []) {
      calls.push({ sql, params });
      return [{ affectedRows: 1 }];
    }
  };
};

test('goal events are persisted to the enterprise event outbox', async () => {
  const pool = createPoolStub();
  const publisher = new MysqlGoalsEventOutboxPublisher(pool);

  await publisher.publish({
    id: 'goal-event-1',
    organizationId: 42,
    type: 'goal.updated',
    payload: { goal: { advisorName: 'Chris', month: '2026-08', goalCount: 12 } },
    actorUserId: 7,
    occurredAt: '2026-08-06T12:00:00.000Z'
  });

  assert.match(pool.calls[0].sql, /CREATE TABLE IF NOT EXISTS event_outbox/);
  assert.match(pool.calls[1].sql, /INSERT INTO event_outbox/);
  assert.deepEqual(pool.calls[1].params.slice(0, 5), [
    'goal-event-1',
    42,
    null,
    'goal.updated',
    JSON.stringify({ goal: { advisorName: 'Chris', month: '2026-08', goalCount: 12 } })
  ]);
});

test('goal audit entries are persisted with tenant metadata', async () => {
  const pool = createPoolStub();
  const audit = new MysqlGoalsAuditLogger(pool);

  await audit.record({
    organizationId: 42,
    actorUserId: 7,
    action: 'update',
    entityType: 'goal',
    entityId: 'Chris:2026-08',
    previousValue: { goalCount: 10 },
    newValue: { goalCount: 12 }
  });

  assert.match(pool.calls[0].sql, /CREATE TABLE IF NOT EXISTS audit_logs/);
  assert.match(pool.calls[1].sql, /INSERT INTO audit_logs/);
  assert.deepEqual(pool.calls[1].params, [
    42,
    7,
    'update',
    'goal',
    'Chris:2026-08',
    JSON.stringify({ goalCount: 10 }),
    JSON.stringify({ goalCount: 12 })
  ]);
});

test('goals month list is scoped to the authenticated organization', async () => {
  const originalQuery = oldPool.query;
  const calls = [];
  oldPool.query = async (sql, params = []) => {
    calls.push({ sql, params });
    if (/information_schema\.COLUMNS/.test(sql)) return [[{ COLUMN_NAME: 'organization_id' }]];
    if (/FROM monthly_goals/.test(sql)) return [[]];
    return [{ affectedRows: 1 }];
  };

  try {
    const handler = findRouteHandler('get', '/month/:month');
    const result = await invokeHandler(handler, {
      params: { month: '2026-08' },
      organizationId: 123
    });

    assert.equal(result.statusCode, 200);
    const listCall = calls.find(call => /SELECT advisor_name/.test(call.sql));
    assert.match(listCall.sql, /organization_id = \?/);
    assert.deepEqual(listCall.params, ['2026-08', 123]);
  } finally {
    oldPool.query = originalQuery;
  }
});

test('goal writes emit goal and leaderboard events plus audit', async () => {
  const events = [];
  const audits = [];
  const service = new GoalsService({
    repository: {
      async upsertGoal(context, input) {
        return {
          previousGoal: { id: 'Chris:2026-08', organizationId: context.organizationId, advisorName: 'Chris', month: '2026-08', goalCount: 10 },
          goal: { id: 'Chris:2026-08', organizationId: context.organizationId, advisorName: input.advisorName, month: input.month, goalCount: input.goalCount }
        };
      }
    },
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

  const goal = await service.upsertGoal(
    { organizationId: 42, actorUserId: 7 },
    { advisorName: 'Chris', month: '2026-08', goalCount: 12 }
  );

  assert.equal(goal.goalCount, 12);
  assert.deepEqual(events.map(event => event.type), ['goal.updated', 'leaderboard.recalculated']);
  assert.equal(events[0].organizationId, 42);
  assert.equal(audits[0].entityType, 'goal');
  assert.equal(audits[0].action, 'update');
});

test('non-admin users can only update their own individual goal', async () => {
  const handler = findRouteHandler('post', '/');
  const result = await invokeHandler(handler, {
    role: 'Salesperson',
    name: 'Chris',
    body: { advisor: 'Other Advisor', month: '2026-08', goal_count: 10 }
  });

  assert.equal(result.statusCode, 403);
  assert.deepEqual(result.responseBody, { message: 'Unauthorized to set this goal' });
});
