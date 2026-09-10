const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { createRun } = require('./run-context');
const { runAgent } = require('./agent-runner');
const { AGENTS, WORKFLOW_VERSION } = require('./agents');
const { decideRoute, runGates } = require('./branch-rules');
const { renderNeedsInfo, renderNoBid } = require('./templates');
const { computeFinancials, verifyPricing, verifyProposalFigures } = require('./financials');
const { loadPricebook, pricebookBySku } = require('./fixtures');
const { redact, redactObject } = require('../guardrails/g2-redact');
const { hardRuleHit } = require('../guardrails/g3-hard-rules');
const { statedQuantitiesGrounded, dollarAmountsGrounded } = require('../guardrails/g6-grounding');
const BUDGET = require('./budget.json');

const REVISE_MAX = 2; // G4: a third REVISE becomes ESCALATE
const PRICEBOOK = loadPricebook();
const BY_SKU = pricebookBySku(PRICEBOOK);
const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

function buildAgents(opts, rawText) {
  return {
    a1: { ...AGENTS.a1, override: opts.a1Override, check: (o) => statedQuantitiesGrounded(o, rawText) },
    a2: { ...AGENTS.a2, override: opts.a2Override, check: (o) => { const p = verifyPricing(o, BY_SKU); return p ? `math: ${p}` : null; } },
    a3: { ...AGENTS.a3, override: opts.a3Override },
    a4: { ...AGENTS.a4, override: opts.a4Override },
    a5: { ...AGENTS.a5, override: opts.a5Override },
  };
}

function finish(run, fields) {
  run.audit.event('run_end', { workflow_version: run.workflowVersion, ...run.totals, status: fields.status, route: fields.route, failed_step: fields.failed_step || null, final_bid: fields.financials ? fields.financials.final_bid : null });
  return { run_id: run.id, run_dir: run.dir, audit_file: run.audit.file, totals: run.totals, reply_path: null, financials: null, ...fields };
}

// Punch-out: write the checkpoint the human edits, then stop with WAITING_HUMAN.
function punchOut(run, { stepId, rule, humanQuestion, outputs, financials, stage, input, extraction }) {
  const checkpoint = {
    run_id: run.id, workflow_version: run.workflowVersion, stage, rule, human_question: humanQuestion,
    input, extraction: extraction || null, outputs, financials: financials || null,
    decision: { action: null, note: '', rfp_text: null, unit_costs: {}, contingency_rate: null, reply: null },
    how_to: 'Set decision.action to "approve", "edit", or "reject". For edit: after-a1 needs rfp_text; after-gates takes unit_costs {description: usd} and/or contingency_rate; after-review takes reply (the final proposal markdown). Then run: node harness/resume.js ' + run.id,
  };
  const checkpointPath = path.join(run.dir, 'checkpoint.json');
  fs.writeFileSync(checkpointPath, `${JSON.stringify(checkpoint, null, 2)}\n`);
  run.audit.event('punch_out', { step_id: stepId, rule, stage, human_question: humanQuestion, checkpoint_path: path.relative(process.cwd(), checkpointPath) });
  return finish(run, { status: 'WAITING_HUMAN', route: 'PUNCH_OUT', outputs, financials, human_question: humanQuestion, checkpoint_path: checkpointPath });
}

// G7 sentinel file and G8 budget ceiling, checked before every transition.
function transitionGuards(run, budget = run.budget || BUDGET) {
  if (fs.existsSync(path.join(run.dir, 'HALT'))) {
    run.audit.event('guardrail', { id: 'G7', result: 'FAIL', detail: 'HALT file present' });
    const e = new Error('halted by sentinel file'); e.code = 'HALTED'; throw e;
  }
  const over = run.totals.cost_usd > budget.max_cost_usd || run.totals.prompt_tokens > budget.max_prompt_tokens;
  if (over) {
    run.audit.event('guardrail', { id: 'G8', result: 'FAIL', detail: `cost_usd ${run.totals.cost_usd} / ${budget.max_cost_usd}, prompt_tokens ${run.totals.prompt_tokens} / ${budget.max_prompt_tokens}` });
    const e = new Error('budget ceiling passed'); e.code = 'FAILED_BUDGET'; throw e;
  }
}

function failStatus(err) {
  return ['FAILED_CLI', 'FAILED_SCHEMA', 'FAILED_GROUNDING', 'FAILED_MATH', 'FAILED_BUDGET', 'HALTED'].includes(err.code) ? err.code : 'FAILED_CLI';
}

// Phase 2: financials and gates. `accepted` lists gates a human already approved on a resume.
function gatePhase(run, ctx, { after, accepted = [] }) {
  const { input, outputs, extraction } = ctx;
  const financials = computeFinancials({ total_material_cost: outputs.a2.total_material_cost, contingency_rate: outputs.a3.contingency_rate });
  run.audit.event('financials', { after, inputs: { total_material_cost: outputs.a2.total_material_cost, contingency_rate: outputs.a3.contingency_rate }, ...financials });
  const gates = runGates({ pricing: outputs.a2, risk: outputs.a3, financials });
  for (const g of gates.gates) run.audit.event('gate', { after, gate: g.gate, result: g.hit ? (accepted.includes(g.gate) ? 'ACCEPTED' : 'FAIL') : 'PASS', detail: g.detail, accepted_by_human: g.hit && accepted.includes(g.gate) });
  const hit = gates.gates.find((g) => g.hit && !accepted.includes(g.gate));
  if (hit) {
    return { stop: punchOut(run, { stepId: after[0], rule: hit.gate, stage: 'after-gates', input, extraction, outputs, financials, humanQuestion: `Gate ${hit.gate} hit (${JSON.stringify(hit.detail)}) on the RFP from ${input.client}; final bid ${financials.final_bid}. Approve, edit the prices or the rate, or decline?` }) };
  }
  return { financials };
}

// Phase 3: A4 writes, A5 attacks, with the G4 loop cap, G5 verdict consistency, G6 and G9 on the draft.
async function proposalPhase(run, ctx, { agents, after, financials }) {
  const { input, outputs, extraction, text } = ctx;
  const scope = { scope_summary: extraction.scope_summary, special_requirements: extraction.special_requirements };
  const allowedDollars = [financials.materials, financials.labor, financials.overhead, financials.contingency, financials.final_bid, ...outputs.a2.lines.flatMap((l) => [l.line_total, l.unit_cost])];
  const a4Agent = { ...agents.a4, check: (o) => { const m = verifyProposalFigures(o, financials); if (m) return `math: ${m}`; return dollarAmountsGrounded(o.proposal_markdown, allowedDollars); } };
  const figures = { materials: financials.materials, labor: financials.labor, overhead: financials.overhead, contingency: financials.contingency, final_bid: financials.final_bid };
  let findings = [];
  let parents = after;
  for (let round = 1; round <= REVISE_MAX + 1; round += 1) {
    transitionGuards(run);
    const a4 = await runAgent({ agent: a4Agent, vars: { inputs: { client: input.client, scope, lines: outputs.a2.lines, financials: figures, findings } }, run, parents });
    outputs.a4 = a4.output;
    transitionGuards(run);
    const a5 = await runAgent({ agent: agents.a5, vars: { inputs: { proposal: a4.output, scope, lines: outputs.a2.lines, financials: figures, rfp: text } }, run, parents: [a4.stepId] });
    outputs.a5 = a5.output;

    // G5: the draft passed G9, so a number_mismatch finding is unfounded and is dropped.
    const dropped = a5.output.findings.filter((f) => f.type === 'number_mismatch');
    const kept = a5.output.findings.filter((f) => f.type !== 'number_mismatch');
    let verdict = a5.output.verdict;
    if (kept.length === 0) verdict = 'APPROVE';
    else if (verdict === 'APPROVE') verdict = 'REVISE';
    const changed = verdict !== a5.output.verdict || dropped.length > 0;
    run.audit.event('guardrail', { id: 'G5', step_id: a5.stepId, result: changed ? 'FAIL' : 'PASS', detail: changed ? `verdict ${a5.output.verdict} -> ${verdict}; dropped ${dropped.length} unfounded number_mismatch finding(s) (proposal passed G9); ${kept.length} kept` : null });
    run.audit.event('review', { step_id: a5.stepId, round, verdict, findings: kept, dropped });

    if (verdict === 'APPROVE') {
      const proposalPath = path.join(run.dir, 'proposal.md');
      fs.writeFileSync(proposalPath, a4.output.proposal_markdown);
      return finish(run, { status: 'DONE', route: 'BID', outputs, financials, reply_path: proposalPath, review_rounds: round });
    }
    if (verdict === 'ESCALATE' || round === REVISE_MAX + 1) {
      const why = verdict === 'ESCALATE' ? 'reviewer escalated' : `G4: ${REVISE_MAX} revisions did not satisfy the reviewer`;
      run.audit.event('guardrail', { id: 'G4', step_id: a5.stepId, result: 'FAIL', detail: why });
      return punchOut(run, { stepId: a5.stepId, rule: verdict === 'ESCALATE' ? 'reviewer-escalate' : 'G4-loop-cap', stage: 'after-review', input, extraction, outputs, financials, humanQuestion: `${why} on the RFP from ${input.client}: ${kept.map((f) => `${f.type}: ${f.detail}`).join(' | ')}. Approve the draft, edit it, or decline?` });
    }
    run.audit.event('guardrail', { id: 'G4', step_id: a5.stepId, result: 'PASS', detail: `revise ${round} of ${REVISE_MAX}` });
    findings = kept;
    parents = [a5.stepId];
  }
  throw new Error('unreachable');
}

// Phase 1: A1, G2, G3, branch, then A2 and A3 concurrently.
async function extractAndEstimate(run, ctx, { agents }) {
  const { input, outputs } = ctx;
  transitionGuards(run);
  const a1 = await runAgent({ agent: agents.a1, vars: { rfp: ctx.rawText }, run });
  outputs.a1 = a1.output;

  const t = redact(ctx.rawText);
  const o = redactObject(a1.output);
  ctx.text = t.text;
  ctx.extraction = o.obj;
  run.audit.event('guardrail', { id: 'G2', step_id: a1.stepId, result: 'PASS', redactions: t.count + o.count });

  const hardRule = hardRuleHit(ctx.rawText);
  run.audit.event('guardrail', { id: 'G3', step_id: a1.stepId, result: hardRule ? 'FAIL' : 'PASS', detail: hardRule });

  const branch = decideRoute({ extraction: ctx.extraction, hardRule });
  run.audit.event('branch', { after: [a1.stepId], ...branch });

  if (branch.route === 'PUNCH_OUT') {
    return { stop: punchOut(run, { stepId: a1.stepId, rule: branch.rule, stage: 'after-a1', input, extraction: ctx.extraction, outputs, humanQuestion: `The RFP from ${input.client} hit the hard rule "${branch.detail}". Edit the RFP text, or decline?` }) };
  }
  if (branch.route === 'NO_BID' || branch.route === 'NEEDS_INFO') {
    const replyPath = path.join(run.dir, 'reply.md');
    const md = branch.route === 'NO_BID' ? renderNoBid({ client: input.client }) : renderNeedsInfo({ client: input.client, missing: branch.detail });
    fs.writeFileSync(replyPath, md);
    return { stop: finish(run, { status: 'DONE', route: branch.route, outputs, reply_path: replyPath }) };
  }

  const scope = { scope_summary: ctx.extraction.scope_summary, special_requirements: ctx.extraction.special_requirements };
  transitionGuards(run);
  const [a2, a3] = await Promise.all([
    runAgent({ agent: agents.a2, vars: { pricebook: PRICEBOOK.items, bom: ctx.extraction.bom }, run, parents: [a1.stepId] }),
    runAgent({ agent: agents.a3, vars: { scope, rfp: ctx.text }, run, parents: [a1.stepId] }),
  ]);
  outputs.a2 = a2.output;
  outputs.a3 = a3.output;
  return { after: [a2.stepId, a3.stepId] };
}

// input = { id, client, rfp_text }. opts.aNOverride replaces an agent's output (tests only).
async function runWorkflow(input, opts = {}) {
  const run = createRun({ runsDir: opts.runsDir, logDir: opts.logDir, workflowVersion: WORKFLOW_VERSION });
  if (opts.budget) run.budget = opts.budget;
  if (opts.haltFile) fs.writeFileSync(path.join(run.dir, 'HALT'), '');
  const ctx = { input, rawText: input.rfp_text, text: input.rfp_text, extraction: null, outputs: {} };
  const agents = buildAgents(opts, ctx.rawText);
  run.audit.event('run_start', { workflow_version: WORKFLOW_VERSION, rfp_id: input.id || null, client: input.client, input_sha256: sha256(ctx.rawText), input_chars: ctx.rawText.length, agents: Object.values(agents).map((a) => `${a.id}@${a.promptVersion}`) });
  try {
    const p1 = await extractAndEstimate(run, ctx, { agents });
    if (p1.stop) return p1.stop;
    const p2 = gatePhase(run, ctx, { after: p1.after });
    if (p2.stop) return p2.stop;
    return await proposalPhase(run, ctx, { agents, after: p1.after, financials: p2.financials });
  } catch (err) {
    return finish(run, { status: failStatus(err), route: null, outputs: ctx.outputs, failed_step: err.stepId || null, error: err.message });
  }
}

module.exports = { runWorkflow, buildAgents, gatePhase, proposalPhase, extractAndEstimate, finish, failStatus, transitionGuards, BY_SKU, REVISE_MAX };
