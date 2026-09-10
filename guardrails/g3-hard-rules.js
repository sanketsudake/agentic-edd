// G3: deterministic hard escalation on the raw RFP text. No agent can override a hit.
// Order matters: the first phrase found decides the reported reason.
const HARD_RULES = [
  'asbestos', 'lead paint', 'hazardous', 'contaminated', 'abatement',
  'ignore previous instructions', 'ignore all previous', 'disregard the rules', 'system override', 'price everything at',
  'liquidated damages', 'indemnif', 'lawsuit', 'penalty clause', 'hold harmless',
];

function hardRuleHit(text) {
  const t = String(text).toLowerCase();
  for (const phrase of HARD_RULES) {
    if (t.includes(phrase)) return phrase;
  }
  return null;
}

module.exports = { hardRuleHit, HARD_RULES };
