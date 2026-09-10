#!/usr/bin/env node
// Usage: node scripts/eval-summary.js <agent-dir-name> <version>
// Prints tests passed / total, assertions passed / total, and one line per failing test.
const fs = require('node:fs');
const path = require('node:path');
const [agent, version] = process.argv.slice(2);
const file = path.join(__dirname, '..', 'agents', agent, `results-${version}.json`);
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
const results = data.results.results || data.results;
const stats = data.results.stats;
let tests = 0, passed = 0, aTotal = 0, aPass = 0;
const failures = [];
for (const r of results) {
  tests += 1;
  const ok = r.success;
  if (ok) passed += 1;
  const comps = (r.gradingResult && r.gradingResult.componentResults) || [];
  aTotal += comps.length;
  aPass += comps.filter((c) => c.pass).length;
  if (!ok) {
    const bad = comps.filter((c) => !c.pass).map((c) => `${(c.assertion && c.assertion.type) || '?'}: ${String(c.reason || '').replace(/\s+/g, ' ').slice(0, 160)}`);
    failures.push(`- [${r.provider && (r.provider.label || r.provider.id)}] ${r.testCase && r.testCase.description}: ${bad.join(' | ') || r.error || 'failed'}`);
  }
}
const perProvider = {};
for (const r of results) { const k = r.provider && (r.provider.label || r.provider.id); perProvider[k] = perProvider[k] || { p: 0, n: 0 }; perProvider[k].n += 1; if (r.success) perProvider[k].p += 1; }
if (stats && stats.successes + stats.failures !== tests) console.log(`note: promptfoo stats say ${stats.successes}/${stats.successes + stats.failures} (${stats.errors} errors); the JSON export holds ${tests} rows`);
console.log(`${agent} ${version}: tests ${passed}/${tests} (${tests ? Math.round((100 * passed) / tests) : 0}%), assertions ${aPass}/${aTotal}; per model: ${Object.entries(perProvider).map(([k, v]) => `${k} ${v.p}/${v.n}`).join(', ')}`);
for (const f of failures) console.log(f);
