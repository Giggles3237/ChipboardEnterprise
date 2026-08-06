const test = require('node:test');
const assert = require('node:assert/strict');

const { renderSheet } = require('../lib/report');

test('renderSheet includes calculated sale pricing for units without programs', () => {
  const html = renderSheet({
    priced: [],
    needsAttention: [{
      stockNumber: 'PB9999',
      model: '2026 BMW Missing Model',
      color: 'Black',
      odometer: 1200,
      msrp: 50000,
      invoice: 46000,
      avp: 1000,
      mileageAdj: 500,
      salePrice: 47200,
      profit: 2200,
      status: 'no_program',
      warnings: ['Model not found on the rate sheet.'],
    }],
    mileageUpdates: [],
    missingFromVauto: [],
  }, {
    dealership: 'BMW Test Store',
    program_date: '2026-07-15',
    acquisition_fee: 925,
    excess_mileage_rate: 0.25,
    annual_mileage_allowance: 7500,
    disposition_fee: 350,
  });

  assert.match(html, /Calculated sale pricing - no lease program \(1\)/);
  assert.match(html, /PB9999/);
  assert.match(html, /\$47,200/);
  assert.match(html, /no lease payment is shown/i);
});
