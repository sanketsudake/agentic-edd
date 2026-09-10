const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { runWorkflow } = require('../harness/dag');
const { resumeRun } = require('../harness/resume');
const { loadRfp } = require('../harness/fixtures');
const { AuditLogger } = require('../harness/audit-logger');

const FAKE = path.join(__dirname, 'fixtures', 'fake-devin.js');
const input = (id) => {
  const r = loadRfp(id);
  return { id: r.id, client: r.client, rfp_text: r.rfp_text };
};
const outputs = (name) =>
  JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'outputs', `${name}.json`), 'utf8'));
function dirs() {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'resume-'));
  return { runsDir: path.join(base, 'runs'), logDir: path.join(base, 'logs') };
}
const lastSeq = (file) => AuditLogger.read(file).at(-1).seq;

test('after-gates: approve accepts the gate and the same run continues to BID', async () => {
  process.env.DEVIN_BIN = FAKE;
  const d = dirs();
  const a2 = {
    ...outputs('a2-pricing-analyst'),
    lines: [
      {
        description: 'concrete',
        sku: 'CONC-3500',
        quantity: 2333.34,
        unit: 'cu_yd',
        unit_cost: 180,
        line_total: 420001.2,
        conversion: null,
      },
    ],
    total_material_cost: 420001.2,
  };
  const first = await runWorkflow(input('rfp-07'), {
    ...d,
    a1Override: outputs('a1-rfp-extractor'),
    a2Override: a2,
  });
  assert.equal(first.status, 'WAITING_HUMAN');
  assert.ok(fs.existsSync(first.checkpoint_path));
  const cp = JSON.parse(fs.readFileSync(first.checkpoint_path, 'utf8'));
  assert.equal(cp.stage, 'after-gates');
  assert.equal(cp.rule, 'bid-threshold');
  const seqBefore = lastSeq(first.audit_file);

  const a4 = {
    ...outputs('a4-proposal-writer'),
    figures: {
      materials: 420001.2,
      labor: 252000.72,
      overhead: 100800.29,
      contingency: 67200.19,
      final_bid: 840002.4,
    },
    proposal_markdown: outputs('a4-proposal-writer').proposal_markdown.replace(
      /\$[\d,]+\.\d\d/g,
      '$840,002.40',
    ),
  };
  const r = await resumeRun(first.run_id, {
    ...d,
    decision: { action: 'approve', note: 'Board approved the exposure.' },
    a4Override: a4,
    a5Override: outputs('a5-adversarial-reviewer'),
  });
  assert.equal(r.run_id, first.run_id);
  assert.equal(r.status, 'DONE');
  assert.equal(r.route, 'BID');
  assert.equal(r.resumed, true);
  const records = AuditLogger.read(r.audit_file);
  const human = records.find((x) => x.type === 'human_decision');
  assert.equal(human.actor, 'human');
  assert.equal(human.cost_usd, 0);
  assert.ok(human.seq > seqBefore, 'audit log continues in the same file');
  assert.equal(
    records.filter((x) => x.type === 'gate' && x.gate === 'bid-threshold').at(-1).result,
    'ACCEPTED',
  );
  assert.ok(!fs.existsSync(first.checkpoint_path));
  assert.ok(fs.existsSync(path.join(first.run_dir, 'checkpoint.decided.json')));
});

test('after-gates: edit prices an unpriced line by hand, recomputes the financials, and continues', async () => {
  process.env.DEVIN_BIN = FAKE;
  const d = dirs();
  const a1 = {
    ...outputs('a1-rfp-extractor'),
    bom: [
      ...outputs('a1-rfp-extractor').bom,
      {
        category: 'roofing',
        description: 'standing-seam copper roofing panels',
        quantity: 4000,
        unit: 'sq_ft',
        source: 'stated',
        basis: 'over the full area',
      },
    ],
  };
  const a2 = {
    ...outputs('a2-pricing-analyst'),
    unpriced: ['standing-seam copper roofing panels'],
  };
  const first = await runWorkflow(input('rfp-10'), { ...d, a1Override: a1, a2Override: a2 });
  assert.equal(first.status, 'WAITING_HUMAN');
  const r = await resumeRun(first.run_id, {
    ...d,
    decision: { action: 'edit', unit_costs: { copper: 30 }, contingency_rate: 0.15 },
    a4Override: null,
    a5Override: outputs('a5-adversarial-reviewer'),
  });
  // A4 runs through the fake (its fixture figures do not match the new financials), so the run ends FAILED_MATH after G9;
  // the financials themselves must show the human edit.
  const records = AuditLogger.read(r.audit_file);
  const fin = records.filter((x) => x.type === 'financials').at(-1);
  assert.equal(fin.materials, 22670 + 4000 * 30);
  assert.equal(fin.rates.contingency, 0.15);
  const human = records.find((x) => x.type === 'human_decision');
  assert.equal(human.edits.length, 2);
  assert.equal(human.edits[0].priced_by_human, true);
  assert.equal(
    records.filter((x) => x.type === 'gate' && x.gate === 'unpriced-material').at(-1).result,
    'PASS',
  );
});

test('after-review: edit replaces the proposal and ends BID; reject ends DECLINED', async () => {
  process.env.DEVIN_BIN = FAKE;
  const d = dirs();
  const a5 = { verdict: 'ESCALATE', findings: [{ type: 'promise', detail: 'guarantee' }] };
  const first = await runWorkflow(input('rfp-03'), { ...d, a5Override: a5 });
  assert.equal(first.status, 'WAITING_HUMAN');
  const r = await resumeRun(first.run_id, {
    ...d,
    decision: { action: 'edit', reply: '# Final proposal\n\nEdited by the estimator.' },
  });
  assert.equal(r.route, 'BID');
  assert.equal(r.human_edited, true);
  assert.match(fs.readFileSync(r.reply_path, 'utf8'), /Edited by the estimator/);

  const second = await runWorkflow(input('rfp-03'), { ...d, a5Override: a5 });
  const rej = await resumeRun(second.run_id, {
    ...d,
    decision: { action: 'reject', note: 'Outside our region.' },
  });
  assert.equal(rej.route, 'DECLINED');
  assert.match(fs.readFileSync(rej.reply_path, 'utf8'), /not able to submit a bid/);
});

test('after-a1: approve is refused; edit with new RFP text re-runs from A1', async () => {
  process.env.DEVIN_BIN = FAKE;
  const d = dirs();
  const first = await runWorkflow(input('rfp-06'), {
    ...d,
    a1Override: outputs('a1-rfp-extractor'),
  });
  assert.equal(first.status, 'WAITING_HUMAN');
  await assert.rejects(
    resumeRun(first.run_id, { ...d, decision: { action: 'approve' } }),
    /cannot be approved/,
  );
  const clean = input('rfp-06').rfp_text.replace(
    'a survey found asbestos in the felt layers, so the tear-off must be handled as abatement',
    'the survey found no special material',
  );
  const r = await resumeRun(first.run_id, {
    ...d,
    decision: { action: 'edit', rfp_text: clean },
    a1Override: outputs('a1-rfp-extractor'),
    a4Override: outputs('a4-proposal-writer'),
    a5Override: outputs('a5-adversarial-reviewer'),
  });
  assert.equal(r.run_id, first.run_id);
  assert.equal(r.route, 'BID');
  const records = AuditLogger.read(r.audit_file);
  assert.equal(
    records.filter((x) => x.type === 'step_start' && x.agent === 'a1-rfp-extractor').length,
    2,
  );
  assert.equal(
    records.filter((x) => x.type === 'guardrail' && x.id === 'G3').at(-1).result,
    'PASS',
  );
});

test('G7: a HALT file stops the run with HALTED; G8: a tiny budget stops it with FAILED_BUDGET', async () => {
  process.env.DEVIN_BIN = FAKE;
  const h = await runWorkflow(input('rfp-03'), { ...dirs(), haltFile: true });
  assert.equal(h.status, 'HALTED');
  assert.equal(
    AuditLogger.read(h.audit_file).find((x) => x.type === 'guardrail' && x.id === 'G7').result,
    'FAIL',
  );
  const b = await runWorkflow(input('rfp-03'), {
    ...dirs(),
    budget: { max_cost_usd: 0.0001, max_prompt_tokens: 1500 },
  });
  assert.equal(b.status, 'FAILED_BUDGET');
  const g8 = AuditLogger.read(b.audit_file).find((x) => x.type === 'guardrail' && x.id === 'G8');
  assert.match(g8.detail, /prompt_tokens/);
});
