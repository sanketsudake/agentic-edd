#!/usr/bin/env node
// Usage: node scripts/expected-financials.js [rfp-id]
// Prints the expected bid range for each reference RFP: bid_min and bid_max as defined below.
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const pricebook = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'fixtures', 'pricebook.json'), 'utf8'),
);
const manifest = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'fixtures', 'rfps', 'manifest.json'), 'utf8'),
);
const bySku = Object.fromEntries(pricebook.items.map((i) => [i.sku, i]));

const LABOR = 0.6,
  OVERHEAD = 0.15,
  C_MIN = 0.1,
  C_MAX = 0.25;
const round = (x) => Math.round(x * 100) / 100;

// Floor: the fixed quantities at the manifest tolerance below, contingency 10%.
// Ceiling: the fixed quantities plus the reference quantities of the present-only lines, contingency 25%, times 1.5.
const QTY_TOLERANCE = 0.15;
function expected(entry) {
  const fixed = entry.expected_bom.filter((b) => b.quantity !== null);
  const present = entry.expected_bom.filter((b) => b.quantity === null);
  const cost = (b, q) => q * bySku[b.sku].unit_cost;
  const materialsFloor = round(
    fixed.reduce((s, b) => s + cost(b, b.quantity) * (1 - QTY_TOLERANCE), 0),
  );
  const materialsFull = round(
    fixed.reduce((s, b) => s + cost(b, b.quantity), 0) +
      present.reduce((s, b) => s + cost(b, b.reference_quantity || 0), 0),
  );
  const bid = (m, c) => round(m * (1 + LABOR) * (1 + OVERHEAD + c));
  return {
    id: entry.id,
    fixed_lines: fixed.length,
    present_only: present.length,
    materials_floor: materialsFloor,
    materials_full: materialsFull,
    bid_min: bid(materialsFloor, C_MIN),
    bid_max: round(bid(materialsFull, C_MAX) * 1.5),
  };
}

const only = process.argv[2];
for (const e of manifest.rfps.filter(
  (r) => r.expected_bom.length > 0 && (!only || r.id === only),
)) {
  console.log(JSON.stringify(expected(e)));
}
