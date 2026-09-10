const test = require('node:test');
const assert = require('node:assert/strict');
const { costUsd } = require('../harness/pricing');

test('costUsd prices uncached input, cached input, and output separately', () => {
  const r = costUsd({ model_name: 'SWE-1.6', prompt_tokens: 19801, completion_tokens: 45, cached_tokens: 13376 });
  const expected = (6425 * 0.5 + 13376 * 0.2 + 45 * 2.5) / 1e6;
  assert.equal(r.cost_usd, Number(expected.toFixed(6)));
  assert.equal(r.price_table_date, '2026-09-10');
});

test('costUsd throws for an unknown model', () => {
  assert.throws(() => costUsd({ model_name: 'Nope', prompt_tokens: 1 }), /No price for model "Nope"/);
});
