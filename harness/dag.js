// The pipeline: A1 extract → route → (A2 price ∥ A3 risk) → financials → gates → A4 write ⇄ A5 review.
// Agents make judgments; this file does the arithmetic, the routing, the checks, and the audit log.
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

// ---------------------------------------------------------------------------
// Agents and their per-call checks
// ---------------------------------------------------------------------------

function buildAgents(opts, rawText) {
  const pricingCheck = (output) => {
    const problem = verifyPricing(output, BY_SKU);
    return problem ? `math: ${problem}` : null;
  };
  return {
    a1: {
      ...AGENTS.a1,
      override: opts.a1Override,
      check: (o) => statedQuantitiesGrounded(o, rawText),
    },
    a2: { ...AGENTS.a2, override: opts.a2Override, check: pricingCheck },
    a3: { ...AGENTS.a3, override: opts.a3Override },
    a4: { ...AGENTS.a4, override: opts.a4Override },
    a5: { ...AGENTS.a5, override: opts.a5Override },
  };
}

// ---------------------------------------------------------------------------
// Ending a run
// ---------------------------------------------------------------------------

function finish(run, fields) {
  run.audit.event('run_end', {
    workflow_version: run.workflowVersion,
    ...run.totals,
    status: fields.status,
    route: fields.route,
    failed_step: fields.failed_step || null,
    final_bid: fields.financials ? fields.financials.final_bid : null,
  });
  return {
    run_id: run.id,
    run_dir: run.dir,
    audit_file: run.audit.file,
    totals: run.totals,
    reply_path: null,
    financials: null,
    ...fields,
  };
}

const humanQuestion = {
  hardRule: (input, rule) =>
    `The RFP from ${input.client} hit the hard rule "${rule}". Edit the RFP text, or decline?`,
  gate: (input, gate, financials) =>
    `Gate ${gate.gate} hit (${JSON.stringify(gate.detail)}) on the RFP from ${input.client}; ` +
    `final bid ${financials.final_bid}. Approve, edit the prices or the rate, or decline?`,
  review: (input, why, findings) =>
    `${why} on the RFP from ${input.client}: ` +
    `${findings.map((f) => `${f.type}: ${f.detail}`).join(' | ')}. Approve the draft, edit it, or decline?`,
};

// Punch-out: write the checkpoint the human edits, then stop with WAITING_HUMAN.
function punchOut(run, { stepId, rule, question, outputs, financials, stage, input, extraction }) {
  const checkpoint = {
    run_id: run.id,
    workflow_version: run.workflowVersion,
    stage,
    rule,
    human_question: question,
    input,
    extraction: extraction || null,
    outputs,
    financials: financials || null,
    decision: {
      action: null,
      note: '',
      rfp_text: null,
      unit_costs: {},
      contingency_rate: null,
      reply: null,
    },
    how_to:
      'Set decision.action to "approve", "edit", or "reject". ' +
      'For edit: after-a1 needs rfp_text; after-gates takes unit_costs {description: usd} and/or contingency_rate; ' +
      `after-review takes reply (the final proposal markdown). Then run: node harness/resume.js ${run.id}`,
  };
  const checkpointPath = path.join(run.dir, 'checkpoint.json');
  fs.writeFileSync(checkpointPath, `${JSON.stringify(checkpoint, null, 2)}\n`);
  run.audit.event('punch_out', {
    step_id: stepId,
    rule,
    stage,
    human_question: question,
    checkpoint_path: path.relative(process.cwd(), checkpointPath),
  });
  return finish(run, {
    status: 'WAITING_HUMAN',
    route: 'PUNCH_OUT',
    outputs,
    financials,
    human_question: question,
    checkpoint_path: checkpointPath,
  });
}

// ---------------------------------------------------------------------------
// Guards that run before every transition
// ---------------------------------------------------------------------------

// G7 sentinel file and G8 budget ceiling.
function transitionGuards(run, budget = run.budget || BUDGET) {
  if (fs.existsSync(path.join(run.dir, 'HALT'))) {
    run.audit.event('guardrail', { id: 'G7', result: 'FAIL', detail: 'HALT file present' });
    const e = new Error('halted by sentinel file');
    e.code = 'HALTED';
    throw e;
  }
  const overCost = run.totals.cost_usd > budget.max_cost_usd;
  const overTokens = run.totals.prompt_tokens > budget.max_prompt_tokens;
  if (overCost || overTokens) {
    run.audit.event('guardrail', {
      id: 'G8',
      result: 'FAIL',
      detail:
        `cost_usd ${run.totals.cost_usd} / ${budget.max_cost_usd}, ` +
        `prompt_tokens ${run.totals.prompt_tokens} / ${budget.max_prompt_tokens}`,
    });
    const e = new Error('budget ceiling passed');
    e.code = 'FAILED_BUDGET';
    throw e;
  }
}

const FAIL_CODES = [
  'FAILED_CLI',
  'FAILED_SCHEMA',
  'FAILED_GROUNDING',
  'FAILED_MATH',
  'FAILED_BUDGET',
  'HALTED',
];
const failStatus = (err) => (FAIL_CODES.includes(err.code) ? err.code : 'FAILED_CLI');

// ---------------------------------------------------------------------------
// Phase 1: extract, redact, hard rules, route, then price and assess in parallel
// ---------------------------------------------------------------------------

async function extractAndEstimate(run, ctx, { agents }) {
  const { input, outputs } = ctx;

  transitionGuards(run);
  const a1 = await runAgent({ agent: agents.a1, vars: { rfp: ctx.rawText }, run });
  outputs.a1 = a1.output;

  // G2: redact personal data in the text and in A1's output before any later agent sees them.
  const redactedText = redact(ctx.rawText);
  const redactedOutput = redactObject(a1.output);
  ctx.text = redactedText.text;
  ctx.extraction = redactedOutput.obj;
  run.audit.event('guardrail', {
    id: 'G2',
    step_id: a1.stepId,
    result: 'PASS',
    redactions: redactedText.count + redactedOutput.count,
  });

  // G3: hard-stop phrases on the raw text.
  const hardRule = hardRuleHit(ctx.rawText);
  run.audit.event('guardrail', {
    id: 'G3',
    step_id: a1.stepId,
    result: hardRule ? 'FAIL' : 'PASS',
    detail: hardRule,
  });

  const branch = decideRoute({ extraction: ctx.extraction, hardRule });
  run.audit.event('branch', { after: [a1.stepId], ...branch });

  if (branch.route === 'PUNCH_OUT') {
    const stop = punchOut(run, {
      stepId: a1.stepId,
      rule: branch.rule,
      stage: 'after-a1',
      input,
      extraction: ctx.extraction,
      outputs,
      question: humanQuestion.hardRule(input, branch.detail),
    });
    return { stop };
  }
  if (branch.route === 'NO_BID' || branch.route === 'NEEDS_INFO') {
    const replyPath = path.join(run.dir, 'reply.md');
    const reply =
      branch.route === 'NO_BID'
        ? renderNoBid({ client: input.client })
        : renderNeedsInfo({ client: input.client, missing: branch.detail });
    fs.writeFileSync(replyPath, reply);
    return {
      stop: finish(run, { status: 'DONE', route: branch.route, outputs, reply_path: replyPath }),
    };
  }

  // ESTIMATE: A2 and A3 run concurrently on the redacted extraction.
  const scope = {
    scope_summary: ctx.extraction.scope_summary,
    special_requirements: ctx.extraction.special_requirements,
  };
  transitionGuards(run);
  const [a2, a3] = await Promise.all([
    runAgent({
      agent: agents.a2,
      vars: { pricebook: PRICEBOOK.items, bom: ctx.extraction.bom },
      run,
      parents: [a1.stepId],
    }),
    runAgent({ agent: agents.a3, vars: { scope, rfp: ctx.text }, run, parents: [a1.stepId] }),
  ]);
  outputs.a2 = a2.output;
  outputs.a3 = a3.output;
  return { after: [a2.stepId, a3.stepId] };
}

// ---------------------------------------------------------------------------
// Phase 2: the arithmetic and the gates
// ---------------------------------------------------------------------------

// `accepted` lists gates a human already approved on a resume.
function gatePhase(run, ctx, { after, accepted = [] }) {
  const { input, outputs, extraction } = ctx;
  const inputs = {
    total_material_cost: outputs.a2.total_material_cost,
    contingency_rate: outputs.a3.contingency_rate,
  };
  const financials = computeFinancials(inputs);
  run.audit.event('financials', { after, inputs, ...financials });

  const gates = runGates({ pricing: outputs.a2, risk: outputs.a3, financials });
  for (const g of gates.gates) {
    const acceptedByHuman = g.hit && accepted.includes(g.gate);
    run.audit.event('gate', {
      after,
      gate: g.gate,
      result: g.hit ? (acceptedByHuman ? 'ACCEPTED' : 'FAIL') : 'PASS',
      detail: g.detail,
      accepted_by_human: acceptedByHuman,
    });
  }

  const hit = gates.gates.find((g) => g.hit && !accepted.includes(g.gate));
  if (hit) {
    const stop = punchOut(run, {
      stepId: after[0],
      rule: hit.gate,
      stage: 'after-gates',
      input,
      extraction,
      outputs,
      financials,
      question: humanQuestion.gate(input, hit, financials),
    });
    return { stop };
  }
  return { financials };
}

// ---------------------------------------------------------------------------
// Phase 3: write, review, revise
// ---------------------------------------------------------------------------

// G5: the draft already passed G9, so a number_mismatch finding is unfounded and is dropped.
// APPROVE with a remaining finding becomes REVISE; a verdict with no remaining findings becomes APPROVE.
function applyVerdictConsistency(review) {
  const dropped = review.findings.filter((f) => f.type === 'number_mismatch');
  const kept = review.findings.filter((f) => f.type !== 'number_mismatch');
  let verdict = review.verdict;
  if (kept.length === 0) verdict = 'APPROVE';
  else if (verdict === 'APPROVE') verdict = 'REVISE';
  const changed = verdict !== review.verdict || dropped.length > 0;
  const detail = changed
    ? `verdict ${review.verdict} -> ${verdict}; dropped ${dropped.length} unfounded number_mismatch ` +
      `finding(s) (proposal passed G9); ${kept.length} kept`
    : null;
  return { verdict, kept, dropped, changed, detail };
}

async function proposalPhase(run, ctx, { agents, after, financials }) {
  const { input, outputs, extraction, text } = ctx;
  const scope = {
    scope_summary: extraction.scope_summary,
    special_requirements: extraction.special_requirements,
  };
  const figures = {
    materials: financials.materials,
    labor: financials.labor,
    overhead: financials.overhead,
    contingency: financials.contingency,
    final_bid: financials.final_bid,
  };
  const knownDollars = [
    ...Object.values(figures),
    ...outputs.a2.lines.flatMap((l) => [l.line_total, l.unit_cost]),
  ];
  // G9 on the figures, then G6 on every dollar amount in the text.
  const writerCheck = (draft) => {
    const mismatch = verifyProposalFigures(draft, financials);
    if (mismatch) return `math: ${mismatch}`;
    return dollarAmountsGrounded(draft.proposal_markdown, knownDollars);
  };
  const writer = { ...agents.a4, check: writerCheck };

  let findings = [];
  let parents = after;
  for (let round = 1; round <= REVISE_MAX + 1; round += 1) {
    transitionGuards(run);
    const a4 = await runAgent({
      agent: writer,
      vars: {
        inputs: {
          client: input.client,
          scope,
          lines: outputs.a2.lines,
          financials: figures,
          findings,
        },
      },
      run,
      parents,
    });
    outputs.a4 = a4.output;

    transitionGuards(run);
    const a5 = await runAgent({
      agent: agents.a5,
      vars: {
        inputs: {
          proposal: a4.output,
          scope,
          lines: outputs.a2.lines,
          financials: figures,
          rfp: text,
        },
      },
      run,
      parents: [a4.stepId],
    });
    outputs.a5 = a5.output;

    const review = applyVerdictConsistency(a5.output);
    run.audit.event('guardrail', {
      id: 'G5',
      step_id: a5.stepId,
      result: review.changed ? 'FAIL' : 'PASS',
      detail: review.detail,
    });
    run.audit.event('review', {
      step_id: a5.stepId,
      round,
      verdict: review.verdict,
      findings: review.kept,
      dropped: review.dropped,
    });

    if (review.verdict === 'APPROVE') {
      const proposalPath = path.join(run.dir, 'proposal.md');
      fs.writeFileSync(proposalPath, a4.output.proposal_markdown);
      return finish(run, {
        status: 'DONE',
        route: 'BID',
        outputs,
        financials,
        reply_path: proposalPath,
        review_rounds: round,
      });
    }

    const lastRound = round === REVISE_MAX + 1;
    if (review.verdict === 'ESCALATE' || lastRound) {
      const why =
        review.verdict === 'ESCALATE'
          ? 'reviewer escalated'
          : `G4: ${REVISE_MAX} revisions did not satisfy the reviewer`;
      run.audit.event('guardrail', { id: 'G4', step_id: a5.stepId, result: 'FAIL', detail: why });
      return punchOut(run, {
        stepId: a5.stepId,
        rule: review.verdict === 'ESCALATE' ? 'reviewer-escalate' : 'G4-loop-cap',
        stage: 'after-review',
        input,
        extraction,
        outputs,
        financials,
        question: humanQuestion.review(input, why, review.kept),
      });
    }

    run.audit.event('guardrail', {
      id: 'G4',
      step_id: a5.stepId,
      result: 'PASS',
      detail: `revise ${round} of ${REVISE_MAX}`,
    });
    findings = review.kept;
    parents = [a5.stepId];
  }
  throw new Error('unreachable');
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

// input = { id, client, rfp_text }. opts.aNOverride replaces an agent's output (tests only).
async function runWorkflow(input, opts = {}) {
  const run = createRun({
    runsDir: opts.runsDir,
    logDir: opts.logDir,
    workflowVersion: WORKFLOW_VERSION,
  });
  if (opts.budget) run.budget = opts.budget;
  if (opts.haltFile) fs.writeFileSync(path.join(run.dir, 'HALT'), '');

  const ctx = {
    input,
    rawText: input.rfp_text,
    text: input.rfp_text,
    extraction: null,
    outputs: {},
  };
  const agents = buildAgents(opts, ctx.rawText);
  run.audit.event('run_start', {
    workflow_version: WORKFLOW_VERSION,
    rfp_id: input.id || null,
    client: input.client,
    input_sha256: sha256(ctx.rawText),
    input_chars: ctx.rawText.length,
    agents: Object.values(agents).map((a) => `${a.id}@${a.promptVersion}`),
  });

  try {
    const phase1 = await extractAndEstimate(run, ctx, { agents });
    if (phase1.stop) return phase1.stop;
    const phase2 = gatePhase(run, ctx, { after: phase1.after });
    if (phase2.stop) return phase2.stop;
    return await proposalPhase(run, ctx, {
      agents,
      after: phase1.after,
      financials: phase2.financials,
    });
  } catch (err) {
    return finish(run, {
      status: failStatus(err),
      route: null,
      outputs: ctx.outputs,
      failed_step: err.stepId || null,
      error: err.message,
    });
  }
}

module.exports = {
  runWorkflow,
  buildAgents,
  gatePhase,
  proposalPhase,
  extractAndEstimate,
  finish,
  failStatus,
  transitionGuards,
  BY_SKU,
  REVISE_MAX,
};
