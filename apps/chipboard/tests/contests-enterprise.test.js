const test = require('node:test');
const assert = require('node:assert/strict');

const { MysqlContestsAuditLogger, MysqlContestsEventOutboxPublisher } = require('../services/contestsEvents');
const { ContestsService } = require('../services/contestsService');

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

test('contest events are persisted to the enterprise event outbox', async () => {
  const pool = createPoolStub();
  const publisher = new MysqlContestsEventOutboxPublisher(pool);

  await publisher.publish({
    id: 'contest-event-1',
    organizationId: 42,
    type: 'contest.score.updated',
    payload: { contestId: 3, saleId: 9 },
    actorUserId: 7,
    occurredAt: '2026-08-08T12:00:00.000Z'
  });

  assert.match(pool.calls[0].sql, /CREATE TABLE IF NOT EXISTS event_outbox/);
  assert.match(pool.calls[1].sql, /INSERT INTO event_outbox/);
  assert.deepEqual(pool.calls[1].params.slice(0, 5), [
    'contest-event-1',
    42,
    null,
    'contest.score.updated',
    JSON.stringify({ contestId: 3, saleId: 9 })
  ]);
});

test('contest audit entries are persisted with tenant metadata', async () => {
  const pool = createPoolStub();
  const audit = new MysqlContestsAuditLogger(pool);

  await audit.record({
    organizationId: 42,
    actorUserId: 7,
    action: 'update',
    entityType: 'contest',
    entityId: '3',
    previousValue: { status: 'active' },
    newValue: { status: 'closed' }
  });

  assert.match(pool.calls[0].sql, /CREATE TABLE IF NOT EXISTS audit_logs/);
  assert.match(pool.calls[1].sql, /INSERT INTO audit_logs/);
  assert.deepEqual(pool.calls[1].params, [
    42,
    7,
    'update',
    'contest',
    '3',
    JSON.stringify({ status: 'active' }),
    JSON.stringify({ status: 'closed' })
  ]);
});

test('contest deal scoring emits score and leaderboard events plus audit', async () => {
  const events = [];
  const audits = [];
  const service = new ContestsService({
    repository: {
      async scoreDeal(context, contestId, saleId, input) {
        return {
          previousScore: undefined,
          score: {
            contestId,
            saleId,
            advisor: input.advisor,
            categoryId: input.categoryId,
            countToward: Boolean(input.countToward),
            rewardsCompleted: Boolean(input.rewardsCompleted),
            status: 'pending',
            basePoints: input.basePoints,
            rewardsPoints: input.rewardsPoints
          }
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

  await service.scoreDeal(
    { organizationId: 42, actorUserId: 7 },
    '3',
    '9',
    { advisor: 'Chris', categoryId: '2', countToward: true, rewardsCompleted: false, basePoints: 2, rewardsPoints: 1 }
  );

  assert.deepEqual(events.map(event => event.type), ['contest.score.updated', 'leaderboard.recalculated']);
  assert.equal(events[0].organizationId, 42);
  assert.equal(audits[0].entityType, 'contest_deal_score');
  assert.equal(audits[0].action, 'create');
});

test('contest bonuses emit reward and leaderboard events plus audit', async () => {
  const events = [];
  const audits = [];
  const service = new ContestsService({
    repository: {
      async addBonus(context, contestId, input) {
        return {
          bonus: { id: '11', contestId, advisor: input.advisor, reason: input.reason, points: input.points, status: 'published' }
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

  await service.addBonus(
    { organizationId: 42, actorUserId: 7 },
    '3',
    { advisor: 'Chris', reason: 'Rewards sprint', points: 5 }
  );

  assert.deepEqual(events.map(event => event.type), ['reward.awarded', 'leaderboard.recalculated']);
  assert.equal(audits[0].entityType, 'contest_bonus');
  assert.equal(audits[0].entityId, '11');
});

test('contest bonus validation fails before repository writes', async () => {
  const service = new ContestsService({
    repository: {
      async addBonus() {
        throw new Error('repository should not be called');
      }
    }
  });

  await assert.rejects(
    () => service.addBonus(
      { organizationId: 42, actorUserId: 7 },
      '3',
      { advisor: 'Chris', reason: 'Missing points' }
    ),
    error => {
      assert.equal(error.statusCode, 400);
      assert.equal(error.message, 'Advisor, reason, and points are required');
      return true;
    }
  );
});


