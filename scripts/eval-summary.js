#!/usr/bin/env node
// Usage: node scripts/eval-summary.js <agent-dir-name> <version>
// Prints tests passed / total, assertions passed / total, the split per model, and one line per failing test.
const fs = require('node:fs');
const path = require('node:path');

const [agent, version] = process.argv.slice(2);
if (!agent || !version) {
  console.error('usage: node scripts/eval-summary.js <agent-dir-name> <version>');
  process.exit(1);
}

const file = path.join(__dirname, '..', 'agents', agent, `results-${version}.json`);
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
const results = data.results.results || data.results;
const stats = data.results.stats;

const providerName = (r) => (r.provider && (r.provider.label || r.provider.id)) || '?';
const describeFailure = (r) => {
  const comps = (r.gradingResult && r.gradingResult.componentResults) || [];
  const bad = comps
    .filter((c) => !c.pass)
    .map((c) => {
      const type = (c.assertion && c.assertion.type) || '?';
      const reason = String(c.reason || '')
        .replace(/\s+/g, ' ')
        .slice(0, 160);
      return `${type}: ${reason}`;
    });
  return `- [${providerName(r)}] ${r.testCase && r.testCase.description}: ${bad.join(' | ') || r.error || 'failed'}`;
};

let passed = 0;
let assertionsTotal = 0;
let assertionsPassed = 0;
const perModel = {};
const failures = [];
for (const r of results) {
  const model = providerName(r);
  perModel[model] = perModel[model] || { pass: 0, total: 0 };
  perModel[model].total += 1;
  if (r.success) {
    passed += 1;
    perModel[model].pass += 1;
  } else {
    failures.push(describeFailure(r));
  }
  const comps = (r.gradingResult && r.gradingResult.componentResults) || [];
  assertionsTotal += comps.length;
  assertionsPassed += comps.filter((c) => c.pass).length;
}

const total = results.length;
if (stats && stats.successes + stats.failures !== total) {
  console.log(
    `note: promptfoo stats say ${stats.successes}/${stats.successes + stats.failures} ` +
      `(${stats.errors} errors); the JSON export holds ${total} rows`,
  );
}
const perModelText = Object.entries(perModel)
  .map(([k, v]) => `${k} ${v.pass}/${v.total}`)
  .join(', ');
console.log(
  `${agent} ${version}: tests ${passed}/${total} (${total ? Math.round((100 * passed) / total) : 0}%), ` +
    `assertions ${assertionsPassed}/${assertionsTotal}; per model: ${perModelText}`,
);
for (const line of failures) console.log(line);
