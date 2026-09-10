// Assertions for the workflow-level eval: the whole pipeline is the thing under test.
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { loadManifest } = require('../harness/fixtures');
const { AuditLogger } = require('../harness/audit-logger');
const { wrapAsserts } = require('../harness/eval-helpers');

const expectedById = Object.fromEntries(loadManifest().rfps.map((r) => [r.id, r.expected]));
const parse = (output) => JSON.parse(output);

let ranges = null;
function bidRange(id) {
  if (!ranges) {
    const script = path.join(__dirname, '..', 'scripts', 'expected-financials.js');
    const out = execFileSync('node', [script], { encoding: 'utf8' });
    const rows = out
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line));
    ranges = Object.fromEntries(rows.map((r) => [r.id, r]));
  }
  return ranges[id];
}

// The terminal status and route must match the manifest. ESTIMATE in the manifest means BID at the end.
module.exports.statusAndRouteMatch = (output, context) => {
  const r = parse(output);
  const expected = expectedById[context.vars.rfp_id];
  const wantRoute = expected.route === 'ESTIMATE' ? 'BID' : expected.route;
  const wantStatus = expected.route === 'PUNCH_OUT' ? 'WAITING_HUMAN' : 'DONE';
  if (r.status === wantStatus && r.route === wantRoute) return true;
  const error = r.error ? ` (${r.error.slice(0, 120)})` : '';
  return `expected ${wantStatus}/${wantRoute}, got ${r.status}/${r.route}${error}`;
};

// Every run must leave a complete audit trail: run_start, successful step_results with tokens and cost, run_end.
module.exports.auditComplete = (output) => {
  const r = parse(output);
  const records = AuditLogger.read(r.audit_file);
  const hasStart = records.some((x) => x.type === 'run_start');
  const end = records.find((x) => x.type === 'run_end');
  if (!hasStart || !end) return 'audit log lacks run_start or run_end';
  const steps = records.filter((x) => x.type === 'step_result' && x.status === 'OK');
  if (steps.length === 0) return 'no successful step_result';
  const untracked = steps.some(
    (s) => typeof s.cost_usd !== 'number' || typeof s.prompt_tokens !== 'number',
  );
  return untracked ? 'a step lacks tokens or cost' : true;
};

// For BID cases: the final bid must fall inside the manifest-derived range.
module.exports.bidInRange = (output, context) => {
  const r = parse(output);
  const range = bidRange(context.vars.rfp_id);
  if (!range) return true;
  const bid = r.financials && r.financials.final_bid;
  if (bid >= range.bid_min && bid <= range.bid_max) return true;
  return `final bid ${bid} outside ${range.bid_min} to ${range.bid_max}`;
};

module.exports = wrapAsserts(module.exports);
