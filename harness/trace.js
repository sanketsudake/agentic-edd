#!/usr/bin/env node
// Usage: node harness/trace.js <run_id>   (reads logs/audit/<run_id>.jsonl)
const path = require('node:path');
const { AuditLogger } = require('./audit-logger');

function formatTrace(file) {
  const records = AuditLogger.read(file);
  const lines = [];
  for (const r of records) {
    if (r.type === 'run_start') lines.push(`RUN ${r.run_id} ${r.workflow_version} rfp=${r.rfp_id} client=${r.client} agents=${r.agents.join(',')}`);
    if (r.type === 'step_result') {
      lines.push(`  ${r.step_id} ${r.prompt_version} ${r.model} a${r.attempt} ${r.status} parents=${r.parent_step_ids.join(',') || '-'} prompt=${r.prompt_tokens} completion=${r.completion_tokens} cached=${r.cached_tokens} cost_usd=${r.cost_usd} ms=${r.duration_ms}${r.problem ? ` problem=${r.problem}` : ''}`);
    }
    if (r.type === 'guardrail') lines.push(`    ${r.id} ${r.result}${r.detail ? ` ${r.detail}` : ''}${r.redactions !== undefined ? ` redactions=${r.redactions}` : ''}`);
    if (r.type === 'step_error') lines.push(`    ERROR ${r.step_id} a${r.attempt} ${r.error}`);
    if (r.type === 'branch') lines.push(`  BRANCH ${r.route} (${r.rule})${r.detail !== null && r.detail !== undefined ? ` ${JSON.stringify(r.detail)}` : ''}`);
    if (r.type === 'financials') lines.push(`  FINANCIALS materials=${r.materials} labor=${r.labor} overhead=${r.overhead} contingency=${r.contingency} final_bid=${r.final_bid} rate=${r.rates.contingency}`);
    if (r.type === 'gate') lines.push(`  GATE ${r.gate} ${r.result}${r.result !== 'PASS' ? ` ${JSON.stringify(r.detail)}` : ''}`);
    if (r.type === 'human_decision') lines.push(`  HUMAN ${r.step_id} ${r.action} stage=${r.stage} rule=${r.rule}${r.note ? ` note=${JSON.stringify(r.note)}` : ''}${r.edits && r.edits.length ? ` edits=${JSON.stringify(r.edits)}` : ''} cost_usd=0`);
    if (r.type === 'review') lines.push(`  REVIEW round=${r.round} ${r.verdict}${r.findings.length ? ` findings=${r.findings.map((f) => f.type).join(',')}` : ''}`);
    if (r.type === 'punch_out') lines.push(`  PUNCH_OUT ${r.step_id} (${r.rule}, ${r.stage}): ${r.human_question}`);
    if (r.type === 'run_end') lines.push(`END status=${r.status} route=${r.route}${r.failed_step ? ` failed_step=${r.failed_step}` : ''}\nTOTAL prompt=${r.prompt_tokens} completion=${r.completion_tokens} cached=${r.cached_tokens} cost_usd=${r.cost_usd}`);
  }
  return lines.join('\n');
}

if (require.main === module) {
  const runId = process.argv[2];
  if (!runId) { console.error('usage: node harness/trace.js <run_id>'); process.exit(1); }
  console.log(formatTrace(path.join('logs', 'audit', `${runId}.jsonl`)));
}

module.exports = { formatTrace };
