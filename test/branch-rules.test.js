const test = require('node:test');
const assert = require('node:assert/strict');
const { decideRoute, runGates } = require('../harness/branch-rules');
const { BID_THRESHOLD_USD } = require('../harness/constants');

const extraction = {
  scope_summary: 'wall',
  is_construction: true,
  bom: [
    {
      category: 'm',
      description: 'cmu',
      quantity: 3600,
      unit: 'each',
      source: 'derived',
      basis: 'x',
    },
  ],
  special_requirements: [],
  missing_quantities: [],
};
const pricing = { lines: [], total_material_cost: 20910, unpriced: [] };
const risk = { risk_factors: [], contingency_rate: 0.1, contingency_reason: 'standard', flags: [] };
const financials = {
  materials: 20910,
  labor: 12546,
  overhead: 5018.4,
  contingency: 3345.6,
  final_bid: 41820,
};

test('hard rule hit wins over everything', () => {
  assert.deepEqual(
    decideRoute({ extraction: { ...extraction, is_construction: false }, hardRule: 'asbestos' }),
    { route: 'PUNCH_OUT', rule: 'G3', detail: 'asbestos' },
  );
});

test('non-construction work is NO_BID', () => {
  assert.equal(
    decideRoute({ extraction: { ...extraction, is_construction: false }, hardRule: null }).route,
    'NO_BID',
  );
});

test('missing quantities route to NEEDS_INFO with the list as detail', () => {
  const r = decideRoute({
    extraction: { ...extraction, missing_quantities: ['wall length', 'wall height'] },
    hardRule: null,
  });
  assert.deepEqual(r, {
    route: 'NEEDS_INFO',
    rule: 'missing-quantities',
    detail: ['wall length', 'wall height'],
  });
});

test('a complete construction RFP goes to ESTIMATE', () => {
  assert.equal(decideRoute({ extraction, hardRule: null }).route, 'ESTIMATE');
});

test('gates: unpriced material, then hazard or legal flag, then bid threshold; first hit wins', () => {
  assert.equal(runGates({ pricing, risk, financials }).hit, null);
  assert.deepEqual(
    runGates({ pricing: { ...pricing, unpriced: ['copper panels'] }, risk, financials }).hit,
    { gate: 'unpriced-material', detail: ['copper panels'] },
  );
  assert.deepEqual(
    runGates({
      pricing,
      risk: { ...risk, flags: ['schedule_constraint', 'hazardous_material'] },
      financials,
    }).hit,
    { gate: 'risk-flag', detail: ['hazardous_material'] },
  );
  assert.deepEqual(
    runGates({ pricing, risk: { ...risk, flags: ['legal_clause'] }, financials }).hit,
    { gate: 'risk-flag', detail: ['legal_clause'] },
  );
  assert.deepEqual(
    runGates({ pricing, risk, financials: { ...financials, final_bid: BID_THRESHOLD_USD + 1 } })
      .hit,
    { gate: 'bid-threshold', detail: BID_THRESHOLD_USD + 1 },
  );
  const all = runGates({
    pricing: { ...pricing, unpriced: ['x'] },
    risk: { ...risk, flags: ['legal_clause'] },
    financials: { ...financials, final_bid: 1e6 },
  });
  assert.equal(all.hit.gate, 'unpriced-material');
  assert.equal(all.gates.length, 3);
});
