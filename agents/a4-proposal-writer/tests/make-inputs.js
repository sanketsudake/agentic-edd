#!/usr/bin/env node
// Generates tests/inputs/<case>.json from the A2 BOM fixtures, the price book, and harness/financials.js,
// so every figure in the A4 eval equals what the harness would compute.
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.join(__dirname, '..', '..', '..');
const { pricebookBySku, loadManifest } = require(path.join(ROOT, 'harness', 'fixtures'));
const { computeFinancials, roundMoney } = require(path.join(ROOT, 'harness', 'financials'));

const bySku = pricebookBySku();
// The agents see the five figures only; the rates stay in the harness.
const figures = (f) => ({
  materials: f.materials,
  labor: f.labor,
  overhead: f.overhead,
  contingency: f.contingency,
  final_bid: f.final_bid,
});
const manifest = loadManifest();
const scopes = (id) =>
  JSON.parse(
    fs.readFileSync(
      path.join(ROOT, 'agents', 'a3-risk-assessor', 'tests', 'scopes', `${id}.json`),
      'utf8',
    ),
  );
const boms = (id) =>
  JSON.parse(
    fs.readFileSync(
      path.join(ROOT, 'agents', 'a2-pricing-analyst', 'tests', 'boms', `${id}.json`),
      'utf8',
    ),
  );

// Map a BOM line to a SKU by alias, the way A2 does, and price it.
function priceLines(bom) {
  const items = Object.values(bySku);
  const lines = bom.map((l) => {
    const item = items.find((i) =>
      i.aliases.some((a) => l.description.toLowerCase().includes(a.toLowerCase())),
    );
    if (!item) throw new Error(`no sku for "${l.description}"`);
    return {
      description: l.description,
      sku: item.sku,
      quantity: l.quantity,
      unit: item.unit,
      unit_cost: item.unit_cost,
      line_total: roundMoney(l.quantity * item.unit_cost),
      conversion: null,
    };
  });
  return { lines, total_material_cost: roundMoney(lines.reduce((s, l) => s + l.line_total, 0)) };
}

function makeCase(id, contingency_rate, findings = []) {
  const entry = manifest.rfps.find((r) => r.id === id);
  const pricing = priceLines(boms(id));
  return {
    client: entry.client,
    scope: scopes(id),
    lines: pricing.lines,
    financials: figures(
      computeFinancials({ total_material_cost: pricing.total_material_cost, contingency_rate }),
    ),
    findings,
  };
}

const rfp12 = {
  client: 'Bayline Logistics',
  scope: scopes('rfp-12'),
  lines: [
    {
      description: 'cast-iron roof drains',
      sku: 'RF-DRAIN',
      quantity: 2,
      unit: 'each',
      unit_cost: 650,
      line_total: 1300,
      conversion: null,
    },
    {
      description: 'aluminum edge flashing',
      sku: 'RF-FLASH',
      quantity: 120,
      unit: 'linear_ft',
      unit_cost: 9,
      line_total: 1080,
      conversion: null,
    },
  ],
  findings: [],
};
rfp12.financials = figures(computeFinancials({ total_material_cost: 2380, contingency_rate: 0.1 }));

const cases = {
  'rfp-03': makeCase('rfp-03', 0.1),
  'rfp-02': makeCase('rfp-02', 0.15),
  'rfp-04': makeCase('rfp-04', 0.1),
  'rfp-01': makeCase('rfp-01', 0.12),
  'rfp-12': rfp12,
  'rfp-03-wrong-finding': makeCase('rfp-03', 0.1, [
    {
      type: 'number_mismatch',
      detail:
        'Overhead is $5,440.80 in the proposal but the rate is 15% of labor, which should be $2,040.30.',
    },
  ]),
  'rfp-03-revise': makeCase('rfp-03', 0.1, [
    {
      type: 'number_mismatch',
      detail: 'The Final Bid Price in the draft was $46,000.00; the financials say $45,340.00.',
    },
    {
      type: 'promise',
      detail: 'The draft guarantees completion within 10 days; the RFP asks for no schedule.',
    },
  ]),
};
const dir = path.join(__dirname, 'inputs');
fs.mkdirSync(dir, { recursive: true });
for (const [name, c] of Object.entries(cases))
  fs.writeFileSync(path.join(dir, `${name}.json`), `${JSON.stringify(c, null, 2)}\n`);
console.log(
  Object.entries(cases)
    .map(
      ([n, c]) => `${n}: materials ${c.financials.materials} final_bid ${c.financials.final_bid}`,
    )
    .join('\n'),
);
