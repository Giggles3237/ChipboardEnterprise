const test = require('node:test');
const assert = require('node:assert/strict');

const { checkPermission, requireAdmin } = require('../middleware/auth');
const usersRouter = require('../routes/users');

const ALL_ROLES = ['Admin', 'Manager', 'Salesperson'];
const ADMIN_MUTATION_ROUTES = [
  { method: 'put', path: '/:id/profile' },
  { method: 'put', path: '/:id/password' },
  { method: 'put', path: '/:id/role' },
  { method: 'put', path: '/:id/status' },
  { method: 'delete', path: '/:id' },
  { method: 'post', path: '/' }
];

const runMiddleware = (middleware, role) => {
  let nextCalled = false;
  let statusCode = 200;
  let body;
  const req = { auth: { userId: 1, role } };
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(payload) {
      body = payload;
      return this;
    }
  };

  middleware(req, res, () => {
    nextCalled = true;
  });

  return { nextCalled, statusCode, body };
};

for (const role of ALL_ROLES) {
  test(`requireAdmin enforces user administration for ${role}`, () => {
    const result = runMiddleware(requireAdmin, role);

    if (role === 'Admin') {
      assert.equal(result.nextCalled, true);
      assert.equal(result.statusCode, 200);
    } else {
      assert.equal(result.nextCalled, false);
      assert.equal(result.statusCode, 403);
      assert.deepEqual(result.body, { message: 'Admin access required' });
    }
  });

  test(`edit_users permission cannot be used by ${role} to bypass admin checks`, () => {
    const result = runMiddleware(checkPermission(['edit_users']), role);
    assert.equal(result.nextCalled, role === 'Admin');
    assert.equal(result.statusCode, role === 'Admin' ? 200 : 403);
  });
}

test('every user mutation route has authenticate and requireAdmin middleware', () => {
  for (const expected of ADMIN_MUTATION_ROUTES) {
    const layer = usersRouter.stack.find(candidate =>
      candidate.route?.path === expected.path && candidate.route.methods[expected.method]
    );

    assert.ok(layer, `${expected.method.toUpperCase()} ${expected.path} must exist`);
    const middlewareNames = layer.route.stack.map(handler => handler.name);
    assert.deepEqual(
      middlewareNames.slice(0, 2),
      ['authenticate', 'requireAdmin'],
      `${expected.method.toUpperCase()} ${expected.path} must be Admin-only`
    );
  }
});

test('the vulnerable generic PUT /:id route no longer exists', () => {
  const genericUpdate = usersRouter.stack.find(layer =>
    layer.route?.path === '/:id' && layer.route.methods.put
  );

  assert.equal(genericUpdate, undefined);
});

test('self-service password change stays authenticated without requiring Admin', () => {
  const layer = usersRouter.stack.find(candidate =>
    candidate.route?.path === '/change-password' && candidate.route.methods.put
  );

  assert.ok(layer);
  assert.deepEqual(layer.route.stack.map(handler => handler.name).slice(0, 1), ['authenticate']);
  assert.equal(layer.route.stack.some(handler => handler.name === 'requireAdmin'), false);
});

const invokeRouteHandler = async (method, path, body) => {
  const layer = usersRouter.stack.find(candidate =>
    candidate.route?.path === path && candidate.route.methods[method]
  );
  assert.ok(layer, `${method.toUpperCase()} ${path} must exist`);

  let statusCode = 200;
  let responseBody;
  const req = { params: { id: '2' }, body, auth: { userId: 1, role: 'Admin' } };
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

  await layer.route.stack.at(-1).handle(req, res);
  return { statusCode, responseBody };
};

test('profile updates reject role, status, and password fields', async () => {
  for (const forbiddenField of ['role', 'status', 'password']) {
    const result = await invokeRouteHandler('put', '/:id/profile', { [forbiddenField]: 'value' });
    assert.equal(result.statusCode, 400);
    assert.deepEqual(result.responseBody, { message: 'Profile update contains unsupported fields' });
  }
});

test('specialized mutation endpoints reject fields owned by other endpoints', async () => {
  const cases = [
    ['put', '/:id/password', { newPassword: 'long-enough', role: 'Admin' }],
    ['put', '/:id/role', { role: 'Admin', status: 'active' }],
    ['put', '/:id/status', { status: 'active', role: 'Admin' }],
    ['post', '/', { name: 'Example', unexpected: true }]
  ];

  for (const [method, path, body] of cases) {
    const result = await invokeRouteHandler(method, path, body);
    assert.equal(result.statusCode, 400, `${method.toUpperCase()} ${path} must reject unsupported fields`);
  }
});
