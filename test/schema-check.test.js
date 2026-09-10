const test = require('node:test');
const assert = require('node:assert/strict');
const { validate } = require('../harness/schema-check');

const good = {
  scope_summary: 'A 400 ft masonry wall.',
  is_construction: true,
  bom: [
    {
      category: 'masonry',
      description: '8x8x16 CMU',
      quantity: 3600,
      unit: 'each',
      source: 'derived',
      basis: '400 ft x 8 ft x 1.125 blocks per sq ft',
    },
  ],
  special_requirements: ['#5 rebar every 32 inches'],
  missing_quantities: [],
};

test('validate accepts a correct A1 object', () => {
  assert.deepEqual(validate('a1-extraction', good), { ok: true, errors: [] });
});

test('validate reports missing fields and bad enums', () => {
  const r = validate('a1-extraction', {
    scope_summary: 'x',
    is_construction: true,
    bom: [
      { category: 'm', description: 'd', quantity: 1, unit: 'tons', source: 'stated', basis: 'b' },
    ],
    special_requirements: [],
  });
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => /required property 'missing_quantities'/.test(e)));
  assert.ok(r.errors.some((e) => /\/bom\/0\/unit/.test(e)));
});

test('validate rejects extra fields and negative quantities', () => {
  assert.equal(validate('a1-extraction', { ...good, extra: 1 }).ok, false);
  assert.equal(
    validate('a1-extraction', { ...good, bom: [{ ...good.bom[0], quantity: -1 }] }).ok,
    false,
  );
});

test('the A3 schema enforces the contingency band and the flag enum', () => {
  const base = { risk_factors: [], contingency_rate: 0.1, contingency_reason: 'plain', flags: [] };
  assert.equal(validate('a3-risk', base).ok, true);
  assert.equal(validate('a3-risk', { ...base, contingency_rate: 0.3 }).ok, false);
  assert.equal(validate('a3-risk', { ...base, flags: ['weather'] }).ok, false);
});

test('the A4 and A5 schemas load', () => {
  assert.equal(validate('a5-review', { verdict: 'APPROVE', findings: [] }).ok, true);
  assert.equal(validate('a5-review', { verdict: 'MAYBE', findings: [] }).ok, false);
  assert.equal(
    validate('a4-proposal', { proposal_markdown: 'x', figures: {}, exclusions: [] }).ok,
    false,
  );
});

test('validate throws for an unknown schema name', () => {
  assert.throws(() => validate('no-such-schema', {}), /Cannot find module/);
});
