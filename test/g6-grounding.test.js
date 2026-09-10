const test = require('node:test');
const assert = require('node:assert/strict');
const { statedQuantitiesGrounded, dollarAmountsGrounded } = require('../guardrails/g6-grounding');
const { loadRfp } = require('../harness/fixtures');

const line = (q, source) => ({
  category: 'c',
  description: 'd',
  quantity: q,
  unit: 'each',
  source,
  basis: 'b',
});

test('statedQuantitiesGrounded passes stated numbers written with a thousands separator or as a word', () => {
  const text = loadRfp('rfp-01').rfp_text; // "2,500 sq ft", "4 treatment rooms", "one ADA-compliant restroom"
  assert.equal(
    statedQuantitiesGrounded(
      { bom: [line(2500, 'stated'), line(4, 'stated'), line(1, 'stated')] },
      text,
    ),
    null,
  );
});

test('statedQuantitiesGrounded ignores derived lines and names the stated ones that are not in the text', () => {
  const text = loadRfp('rfp-03').rfp_text;
  assert.equal(statedQuantitiesGrounded({ bom: [line(3600, 'derived')] }, text), null);
  assert.match(statedQuantitiesGrounded({ bom: [line(3600, 'stated')] }, text), /3600/);
});

test('dollarAmountsGrounded accepts allowed figures and names the rest', () => {
  assert.equal(
    dollarAmountsGrounded('Materials $22,670.00 and total $45,340', [22670, 45340]),
    null,
  );
  assert.match(dollarAmountsGrounded('A deposit of $5,000 is due', [22670]), /5000/);
});
