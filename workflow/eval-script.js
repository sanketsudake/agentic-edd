const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { loadManifest } = require('../harness/fixtures');
const { AuditLogger } = require('../harness/audit-logger');
const { wrapAsserts } = require('../harness/eval-helpers');

const expected = Object.fromEntries(loadManifest().rfps.map((r) => [r.id, r.expected]));
let ranges = null;
function bidRange(id) {
  if (!ranges) {
    const out = execFileSync('node', [path.join(__dirname, '..', 'scripts', 'expected-financials.js')], { encoding: 'utf8' });
    ranges = Object.fromEntries(out.trim().split('\n').map((l) => JSON.parse(l)).map((r) => [r.id, r]));
  }
  return ranges[id];
}
const parse = (output) => JSON.parse(output);

// The terminal status and route must match the manifest. ESTIMATE in the manifest means BID at the end.
module.exports.statusAndRouteMatch = (output, context) => {
  const r = parse(output);
  const exp = expected[context.vars.rfp_id];
  const wantRoute = exp.route === 'ESTIMATE' ? 'BID' : exp.route;
  const wantStatus = exp.route === 'PUNCH_OUT' ? 'WAITING_HUMAN' : 'DONE';
  return r.status === wantStatus && r.route === wantRoute ? true : `expected ${wantStatus}/${wantRoute}, got ${r.status}/${r.route}${r.error ? ` (${r.error.slice(0, 120)})` : ''}`;
};

// Every run must leave a complete audit trail: run_start, one step_result per agent call, run_end with tokens and cost.
module.exports.auditComplete = (output) => {
  const r = parse(output);
  const records = AuditLogger.read(r.audit_file);
  const end = records.find((x) => x.type === 'run_end');
  if (!records.some((x) => x.type === 'run_start') || !end) return 'audit log lacks run_start or run_end';
  const steps = records.filter((x) => x.type === 'step_result' && x.status === 'OK');
  if (steps.length === 0) return 'no successful step_result';
  if (steps.some((s) => typeof s.cost_usd !== 'number' || typeof s.prompt_tokens !== 'number')) return 'a step lacks tokens or cost';
  return true;
};

// For BID cases: the final bid must fall inside the manifest-derived range (see scripts/expected-financials.js).
module.exports.bidInRange = (output, context) => {
  const r = parse(output);
  const range = bidRange(context.vars.rfp_id);
  if (!range) return true;
  const bid = r.financials && r.financials.final_bid;
  return bid >= range.bid_min && bid <= range.bid_max ? true : `final bid ${bid} outside ${range.bid_min} to ${range.bid_max}`;
};

module.exports = wrapAsserts(module.exports);
