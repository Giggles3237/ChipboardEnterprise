const test = require('node:test');
const assert = require('node:assert/strict');

const { MysqlEventOutboxPublisher, MysqlSalesAuditLogger } = require('../services/salesEvents');
const { SalesService } = require('../services/salesService');

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

test('sales events are persisted to the enterprise event outbox', async () => {
  const pool = createPoolStub();
  const publisher = new MysqlEventOutboxPublisher(pool);

  await publisher.publish({
    id: 'event-1',
    organizationId: 42,
    type: 'sale.created',
    payload: { sale: { id: 9, stockNumber: 'A1' } },
    actorUserId: 7,
    occurredAt: '2026-08-06T12:00:00.000Z'
  });

  assert.match(pool.calls[0].sql, /CREATE TABLE IF NOT EXISTS event_outbox/);
  assert.match(pool.calls[1].sql, /INSERT INTO event_outbox/);
  assert.deepEqual(pool.calls[1].params.slice(0, 5), [
    'event-1',
    42,
    null,
    'sale.created',
    JSON.stringify({ sale: { id: 9, stockNumber: 'A1' } })
  ]);
});

test('sales audit entries are persisted with previous and new values', async () => {
  const pool = createPoolStub();
  const audit = new MysqlSalesAuditLogger(pool);

  await audit.record({
    organizationId: 42,
    actorUserId: 7,
    action: 'update',
    entityType: 'sale',
    entityId: 9,
    previousValue: { delivered: false },
    newValue: { delivered: true }
  });

  assert.match(pool.calls[0].sql, /CREATE TABLE IF NOT EXISTS audit_logs/);
  assert.match(pool.calls[1].sql, /INSERT INTO audit_logs/);
  assert.deepEqual(pool.calls[1].params, [
    42,
    7,
    'update',
    'sale',
    9,
    JSON.stringify({ delivered: false }),
    JSON.stringify({ delivered: true })
  ]);
});

test('sales service writes durable event and audit records for sale updates', async () => {
  const events = [];
  const audits = [];
  const service = new SalesService({
    repository: {
      async update(context, saleId, input) {
        return {
          previousSale: { id: saleId, organization_id: context.organizationId, delivered: false },
          sale: { id: saleId, organization_id: context.organizationId, ...input }
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

  const sale = await service.updateSale(
    { organizationId: 42, actorUserId: 7 },
    '9',
    { delivered: true }
  );

  assert.equal(sale.id, '9');
  assert.equal(events[0].type, 'sale.updated');
  assert.equal(events[0].organizationId, 42);
  assert.equal(audits[0].action, 'update');
  assert.deepEqual(audits[0].previousValue, { id: '9', organization_id: 42, delivered: false });
  assert.deepEqual(audits[0].newValue, { id: '9', organization_id: 42, delivered: true });
});
