const test = require('node:test');
const assert = require('node:assert/strict');

const { compareSnapshots } = require('../lib/loanerChanges');

test('compareSnapshots flags stock-level manager changes', () => {
  const previous = [
    {
      stockNumber: 'PB1001',
      model: '2026 BMW X3 30 xDrive',
      brand: 'BMW',
      odometer: 1200,
      salePrice: 52000,
      leasePayment: 599,
      status: 'ok',
    },
    {
      stockNumber: 'PM2001',
      model: '2026 MINI Cooper S',
      brand: 'MINI',
      odometer: 800,
      salePrice: 33000,
      leasePayment: 399,
      status: 'ok',
    },
  ];
  const current = [
    {
      stockNumber: 'PB1001',
      model: '2026 BMW X3 30 xDrive',
      brand: 'BMW',
      odometer: 1450,
      salePrice: 52000,
      leasePayment: 619,
      status: 'ok',
    },
    {
      stockNumber: 'PM2002',
      model: '2026 MINI Countryman',
      brand: 'MINI',
      odometer: 300,
      salePrice: 41000,
      leasePayment: 459,
      status: 'ok',
    },
  ];

  const changes = compareSnapshots(previous, current);

  assert.equal(changes.length, 3);
  assert.deepEqual(
    changes.find(change => change.stockNumber === 'PB1001').types,
    ['Miles', 'Lease payment']
  );
  assert.deepEqual(
    changes.find(change => change.stockNumber === 'PM2002').types,
    ['Added']
  );
  assert.deepEqual(
    changes.find(change => change.stockNumber === 'PM2001').types,
    ['Removed']
  );
});
