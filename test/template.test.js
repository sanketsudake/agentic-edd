const test = require('node:test');
const assert = require('node:assert/strict');
const { render } = require('../harness/template');

test('render replaces string variables', () => {
  assert.equal(render('Hello {{ name }} and {{name}}', { name: 'A' }), 'Hello A and A');
});

test('render serializes object variables as JSON', () => {
  assert.equal(render('<x>{{ obj }}</x>', { obj: { a: 1 } }), '<x>{\n  "a": 1\n}</x>');
});

test('render throws on a missing variable', () => {
  assert.throws(() => render('{{ missing }}', {}), /Template variable "missing" is missing/);
});
