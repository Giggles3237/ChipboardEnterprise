const test = require('node:test');
const assert = require('node:assert/strict');

const { oldPool } = require('../db');
const salesRouter = require('../routes/sales');

const findRouteHandler = (method, path) => {
  const layer = salesRouter.stack.find(candidate =>
    candidate.route?.path === path && candidate.route.methods[method]
  );

  assert.ok(layer, `${method.toUpperCase()} ${path} must exist`);
  return layer.route.stack.at(-1).handle;
};

const invokeHandler = async (handler, options = {}) => {
  const { params = {}, body = {} } = options;
  const organizationId = Object.prototype.hasOwnProperty.call(options, 'organizationId')
    ? options.organizationId
    : 42;
  let statusCode = 200;
  let responseBody;
  const req = {
    params,
    body,
    auth: { userId: 7, role: 'Manager', organizationId }
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

test('sales list is scoped to the authenticated organization', async () => {
  const originalQuery = oldPool.query;
  const calls = [];
  oldPool.query = async (sql, params = []) => {
    calls.push({ sql, params });
    if (sql === 'SELECT 1 as test') return [[{ test: 1 }]];
    return [[]];
  };

  try {
    const handler = findRouteHandler('get', '/');
    const result = await invokeHandler(handler, { organizationId: 123 });

    assert.equal(result.statusCode, 200);
    assert.match(calls[1].sql, /WHERE organization_id = \?/);
    assert.deepEqual(calls[1].params, [123]);
  } finally {
    oldPool.query = originalQuery;
  }
});

test('sales update only reads and writes within the authenticated organization', async () => {
  const originalQuery = oldPool.query;
  const calls = [];
  oldPool.query = async (sql, params = []) => {
    calls.push({ sql, params });
    if (/^SELECT \* FROM vehicle_sales WHERE id/.test(sql)) return [[{ id: 9, organization_id: 123 }]];
    if (/^UPDATE vehicle_sales/.test(sql)) return [{ affectedRows: 1 }];
    return [[]];
  };

  try {
    const handler = findRouteHandler('put', '/:id');
    const result = await invokeHandler(handler, {
      params: { id: '9' },
      body: { delivered: true },
      organizationId: 123
    });

    assert.equal(result.statusCode, 200);
    assert.match(calls[0].sql, /WHERE id = \? AND organization_id = \?/);
    assert.deepEqual(calls[0].params, ['9', 123]);
    assert.match(calls[1].sql, /WHERE id = \? AND organization_id = \?/);
    assert.deepEqual(calls[1].params, [{ delivered: true }, '9', 123]);
  } finally {
    oldPool.query = originalQuery;
  }
});

test('sales delete only deletes within the authenticated organization', async () => {
  const originalQuery = oldPool.query;
  const calls = [];
  oldPool.query = async (sql, params = []) => {
    calls.push({ sql, params });
    if (/^SELECT \* FROM vehicle_sales WHERE id/.test(sql)) return [[{ id: 9, organization_id: 123 }]];
    if (/^DELETE FROM vehicle_sales/.test(sql)) return [{ affectedRows: 1 }];
    return [[]];
  };

  try {
    const handler = findRouteHandler('delete', '/:id');
    const result = await invokeHandler(handler, {
      params: { id: '9' },
      organizationId: 123
    });

    assert.equal(result.statusCode, 200);
    assert.match(calls[0].sql, /WHERE id = \? AND organization_id = \?/);
    assert.deepEqual(calls[0].params, ['9', 123]);
    assert.match(calls[1].sql, /WHERE id = \? AND organization_id = \?/);
    assert.deepEqual(calls[1].params, ['9', 123]);
  } finally {
    oldPool.query = originalQuery;
  }
});

test('sales routes reject requests without organization context', async () => {
  const handler = findRouteHandler('get', '/');
  const result = await invokeHandler(handler, { organizationId: undefined });

  assert.equal(result.statusCode, 403);
  assert.deepEqual(result.responseBody, { message: 'Organization access required' });
});