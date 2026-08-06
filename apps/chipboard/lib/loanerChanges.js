const { brandOf } = require('./report');

function compactUnit(unit) {
  return {
    stockNumber: unit.stockNumber,
    model: unit.model,
    brand: brandOf(unit.stockNumber, unit.model),
    odometer: unit.odometer ?? null,
    salePrice: unit.salePrice ?? null,
    leasePayment: unit.leasePayment ?? null,
    status: unit.status || null,
  };
}

function buildSnapshot(report) {
  return [...report.units]
    .map(compactUnit)
    .sort((a, b) => a.stockNumber.localeCompare(b.stockNumber));
}

function valueChanged(previous, current, key) {
  return (previous?.[key] ?? null) !== (current?.[key] ?? null);
}

function describeAction(types) {
  const hasMiles = types.includes('Miles');
  const hasPrice = types.includes('Sale price') || types.includes('Lease payment');
  const hasStatus = types.includes('Status');
  if (types.includes('Added')) return 'Review new unit';
  if (types.includes('Removed')) return 'Confirm unit was removed';
  if (hasMiles && hasPrice) return 'Update miles and review price';
  if (hasMiles) return 'Update miles';
  if (hasPrice) return 'Review price';
  if (hasStatus) return 'Review pricing status';
  return 'Review change';
}

function compareSnapshots(previousSnapshot = [], currentSnapshot = []) {
  const previousByStock = new Map(previousSnapshot.map(u => [u.stockNumber, u]));
  const currentByStock = new Map(currentSnapshot.map(u => [u.stockNumber, u]));
  const changes = [];

  for (const current of currentSnapshot) {
    const previous = previousByStock.get(current.stockNumber);
    if (!previous) {
      changes.push({
        stockNumber: current.stockNumber,
        model: current.model,
        brand: current.brand,
        types: ['Added'],
        previous: null,
        current,
        action: describeAction(['Added']),
      });
      continue;
    }

    const types = [];
    if (valueChanged(previous, current, 'odometer')) types.push('Miles');
    if (valueChanged(previous, current, 'salePrice')) types.push('Sale price');
    if (valueChanged(previous, current, 'leasePayment')) types.push('Lease payment');
    if (valueChanged(previous, current, 'status')) types.push('Status');
    if (!types.length) continue;

    changes.push({
      stockNumber: current.stockNumber,
      model: current.model || previous.model,
      brand: current.brand || previous.brand,
      types,
      previous,
      current,
      action: describeAction(types),
    });
  }

  for (const previous of previousSnapshot) {
    if (currentByStock.has(previous.stockNumber)) continue;
    changes.push({
      stockNumber: previous.stockNumber,
      model: previous.model,
      brand: previous.brand,
      types: ['Removed'],
      previous,
      current: null,
      action: describeAction(['Removed']),
    });
  }

  return changes.sort((a, b) =>
    a.brand.localeCompare(b.brand)
    || a.stockNumber.localeCompare(b.stockNumber));
}

module.exports = { buildSnapshot, compareSnapshots };
