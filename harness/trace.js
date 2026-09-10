#!/usr/bin/env node
// Usage: node harness/trace.js <run_id>
// Prints one line per audit event so a reader can follow a run: who ran, with which prompt,
// what it cost, which checks passed, which route was taken, and how the run ended.
const path = require('node:path');
const { AuditLogger } = require('./audit-logger');

const join = (ids) => (ids && ids.length ? ids.join(',') : '-');

const formatters = {
  run_start: (r) =>
    `RUN ${r.run_id} ${r.workflow_version} rfp=${r.rfp_id} client=${r.client} agents=${r.agents.join(',')}`,

  step_result: (r) => {
    const tokens = `prompt=${r.prompt_tokens} completion=${r.completion_tokens} cached=${r.cached_tokens}`;
    const cost = `cost_usd=${r.cost_usd} ms=${r.duration_ms}`;
    const problem = r.problem ? ` problem=${r.problem}` : '';
    const head = `${r.step_id} ${r.prompt_version} ${r.model} a${r.attempt} ${r.status}`;
    return `  ${head} parents=${join(r.parent_step_ids)} ${tokens} ${cost}${problem}`;
  },

  guardrail: (r) => {
    const detail = r.detail ? ` ${r.detail}` : '';
    const redactions = r.redactions !== undefined ? ` redactions=${r.redactions}` : '';
    return `    ${r.id} ${r.result}${detail}${redactions}`;
  },

  step_error: (r) => `    ERROR ${r.step_id} a${r.attempt} ${r.error}`,

  branch: (r) => {
    const detail =
      r.detail !== null && r.detail !== undefined ? ` ${JSON.stringify(r.detail)}` : '';
    return `  BRANCH ${r.route} (${r.rule})${detail}`;
  },

  financials: (r) =>
    `  FINANCIALS materials=${r.materials} labor=${r.labor} overhead=${r.overhead} ` +
    `contingency=${r.contingency} final_bid=${r.final_bid} rate=${r.rates.contingency}`,

  gate: (r) =>
    `  GATE ${r.gate} ${r.result}${r.result !== 'PASS' ? ` ${JSON.stringify(r.detail)}` : ''}`,

  review: (r) => {
    const types = r.findings.map((f) => f.type).join(',');
    return `  REVIEW round=${r.round} ${r.verdict}${types ? ` findings=${types}` : ''}`;
  },

  human_decision: (r) => {
    const note = r.note ? ` note=${JSON.stringify(r.note)}` : '';
    const edits = r.edits && r.edits.length ? ` edits=${JSON.stringify(r.edits)}` : '';
    return `  HUMAN ${r.step_id} ${r.action} stage=${r.stage} rule=${r.rule}${note}${edits} cost_usd=0`;
  },

  punch_out: (r) => `  PUNCH_OUT ${r.step_id} (${r.rule}, ${r.stage}): ${r.human_question}`,

  run_end: (r) => {
    const failed = r.failed_step ? ` failed_step=${r.failed_step}` : '';
    const totals =
      `prompt=${r.prompt_tokens} completion=${r.completion_tokens} ` +
      `cached=${r.cached_tokens} cost_usd=${r.cost_usd}`;
    return `END status=${r.status} route=${r.route}${failed}\nTOTAL ${totals}`;
  },
};

function formatTrace(file) {
  return AuditLogger.read(file)
    .map((record) => (formatters[record.type] ? formatters[record.type](record) : null))
    .filter(Boolean)
    .join('\n');
}

if (require.main === module) {
  const runId = process.argv[2];
  if (!runId) {
    console.error('usage: node harness/trace.js <run_id>');
    process.exit(1);
  }
  console.log(formatTrace(path.join('logs', 'audit', `${runId}.jsonl`)));
}

module.exports = { formatTrace };
