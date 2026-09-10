#!/usr/bin/env node
// Usage: node harness/resume.js <run_id>
// Continues a WAITING_HUMAN run after a human edited runs/<run_id>/checkpoint.json, under the same run id.
const fs = require('node:fs');
const path = require('node:path');
const { openRun } = require('./run-context');
const { WORKFLOW_VERSION } = require('./agents');
const { buildAgents, gatePhase, proposalPhase, extractAndEstimate, finish, failStatus } = require('./dag');
const { roundMoney } = require('./financials');
const { redact } = require('../guardrails/g2-redact');

const ACTIONS = ['approve', 'edit', 'reject'];

function applyEdits(cp, decision, run) {
  const outputs = cp.outputs;
  const edits = [];
  const costs = decision.unit_costs || {};
  for (const [key, usd] of Object.entries(costs)) {
    const k = key.toLowerCase();
    const line = outputs.a2.lines.find((l) => l.description.toLowerCase().includes(k));
    if (line) {
      edits.push({ line: line.description, from: line.unit_cost, to: usd });
      line.unit_cost = usd;
      line.line_total = roundMoney(line.quantity * usd);
      continue;
    }
    const idx = outputs.a2.unpriced.findIndex((u) => u.toLowerCase().includes(k));
    const bom = (cp.extraction.bom || []).find((b) => b.description.toLowerCase().includes(k));
    if (idx >= 0 && bom) {
      const desc = outputs.a2.unpriced.splice(idx, 1)[0];
      outputs.a2.lines.push({ description: desc, sku: 'HUMAN', quantity: bom.quantity, unit: bom.unit, unit_cost: usd, line_total: roundMoney(bom.quantity * usd), conversion: null });
      edits.push({ line: desc, from: null, to: usd, priced_by_human: true });
    }
  }
  outputs.a2.total_material_cost = roundMoney(outputs.a2.lines.reduce((s, l) => s + l.line_total, 0));
  if (typeof decision.contingency_rate === 'number') {
    edits.push({ contingency_rate: { from: outputs.a3.contingency_rate, to: decision.contingency_rate } });
    outputs.a3.contingency_rate = decision.contingency_rate;
  }
  return edits;
}

async function resumeRun(runId, opts = {}) {
  const run = openRun({ runId, runsDir: opts.runsDir, logDir: opts.logDir, workflowVersion: WORKFLOW_VERSION });
  if (opts.budget) run.budget = opts.budget;
  const cpPath = path.join(run.dir, 'checkpoint.json');
  if (!fs.existsSync(cpPath)) throw new Error(`no checkpoint at ${cpPath}`);
  const cp = JSON.parse(fs.readFileSync(cpPath, 'utf8'));
  const decision = { ...cp.decision, ...(opts.decision || {}) };
  if (!ACTIONS.includes(decision.action)) throw new Error(`decision.action must be one of ${ACTIONS.join(', ')}`);
  if (cp.stage === 'after-a1' && decision.action === 'approve') throw new Error('a hard-rule punch-out cannot be approved; edit the RFP text or reject');
  if (cp.stage === 'after-a1' && decision.action === 'edit' && typeof decision.rfp_text !== 'string') throw new Error('edit after-a1 needs decision.rfp_text');
  if (cp.stage === 'after-review' && decision.action === 'edit' && typeof decision.reply !== 'string') throw new Error('edit after-review needs decision.reply');

  const humanStep = `human-decision#${run.nextStep()}`;
  const edits = decision.action === 'edit' && cp.stage === 'after-gates' ? applyEdits(cp, decision, run) : [];
  run.audit.event('human_decision', { step_id: humanStep, actor: 'human', stage: cp.stage, rule: cp.rule, action: decision.action, note: decision.note || '', edits, parent_step_ids: [], prompt_tokens: 0, completion_tokens: 0, cached_tokens: 0, cost_usd: 0 });
  fs.renameSync(cpPath, path.join(run.dir, 'checkpoint.decided.json'));

  const outputs = cp.outputs;
  const ctx = { input: cp.input, rawText: cp.input.rfp_text, text: redact(cp.input.rfp_text).text, extraction: cp.extraction, outputs };
  try {
    if (decision.action === 'reject') {
      const replyPath = path.join(run.dir, 'reply.md');
      fs.writeFileSync(replyPath, `Dear ${cp.input.client},\n\nThank you for the request. After review we are not able to submit a bid for this work.${decision.note ? `\n\n${decision.note}` : ''}\n`);
      return finish(run, { status: 'DONE', route: 'DECLINED', outputs, financials: cp.financials, reply_path: replyPath, resumed: true });
    }
    if (cp.stage === 'after-review') {
      const proposalPath = path.join(run.dir, 'proposal.md');
      fs.writeFileSync(proposalPath, decision.action === 'edit' ? decision.reply : outputs.a4.proposal_markdown);
      return finish(run, { status: 'DONE', route: 'BID', outputs, financials: cp.financials, reply_path: proposalPath, resumed: true, human_edited: decision.action === 'edit' });
    }
    if (cp.stage === 'after-a1') {
      ctx.input = { ...cp.input, rfp_text: decision.rfp_text };
      ctx.rawText = decision.rfp_text;
      ctx.text = redact(decision.rfp_text).text;
      const agents = buildAgents(opts, ctx.rawText);
      const p1 = await extractAndEstimate(run, ctx, { agents });
      if (p1.stop) return { ...p1.stop, resumed: true };
      const p2 = gatePhase(run, ctx, { after: p1.after });
      if (p2.stop) return { ...p2.stop, resumed: true };
      return { ...(await proposalPhase(run, ctx, { agents, after: p1.after, financials: p2.financials })), resumed: true };
    }
    // after-gates: approve accepts the gate that hit; edit re-runs the gates on the edited numbers.
    const agents = buildAgents(opts, ctx.rawText);
    const p2 = gatePhase(run, ctx, { after: [humanStep], accepted: decision.action === 'approve' ? [cp.rule] : [] });
    if (p2.stop) return { ...p2.stop, resumed: true };
    return { ...(await proposalPhase(run, ctx, { agents, after: [humanStep], financials: p2.financials })), resumed: true };
  } catch (err) {
    return finish(run, { status: failStatus(err), route: null, outputs, failed_step: err.stepId || null, error: err.message, resumed: true });
  }
}

if (require.main === module) {
  const runId = process.argv[2];
  if (!runId) { console.error('usage: node harness/resume.js <run_id>'); process.exit(1); }
  resumeRun(runId).then((r) => { console.log(JSON.stringify(r)); process.exit(r.status.startsWith('FAILED') ? 2 : 0); })
    .catch((err) => { console.error(err.message); process.exit(1); });
}

module.exports = { resumeRun, applyEdits };
