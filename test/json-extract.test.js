const test = require('node:test');
const assert = require('node:assert/strict');
const { extractJson } = require('../harness/json-extract');

test('extractJson parses raw JSON', () => {
  assert.deepEqual(extractJson('{"a":1}'), { a: 1 });
});

test('extractJson strips code fences and prose', () => {
  assert.deepEqual(extractJson('Here:\n```json\n{"a": 1}\n```\nDone'), { a: 1 });
});

test('extractJson throws with code PARSE on garbage', () => {
  assert.throws(
    () => extractJson('no json here'),
    (e) => e.code === 'PARSE',
  );
});
