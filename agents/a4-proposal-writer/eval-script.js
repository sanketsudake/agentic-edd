const path = require('node:path');
const { validate } = require(path.join(__dirname, '..', '..', 'harness', 'schema-check'));
const { wrapAsserts } = require(path.join(__dirname, '..', '..', 'harness', 'eval-helpers'));
const { verifyProposalFigures } = require(path.join(__dirname, '..', '..', 'harness', 'financials'));
const { dollarAmountsGrounded } = require(path.join(__dirname, '..', '..', 'guardrails', 'g6-grounding'));

const asObject = (v) => (typeof v === 'string' ? JSON.parse(v) : v);
const SECTIONS = ['## Project Overview', '## Scope of Work & Materials', '## Project Investment', '## Assumptions & Exclusions', '## Validity & Acceptance'];

module.exports.validateSchema = (output) => {
  const r = validate('a4-proposal', JSON.parse(output));
  return r.ok ? true : `schema: ${r.errors.join('; ')}`;
};

// G9: the figures the agent reports must equal the harness financials.
module.exports.figuresMatch = (output, context) => {
  const p = verifyProposalFigures(JSON.parse(output), asObject(context.vars.inputs).financials);
  return p === null ? true : `math: ${p}`;
};

// The five sections, in order.
module.exports.sectionsInOrder = (output) => {
  const md = JSON.parse(output).proposal_markdown;
  let last = -1;
  for (const s of SECTIONS) {
    const i = md.indexOf(s);
    if (i === -1) return `missing section ${s}`;
    if (i < last) return `section out of order: ${s}`;
    last = i;
  }
  return true;
};

// G6: every dollar amount in the proposal is a figure, a line total, or a unit cost from the inputs.
module.exports.dollarsGrounded = (output, context) => {
  const inputs = asObject(context.vars.inputs);
  const f = inputs.financials;
  const allowed = [f.materials, f.labor, f.overhead, f.contingency, f.final_bid, ...inputs.lines.flatMap((l) => [l.line_total, l.unit_cost])];
  const p = dollarAmountsGrounded(JSON.parse(output).proposal_markdown, allowed);
  return p === null ? true : p;
};

// The final bid must be printed, formatted, in the investment section.
module.exports.finalBidPrinted = (output, context) => {
  const f = asObject(context.vars.inputs).financials;
  const formatted = f.final_bid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const md = JSON.parse(output).proposal_markdown;
  return md.includes(`$${formatted}`) ? true : `final bid $${formatted} not printed`;
};

module.exports.validityAndSignature = (output) => {
  const md = JSON.parse(output).proposal_markdown;
  if (!/30 days/i.test(md)) return 'no 30-day validity statement';
  if (!/signature|signed|authorized|accepted by|sign and return|_{5,}/i.test(md)) return 'no signature line';
  return true;
};

// No completion promise unless the scope states a schedule.
module.exports.noPromise = (output) => {
  const md = JSON.parse(output).proposal_markdown;
  return /guarantee(d)? (completion|delivery)|will be completed by|completed within \d+ days/i.test(md) ? 'contains a completion promise' : true;
};

module.exports = wrapAsserts(module.exports);
