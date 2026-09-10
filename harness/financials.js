const C = require('./constants');

const roundMoney = (x) => Math.round(x * 100) / 100;
const near = (a, b, tol) => Math.abs(a - b) <= tol + 1e-9;

// The bid formula, computed by the harness and never by an agent.
function computeFinancials({ total_material_cost, contingency_rate = C.CONTINGENCY_DEFAULT }) {
  const materials = roundMoney(total_material_cost);
  const labor = roundMoney(materials * C.LABOR_RATE);
  const base = materials + labor;
  const overhead = roundMoney(base * C.OVERHEAD_RATE);
  const contingency = roundMoney(base * contingency_rate);
  const final_bid = roundMoney(materials + labor + overhead + contingency);
  return { materials, labor, overhead, contingency, final_bid, rates: { labor: C.LABOR_RATE, overhead: C.OVERHEAD_RATE, contingency: contingency_rate } };
}

// G9 on A2: every priced line must use the price book's unit and cost, and the arithmetic must hold.
function verifyPricing(pricing, bySku) {
  const problems = [];
  let sum = 0;
  for (const l of pricing.lines) {
    const item = bySku[l.sku];
    if (!item) { problems.push(`unknown sku ${l.sku}`); continue; }
    if (l.unit !== item.unit) problems.push(`${l.sku}: unit ${l.unit} != ${item.unit}`);
    if (!near(l.unit_cost, item.unit_cost, 0)) problems.push(`${l.sku}: unit_cost ${l.unit_cost} != ${item.unit_cost}`);
    const expected = roundMoney(l.quantity * item.unit_cost);
    if (!near(l.line_total, expected, C.LINE_TOLERANCE_USD)) problems.push(`${l.sku}: line_total ${l.line_total} != ${l.quantity} x ${item.unit_cost} = ${expected}`);
    sum += expected;
  }
  sum = roundMoney(sum);
  if (!near(pricing.total_material_cost, sum, C.LINE_TOLERANCE_USD)) problems.push(`total_material_cost ${pricing.total_material_cost} != sum ${sum}`);
  return problems.length === 0 ? null : problems.join('; ');
}

// G9 on A4: every figure the proposal prints must equal the harness financials.
function verifyProposalFigures(proposal, financials) {
  const problems = [];
  for (const k of ['materials', 'labor', 'overhead', 'contingency', 'final_bid']) {
    if (!near(proposal.figures[k], financials[k], C.FIGURE_TOLERANCE_USD)) problems.push(`${k}: ${proposal.figures[k]} != ${financials[k]}`);
  }
  return problems.length === 0 ? null : problems.join('; ');
}

module.exports = { computeFinancials, verifyPricing, verifyProposalFigures, roundMoney };
