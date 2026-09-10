#!/usr/bin/env node
// Generates tests/inputs/<case>.json: one clean rfp-03 proposal and seven variants with one planted defect each.
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.join(__dirname, '..', '..', '..');
const { loadRfp } = require(path.join(ROOT, 'harness', 'fixtures'));

const base = JSON.parse(
  fs.readFileSync(
    path.join(ROOT, 'agents', 'a4-proposal-writer', 'tests', 'inputs', 'rfp-03.json'),
    'utf8',
  ),
);
const rfp = loadRfp('rfp-03').rfp_text;
const money = (n) =>
  `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const f = base.financials;

const table = base.lines
  .map(
    (l) =>
      `| ${l.description} | ${l.quantity} | ${l.unit} | ${money(l.unit_cost)} | ${money(l.line_total)} |`,
  )
  .join('\n');
const clean = `## Project Overview

Supply Yard LLC has asked for a reinforced masonry security wall around its supply yard: 400 linear feet long and 8 feet high, built from standard 8x8x16 concrete masonry units with #5 vertical rebar every 32 inches, solid grout in every reinforced cell, and a smooth concrete cap. The wall is delivered in a raw block finish with no paint or stucco.

## Scope of Work & Materials

| Material | Quantity | Unit | Unit Cost | Line Total |
| --- | --- | --- | --- | --- |
${table}

## Project Investment

- Materials: ${money(f.materials)}
- Labor: ${money(f.labor)}
- Overhead: ${money(f.overhead)}
- Contingency: ${money(f.contingency)}
- **Final Bid Price: ${money(f.final_bid)}**

## Assumptions & Exclusions

- Permit fees and inspection fees are excluded.
- Subsurface rock excavation and unsuitable soil removal are excluded.
- Footing design by a licensed engineer is excluded and assumed to be provided by the owner.

## Validity & Acceptance

This bid is valid for 30 days from the date of issue. Acceptance of this proposal authorizes the work described above.

Authorized signature: ______________________   Date: ____________
`;

const proposal = (
  md,
  figures = f,
  exclusions = [
    'Permit fees and inspection fees excluded',
    'Subsurface rock excavation excluded',
    'Footing design by a licensed engineer excluded',
  ],
) => ({ proposal_markdown: md, figures, exclusions });
const inputs = (p) => ({ proposal: p, scope: base.scope, lines: base.lines, financials: f, rfp });

const cases = {
  clean: inputs(proposal(clean)),
  'wrong-labor': inputs(
    proposal(clean.replace(`Labor: ${money(f.labor)}`, 'Labor: $12,000.00'), {
      ...f,
      labor: 12000,
    }),
  ),
  'final-bid-off-50pct': inputs(
    proposal(
      clean.replace(`Final Bid Price: ${money(f.final_bid)}`, 'Final Bid Price: $68,010.00'),
      { ...f, final_bid: 68010 },
    ),
  ),
  'invented-scope': inputs(
    proposal(
      clean.replace(
        'The wall is delivered in a raw block finish with no paint or stucco.',
        'The wall is delivered with two coats of exterior paint and a decorative stucco finish on the street side.',
      ),
    ),
  ),
  'missing-validity': inputs(proposal(clean.split('## Validity & Acceptance')[0])),
  promise: inputs(
    proposal(
      clean.replace(
        'Acceptance of this proposal authorizes the work described above.',
        'Acceptance of this proposal authorizes the work described above. We guarantee completion within 10 working days of acceptance.',
      ),
    ),
  ),
  'unfit-exclusion': inputs(
    proposal(
      clean.replace(
        '- Footing design by a licensed engineer is excluded and assumed to be provided by the owner.',
        '- Roofing membrane and drain replacement are excluded.',
      ),
      f,
      [
        'Permit fees and inspection fees excluded',
        'Subsurface rock excavation excluded',
        'Roofing membrane and drain replacement excluded',
      ],
    ),
  ),
  'two-findings': inputs(
    proposal(
      clean
        .replace(`Overhead: ${money(f.overhead)}`, 'Overhead: $5,000.00')
        .replace(
          '## Assumptions & Exclusions',
          '## Assumptions & Exclusions\n\nHonestly this is a super easy job, our guys could do it blindfolded lol.',
        ),
      { ...f, overhead: 5000 },
    ),
  ),
};
// rfp-02: a clean proposal that restates the client's own two-weekend requirement. Not a promise.
const b2 = JSON.parse(
  fs.readFileSync(
    path.join(ROOT, 'agents', 'a4-proposal-writer', 'tests', 'inputs', 'rfp-02.json'),
    'utf8',
  ),
);
const f2 = b2.financials;
const table2 = b2.lines
  .map(
    (l) =>
      `| ${l.description} | ${l.quantity} | ${l.unit} | ${money(l.unit_cost)} | ${money(l.line_total)} |`,
  )
  .join('\n');
const clean2 = `## Project Overview

Bayline Logistics has asked for a full replacement of the 10,000 sq ft flat warehouse roof: tear-off and disposal of the old EPDM membrane, 3 inches of rigid polyiso insulation board, and a new fully adhered 60-mil white TPO membrane, with aluminum edge flashing and 4 new cast-iron roof drains. As the RFP requires, the work is scheduled over two weekends so that warehouse operations are not disrupted.

## Scope of Work & Materials

| Material | Quantity | Unit | Unit Cost | Line Total |
| --- | --- | --- | --- | --- |
${table2}

## Project Investment

- Materials: ${money(f2.materials)}
- Labor: ${money(f2.labor)}
- Overhead: ${money(f2.overhead)}
- Contingency: ${money(f2.contingency)}
- **Final Bid Price: ${money(f2.final_bid)}**

## Assumptions & Exclusions

- Permit fees and inspection fees are excluded.
- Repair of deteriorated roof decking found after tear-off is excluded.
- Hazardous material handling or abatement is excluded.

## Validity & Acceptance

This bid is valid for 30 days from the date of issue. Acceptance of this proposal authorizes the work described above.

Authorized signature: ______________________   Date: ____________
`;
cases['rfp-02-requirement-restated'] = {
  proposal: {
    proposal_markdown: clean2,
    figures: f2,
    exclusions: [
      'Permit fees and inspection fees excluded',
      'Repair of deteriorated roof decking excluded',
      'Hazardous material handling excluded',
    ],
  },
  scope: b2.scope,
  lines: b2.lines,
  financials: f2,
  rfp: loadRfp('rfp-02').rfp_text,
};

const dir = path.join(__dirname, 'inputs');
fs.mkdirSync(dir, { recursive: true });
for (const [name, c] of Object.entries(cases))
  fs.writeFileSync(path.join(dir, `${name}.json`), `${JSON.stringify(c, null, 2)}\n`);
console.log(`${Object.keys(cases).length} cases written`);
