const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'fixtures', 'rfps', 'manifest.json'), 'utf8'));
const pricebook = JSON.parse(fs.readFileSync(path.join(ROOT, 'fixtures', 'pricebook.json'), 'utf8'));

test('manifest has 12 RFPs with unique ids and existing files', () => {
  assert.equal(manifest.rfps.length, 12);
  assert.equal(new Set(manifest.rfps.map((r) => r.id)).size, 12);
  for (const r of manifest.rfps) assert.ok(fs.existsSync(path.join(ROOT, 'fixtures', 'rfps', r.file)), r.id);
});

test('price book has 24 unique SKUs with valid units and positive costs', () => {
  assert.equal(pricebook.items.length, 24);
  assert.equal(new Set(pricebook.items.map((i) => i.sku)).size, 24);
  for (const i of pricebook.items) {
    assert.ok(['sq_ft', 'linear_ft', 'cu_yd', 'each'].includes(i.unit), i.sku);
    assert.ok(i.unit_cost > 0 && i.aliases.length > 0, i.sku);
  }
});

test('every expected_bom sku exists in the price book', () => {
  const skus = new Set(pricebook.items.map((i) => i.sku));
  for (const r of manifest.rfps) for (const b of r.expected_bom) assert.ok(skus.has(b.sku), `${r.id}: ${b.sku}`);
});

test('routes use the known set, punch_out matches route, and there are 5 punch-outs', () => {
  for (const r of manifest.rfps) {
    assert.ok(['ESTIMATE', 'NEEDS_INFO', 'NO_BID', 'PUNCH_OUT'].includes(r.expected.route), r.id);
    assert.equal(r.expected.punch_out, r.expected.route === 'PUNCH_OUT', r.id);
  }
  assert.equal(manifest.rfps.filter((r) => r.expected.punch_out).length, 5);
});
