// Deterministic branching and gates. The first matching rule wins. No agent can change the order.
const { BID_THRESHOLD_USD } = require('./constants');

const PUNCH_FLAGS = ['hazardous_material', 'legal_clause'];

function decideRoute({ extraction, hardRule }) {
  if (hardRule) return { route: 'PUNCH_OUT', rule: 'G3', detail: hardRule };
  if (!extraction.is_construction)
    return { route: 'NO_BID', rule: 'not-construction', detail: null };
  if (extraction.missing_quantities.length > 0)
    return {
      route: 'NEEDS_INFO',
      rule: 'missing-quantities',
      detail: extraction.missing_quantities,
    };
  return { route: 'ESTIMATE', rule: 'default', detail: null };
}

function runGates({ pricing, risk, financials }) {
  const flags = (risk.flags || []).filter((f) => PUNCH_FLAGS.includes(f));
  const gates = [
    { gate: 'unpriced-material', hit: pricing.unpriced.length > 0, detail: pricing.unpriced },
    { gate: 'risk-flag', hit: flags.length > 0, detail: flags },
    {
      gate: 'bid-threshold',
      hit: financials.final_bid > BID_THRESHOLD_USD,
      detail: financials.final_bid,
    },
  ];
  const first = gates.find((g) => g.hit);
  return { hit: first ? { gate: first.gate, detail: first.detail } : null, gates };
}

module.exports = { decideRoute, runGates, PUNCH_FLAGS };
