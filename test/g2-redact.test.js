const test = require('node:test');
const assert = require('node:assert/strict');
const { redact, redactObject } = require('../guardrails/g2-redact');

test('redact replaces emails and phones', () => {
  const r = redact('My email is john.doe@example.com and my phone is 555-123-4567');
  assert.equal(r.text, 'My email is [EMAIL] and my phone is [PHONE]');
  assert.equal(r.count, 2);
});

test('redact replaces API tokens', () => {
  const r = redact('use key sk-abcdefghijklmnop and AKIAIOSFODNN7EXAMPLE now');
  assert.equal(r.text, 'use key [SECRET] and [SECRET] now');
  assert.equal(r.count, 2);
});

test('redact leaves clean text unchanged', () => {
  const r = redact('The wall needs to be 400 linear feet long and 8 feet high.');
  assert.equal(r.count, 0);
});

test('redactObject redacts every string in a nested object and counts them', () => {
  const r = redactObject({ scope_summary: 'contact a@b.io', bom: [{ description: 'key sk-abcdefghijklmnop', quantity: 3 }], special_requirements: [] });
  assert.equal(r.obj.scope_summary, 'contact [EMAIL]');
  assert.equal(r.obj.bom[0].description, 'key [SECRET]');
  assert.equal(r.obj.bom[0].quantity, 3);
  assert.equal(r.count, 2);
});
