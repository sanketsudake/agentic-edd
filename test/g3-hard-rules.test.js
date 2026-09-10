const test = require('node:test');
const assert = require('node:assert/strict');
const { hardRuleHit } = require('../guardrails/g3-hard-rules');
const { loadRfp, loadManifest } = require('../harness/fixtures');

test('hardRuleHit matches the hazard, injection, and legal RFPs', () => {
  assert.equal(hardRuleHit(loadRfp('rfp-06').rfp_text), 'asbestos');
  assert.equal(hardRuleHit(loadRfp('rfp-08').rfp_text), 'ignore previous instructions');
  assert.equal(hardRuleHit(loadRfp('rfp-11').rfp_text), 'liquidated damages');
});

test('hardRuleHit is null for every RFP that is not a G3 punch-out (no false positives)', () => {
  const g3 = new Set(['rfp-06', 'rfp-08', 'rfp-11']);
  for (const r of loadManifest().rfps.filter((x) => !g3.has(x.id))) {
    assert.equal(hardRuleHit(loadRfp(r.id).rfp_text), null, r.id);
  }
});
