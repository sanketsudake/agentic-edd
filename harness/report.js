#!/usr/bin/env node
// Usage: node harness/report.js [--version wf-v1] [--dir logs/audit] [--json]
// Success-rate and cost report over every audit log: one table per workflow version.
const fs = require('node:fs');
const path = require('node:path');
const { AuditLogger } = require('./audit-logger');
const { loadManifest } = require('./fixtures');

function summarize(dir) {
  const expected = Object.fromEntries(loadManifest().rfps.map((r) => [r.id, r.expected]));
  const byVersion = {};
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.jsonl')).sort()) {
    const records = AuditLogger.read(path.join(dir, f));
    const start = records.find((r) => r.type === 'run_start');
    const end = records.filter((r) => r.type === 'run_end').at(-1);
    if (!start || !end) continue;
    const v = start.workflow_version || 'unknown';
    const s = byVersion[v] || (byVersion[v] = { runs: 0, success: 0, by_status: {}, by_route: {}, unexpected: [], cost: [], duration_ms: [], bids: {}, tokens: 0, punch: { tp: 0, fp: 0, fn: 0, tn: 0, failed: 0 } });
    s.runs += 1;
    s.by_status[end.status] = (s.by_status[end.status] || 0) + 1;
    if (end.route) s.by_route[end.route] = (s.by_route[end.route] || 0) + 1;
    s.cost.push(end.cost_usd || 0);
    s.tokens += end.prompt_tokens || 0;
    s.duration_ms.push(new Date(end.ts) - new Date(start.ts));
    const exp = expected[start.rfp_id];
    // Success: the terminal route matches the manifest. For an RFP that must punch out, the workflow's own
    // decision is the punch_out event; what a human decides on resume (BID, DECLINED) is not the AI's outcome.
    const finalRoute = end.route;
    const punched = records.some((r) => r.type === 'punch_out');
    const ok = exp ? (exp.route === 'ESTIMATE' ? finalRoute === 'BID' : exp.route === 'PUNCH_OUT' ? punched : finalRoute === exp.route) : null;
    if (ok === true) s.success += 1;
    if (ok === false) s.unexpected.push({ run: start.run_id, rfp: start.rfp_id, expected: exp.route, got: `${end.status}/${finalRoute}` });
    if (finalRoute === 'BID' && start.rfp_id) (s.bids[start.rfp_id] = s.bids[start.rfp_id] || []).push(end.final_bid);
    // Punch-out precision and recall, failures counted apart.
    if (exp) {
      if (String(end.status).startsWith('FAILED') || end.status === 'HALTED') s.punch.failed += 1;
      else if (exp.punch_out && punched) s.punch.tp += 1;
      else if (exp.punch_out && !punched) s.punch.fn += 1;
      else if (!exp.punch_out && punched) s.punch.fp += 1;
      else s.punch.tn += 1;
    }
  }
  return byVersion;
}

function fmt(byVersion, only) {
  const lines = [];
  const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
  for (const [v, s] of Object.entries(byVersion)) {
    if (only && v !== only) continue;
    lines.push(`## ${v}`, '', `| Metric | Value |`, `| --- | --- |`,
      `| Runs (denominator, nothing excluded) | ${s.runs} |`,
      `| Success (terminal route matches the manifest) | ${s.success} / ${s.runs} = ${s.runs ? (100 * s.success / s.runs).toFixed(1) : 0}% |`,
      `| By status | ${Object.entries(s.by_status).map(([k, n]) => `${k} ${n}`).join(', ')} |`,
      `| By route | ${Object.entries(s.by_route).map(([k, n]) => `${k} ${n}`).join(', ')} |`,
      `| Mean cost per run (USD) | ${mean(s.cost).toFixed(4)} |`,
      `| Total prompt tokens | ${s.tokens} |`,
      `| Mean duration (s) | ${(mean(s.duration_ms) / 1000).toFixed(1)} |`, '');
    const spread = Object.entries(s.bids).map(([id, b]) => `${id}: ${Math.min(...b)} to ${Math.max(...b)} (n=${b.length})`);
    if (spread.length) lines.push(`Final bid spread per RFP: ${spread.join('; ')}`, '');
    const p = s.punch; const prec = p.tp + p.fp ? p.tp / (p.tp + p.fp) : 0; const rec = p.tp + p.fn ? p.tp / (p.tp + p.fn) : 0;
    lines.push(`Punch-out: expected and got ${p.tp}, unexpected ${p.fp}, missed ${p.fn}, correctly not punched ${p.tn}, failed runs (counted apart) ${p.failed}; precision ${(100 * prec).toFixed(1)}%, recall ${(100 * rec).toFixed(1)}%`, '');
    if (s.unexpected.length) lines.push('Unexpected outcomes:', ...s.unexpected.map((u) => `- ${u.run} ${u.rfp}: expected ${u.expected}, got ${u.got}`), '');
  }
  return lines.join('\n');
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const dir = args.includes('--dir') ? args[args.indexOf('--dir') + 1] : path.join('logs', 'audit');
  const only = args.includes('--version') ? args[args.indexOf('--version') + 1] : null;
  const data = summarize(dir);
  console.log(args.includes('--json') ? JSON.stringify(data, null, 2) : fmt(data, only));
}

module.exports = { summarize, fmt };
