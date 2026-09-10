#!/usr/bin/env node
// Usage: node harness/report.js [--version wf-v3] [--dir logs/audit] [--json]
// Success rate, cost, bid spread, and punch-out precision/recall over every audit log, per workflow version.
const fs = require('node:fs');
const path = require('node:path');
const { AuditLogger } = require('./audit-logger');
const { loadManifest } = require('./fixtures');

const mean = (values) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0);
const pct = (n, d) => (d ? ((100 * n) / d).toFixed(1) : '0.0');

function emptyStats() {
  return {
    runs: 0,
    success: 0,
    by_status: {},
    by_route: {},
    unexpected: [],
    cost: [],
    duration_ms: [],
    bids: {},
    tokens: 0,
    punch: { tp: 0, fp: 0, fn: 0, tn: 0, failed: 0 },
  };
}

// A run succeeds when its route matches the manifest. ESTIMATE in the manifest means BID at the end.
// For an RFP that must punch out, the workflow's own decision is the punch_out event; what a human
// decides on resume (BID, DECLINED) is not the AI's outcome.
function judge(expected, end, punched) {
  if (!expected) return null;
  if (expected.route === 'ESTIMATE') return end.route === 'BID';
  if (expected.route === 'PUNCH_OUT') return punched;
  return end.route === expected.route;
}

function tally(stats, { start, end, records, expected }) {
  stats.runs += 1;
  stats.by_status[end.status] = (stats.by_status[end.status] || 0) + 1;
  if (end.route) stats.by_route[end.route] = (stats.by_route[end.route] || 0) + 1;
  stats.cost.push(end.cost_usd || 0);
  stats.tokens += end.prompt_tokens || 0;
  stats.duration_ms.push(new Date(end.ts) - new Date(start.ts));

  const punched = records.some((r) => r.type === 'punch_out');
  const ok = judge(expected, end, punched);
  if (ok === true) stats.success += 1;
  if (ok === false) {
    stats.unexpected.push({
      run: start.run_id,
      rfp: start.rfp_id,
      expected: expected.route,
      got: `${end.status}/${end.route}`,
    });
  }
  if (end.route === 'BID' && start.rfp_id) {
    (stats.bids[start.rfp_id] = stats.bids[start.rfp_id] || []).push(end.final_bid);
  }

  if (!expected) return;
  const failed = String(end.status).startsWith('FAILED') || end.status === 'HALTED';
  if (failed) stats.punch.failed += 1;
  else if (expected.punch_out && punched) stats.punch.tp += 1;
  else if (expected.punch_out && !punched) stats.punch.fn += 1;
  else if (!expected.punch_out && punched) stats.punch.fp += 1;
  else stats.punch.tn += 1;
}

function summarize(dir) {
  const expectedById = Object.fromEntries(loadManifest().rfps.map((r) => [r.id, r.expected]));
  const byVersion = {};
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.jsonl'))
    .sort();
  for (const file of files) {
    const records = AuditLogger.read(path.join(dir, file));
    const start = records.find((r) => r.type === 'run_start');
    const end = records.filter((r) => r.type === 'run_end').at(-1);
    if (!start || !end) continue;
    const version = start.workflow_version || 'unknown';
    const stats = byVersion[version] || (byVersion[version] = emptyStats());
    tally(stats, { start, end, records, expected: expectedById[start.rfp_id] });
  }
  return byVersion;
}

function formatVersion(version, s) {
  const p = s.punch;
  const lines = [
    `## ${version}`,
    '',
    '| Metric | Value |',
    '| --- | --- |',
    `| Runs (denominator, nothing excluded) | ${s.runs} |`,
    `| Success (terminal route matches the manifest) | ${s.success} / ${s.runs} = ${pct(s.success, s.runs)}% |`,
    `| By status | ${Object.entries(s.by_status)
      .map(([k, n]) => `${k} ${n}`)
      .join(', ')} |`,
    `| By route | ${Object.entries(s.by_route)
      .map(([k, n]) => `${k} ${n}`)
      .join(', ')} |`,
    `| Mean cost per run (USD) | ${mean(s.cost).toFixed(4)} |`,
    `| Total prompt tokens | ${s.tokens} |`,
    `| Mean duration (s) | ${(mean(s.duration_ms) / 1000).toFixed(1)} |`,
    '',
  ];
  const spread = Object.entries(s.bids).map(
    ([id, b]) => `${id}: ${Math.min(...b)} to ${Math.max(...b)} (n=${b.length})`,
  );
  if (spread.length) lines.push(`Final bid spread per RFP: ${spread.join('; ')}`, '');
  lines.push(
    `Punch-out: expected and got ${p.tp}, unexpected ${p.fp}, missed ${p.fn}, ` +
      `correctly not punched ${p.tn}, failed runs (counted apart) ${p.failed}; ` +
      `precision ${pct(p.tp, p.tp + p.fp)}%, recall ${pct(p.tp, p.tp + p.fn)}%`,
    '',
  );
  if (s.unexpected.length) {
    lines.push('Unexpected outcomes:');
    for (const u of s.unexpected)
      lines.push(`- ${u.run} ${u.rfp}: expected ${u.expected}, got ${u.got}`);
    lines.push('');
  }
  return lines.join('\n');
}

function fmt(byVersion, only) {
  return Object.entries(byVersion)
    .filter(([version]) => !only || version === only)
    .map(([version, stats]) => formatVersion(version, stats))
    .join('\n');
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const argAfter = (flag, fallback) =>
    args.includes(flag) ? args[args.indexOf(flag) + 1] : fallback;
  const dir = argAfter('--dir', path.join('logs', 'audit'));
  const only = argAfter('--version', null);
  const data = summarize(dir);
  console.log(args.includes('--json') ? JSON.stringify(data, null, 2) : fmt(data, only));
}

module.exports = { summarize, fmt };
