const test = require('node:test');
const assert = require('node:assert/strict');
const { renderNeedsInfo, renderNoBid } = require('../harness/templates');

test('renderNeedsInfo lists each missing quantity', () => {
  const md = renderNeedsInfo({
    client: 'Eastgate Warehousing',
    missing: ['wall length in linear feet', 'wall height in feet'],
  });
  assert.match(md, /Eastgate Warehousing/);
  assert.match(md, /- wall length in linear feet/);
  assert.match(md, /- wall height in feet/);
  assert.doesNotMatch(md, /undefined/);
});

test('renderNoBid names the client and declines', () => {
  const md = renderNoBid({ client: 'Northside Dental Partners' });
  assert.match(md, /Northside Dental Partners/);
  assert.match(md, /not able to bid/);
});
