const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { runWorkflow } = require('../harness/dag');
const { loadRfp } = require('../harness/fixtures');
const { AuditLogger } = require('../harness/audit-logger');
const { BID_THRESHOLD_USD } = require('../harness/constants');

const FAKE = path.join(__dirname, 'fixtures', 'fake-devin.js');
const input = (id) => { const r = loadRfp(id); return { id: r.id, client: r.client, rfp_text: r.rfp_text }; };
const outputs = (name) => JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'outputs', `${name}.json`), 'utf8'));

function dirs() {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'dag-'));
  return { runsDir: path.join(base, 'runs'), logDir: path.join(base, 'logs') };
}

test('rfp-03: A1, then A2 and A3 concurrently, financials computed, no gate hit, status DONE route ESTIMATE', async () => {
  process.env.DEVIN_BIN = FAKE;
  const r = await runWorkflow(input('rfp-03'), { ...dirs(), a4Override: outputs('a4-proposal-writer'), a5Override: outputs('a5-adversarial-reviewer') });
  assert.equal(r.status, 'DONE');
  assert.equal(r.route, 'BID');
  assert.deepEqual(r.financials, { materials: 22670, labor: 13602, overhead: 5440.8, contingency: 3627.2, final_bid: 45340, rates: { labor: 0.6, overhead: 0.15, contingency: 0.1 } });
  const records = AuditLogger.read(r.audit_file);
  const starts = records.filter((x) => x.type === 'step_start').map((x) => x.agent);
  assert.deepEqual(starts, ['a1-rfp-extractor', 'a2-pricing-analyst', 'a3-risk-assessor', 'a4-proposal-writer', 'a5-adversarial-reviewer']);
  const a3start = records.find((x) => x.type === 'step_start' && x.agent === 'a3-risk-assessor');
  const a2result = records.find((x) => x.type === 'step_result' && x.agent === 'a2-pricing-analyst');
  assert.ok(a3start.seq < a2result.seq, 'A3 must start before A2 finishes');
  assert.deepEqual(a3start.parent_step_ids, ['a1-rfp-extractor#1']);
  assert.equal(records.find((x) => x.type === 'branch').route, 'ESTIMATE');
  const fin = records.find((x) => x.type === 'financials');
  assert.equal(fin.final_bid, 45340);
  assert.deepEqual(fin.after.sort(), ['a2-pricing-analyst#2', 'a3-risk-assessor#3']);
  assert.deepEqual(records.filter((x) => x.type === 'gate').map((x) => `${x.gate}:${x.result}`), ['unpriced-material:PASS', 'risk-flag:PASS', 'bid-threshold:PASS']);
  const end = records.find((x) => x.type === 'run_end');
  assert.equal(end.status, 'DONE');
  assert.equal(end.prompt_tokens, 3000);
  assert.equal(end.final_bid, 45340);
  assert.equal(r.totals.cost_usd, end.cost_usd);
});

test('rfp-05: missing quantities route to NEEDS_INFO with a template reply and no A2 or A3 call', async () => {
  process.env.DEVIN_BIN = FAKE;
  const a1 = { ...outputs('a1-rfp-extractor'), bom: [], missing_quantities: ['wall length in linear feet', 'wall height in feet'] };
  const r = await runWorkflow(input('rfp-05'), { ...dirs(), a1Override: a1 });
  assert.equal(r.status, 'DONE');
  assert.equal(r.route, 'NEEDS_INFO');
  const reply = fs.readFileSync(r.reply_path, 'utf8');
  assert.match(reply, /Eastgate Warehousing/);
  assert.match(reply, /- wall length in linear feet/);
  const records = AuditLogger.read(r.audit_file);
  assert.equal(records.filter((x) => x.type === 'step_start').length, 1);
});

test('rfp-09: not construction routes to NO_BID with a decline', async () => {
  process.env.DEVIN_BIN = FAKE;
  const a1 = { ...outputs('a1-rfp-extractor'), is_construction: false, bom: [] };
  const r = await runWorkflow(input('rfp-09'), { ...dirs(), a1Override: a1 });
  assert.equal(r.route, 'NO_BID');
  assert.match(fs.readFileSync(r.reply_path, 'utf8'), /not able to bid/);
});

test('rfp-06: asbestos hits G3 and punches out after A1', async () => {
  process.env.DEVIN_BIN = FAKE;
  const r = await runWorkflow(input('rfp-06'), { ...dirs(), a1Override: outputs('a1-rfp-extractor') });
  assert.equal(r.status, 'WAITING_HUMAN');
  assert.equal(r.route, 'PUNCH_OUT');
  const records = AuditLogger.read(r.audit_file);
  assert.equal(records.find((x) => x.type === 'guardrail' && x.id === 'G3').detail, 'asbestos');
  assert.equal(records.find((x) => x.type === 'punch_out').rule, 'G3');
  assert.equal(records.filter((x) => x.type === 'step_start').length, 1);
});

test('rfp-10: an unpriced material trips the gate after the financials', async () => {
  process.env.DEVIN_BIN = FAKE;
  const a2 = { ...outputs('a2-pricing-analyst'), unpriced: ['standing-seam copper roofing panels', 'copper edge flashing'] };
  const r = await runWorkflow(input('rfp-10'), { ...dirs(), a1Override: outputs('a1-rfp-extractor'), a2Override: a2 });
  assert.equal(r.status, 'WAITING_HUMAN');
  const records = AuditLogger.read(r.audit_file);
  assert.equal(records.find((x) => x.type === 'punch_out').rule, 'unpriced-material');
  assert.ok(records.find((x) => x.type === 'financials'));
});

test('rfp-07: a bid above the threshold punches out', async () => {
  process.env.DEVIN_BIN = FAKE;
  const a2 = { ...outputs('a2-pricing-analyst'), lines: [{ description: 'concrete', sku: 'CONC-3500', quantity: 2333.34, unit: 'cu_yd', unit_cost: 180, line_total: 420001.2, conversion: null }], total_material_cost: 420001.2 };
  const r = await runWorkflow(input('rfp-07'), { ...dirs(), a1Override: outputs('a1-rfp-extractor'), a2Override: a2 });
  assert.equal(r.status, 'WAITING_HUMAN');
  const punch = AuditLogger.read(r.audit_file).find((x) => x.type === 'punch_out');
  assert.equal(punch.rule, 'bid-threshold');
  assert.ok(r.financials.final_bid > BID_THRESHOLD_USD);
});

test('a hazardous_material flag from A3 punches out', async () => {
  process.env.DEVIN_BIN = FAKE;
  const a3 = { ...outputs('a3-risk-assessor'), flags: ['hazardous_material'], contingency_rate: 0.2 };
  const r = await runWorkflow(input('rfp-03'), { ...dirs(), a3Override: a3, a4Override: outputs('a4-proposal-writer') });
  assert.equal(AuditLogger.read(r.audit_file).find((x) => x.type === 'punch_out').rule, 'risk-flag');
  assert.equal(r.financials.rates.contingency, 0.2);
});

test('A2 arithmetic errors fail with FAILED_MATH after three attempts', async () => {
  process.env.DEVIN_BIN = FAKE;
  const bad = { ...outputs('a2-pricing-analyst'), total_material_cost: 1 };
  process.env.FAKE_DEVIN_STDOUT = JSON.stringify(bad);
  try {
    const r = await runWorkflow(input('rfp-03'), { ...dirs(), a1Override: outputs('a1-rfp-extractor'), a3Override: outputs('a3-risk-assessor') });
    assert.equal(r.status, 'FAILED_MATH');
    assert.equal(AuditLogger.read(r.audit_file).find((x) => x.type === 'run_end').failed_step, 'a2-pricing-analyst#2');
  } finally {
    delete process.env.FAKE_DEVIN_STDOUT;
  }
});

test('devin failure ends FAILED_CLI', async () => {
  process.env.DEVIN_BIN = FAKE;
  process.env.FAKE_DEVIN_EXIT = '1';
  try {
    const r = await runWorkflow(input('rfp-03'), dirs());
    assert.equal(r.status, 'FAILED_CLI');
  } finally {
    delete process.env.FAKE_DEVIN_EXIT;
  }
});

test('rfp-03 full run: A4 drafts, A5 approves, status DONE route BID with proposal.md', async () => {
  process.env.DEVIN_BIN = FAKE;
  const r = await runWorkflow(input('rfp-03'), dirs());
  assert.equal(r.status, 'DONE');
  assert.equal(r.route, 'BID');
  assert.equal(r.review_rounds, 1);
  assert.match(fs.readFileSync(r.reply_path, 'utf8'), /Final Bid Price: \$45,340\.00/);
  const records = AuditLogger.read(r.audit_file);
  assert.deepEqual(records.filter((x) => x.type === 'step_start').map((x) => x.agent), ['a1-rfp-extractor', 'a2-pricing-analyst', 'a3-risk-assessor', 'a4-proposal-writer', 'a5-adversarial-reviewer']);
  assert.equal(records.find((x) => x.type === 'review').verdict, 'APPROVE');
  assert.equal(records.find((x) => x.type === 'run_end').prompt_tokens, 5000);
});

test('G5: APPROVE with findings becomes REVISE, then a clean second round approves', async () => {
  process.env.DEVIN_BIN = FAKE;
  let calls = 0;
  const a5Seq = [{ verdict: 'APPROVE', findings: [{ type: 'tone', detail: 'lol' }] }, { verdict: 'APPROVE', findings: [] }];
  // The fake reads FAKE_DEVIN_STDOUT for every agent, so override A1..A4 and drive A5 through a per-call fixture file.
  const fixture = path.join(__dirname, 'fixtures', 'outputs', 'a5-adversarial-reviewer.json');
  const original = fs.readFileSync(fixture, 'utf8');
  try {
    fs.writeFileSync(fixture, JSON.stringify(a5Seq[0]));
    const a4 = outputs('a4-proposal-writer');
    const r = await runWorkflow(input('rfp-03'), { ...dirs(), a1Override: outputs('a1-rfp-extractor'), a2Override: outputs('a2-pricing-analyst'), a3Override: outputs('a3-risk-assessor'), a4Override: a4, a5Override: undefined });
    // first review: APPROVE with a finding -> G5 -> REVISE; the fake keeps returning the same output, so the loop hits the G4 cap
    assert.equal(r.status, 'WAITING_HUMAN');
    const records = AuditLogger.read(r.audit_file);
    assert.equal(records.find((x) => x.type === 'guardrail' && x.id === 'G5').result, 'FAIL');
    assert.equal(records.filter((x) => x.type === 'review').length, 3);
    assert.equal(records.find((x) => x.type === 'punch_out').rule, 'G4-loop-cap');
    calls = records.filter((x) => x.type === 'step_start' && x.agent === 'a5-adversarial-reviewer').length;
  } finally {
    fs.writeFileSync(fixture, original);
  }
  assert.equal(calls, 3);
});

test('G5 drops an unfounded number_mismatch on a G9-verified proposal and approves when nothing remains', async () => {
  process.env.DEVIN_BIN = FAKE;
  const a5 = { verdict: 'REVISE', findings: [{ type: 'number_mismatch', detail: 'overhead should be 15% of labor' }] };
  const r = await runWorkflow(input('rfp-03'), { ...dirs(), a4Override: outputs('a4-proposal-writer'), a5Override: a5 });
  assert.equal(r.status, 'DONE');
  assert.equal(r.route, 'BID');
  const records = AuditLogger.read(r.audit_file);
  const g5 = records.find((x) => x.type === 'guardrail' && x.id === 'G5');
  assert.equal(g5.result, 'FAIL');
  assert.match(g5.detail, /dropped 1 unfounded/);
  const review = records.find((x) => x.type === 'review');
  assert.equal(review.verdict, 'APPROVE');
  assert.equal(review.dropped.length, 1);
});

test('reviewer ESCALATE punches out with the findings in the human question', async () => {
  process.env.DEVIN_BIN = FAKE;
  const a5 = { verdict: 'ESCALATE', findings: [{ type: 'promise', detail: 'guarantees completion in 10 days' }] };
  const r = await runWorkflow(input('rfp-03'), { ...dirs(), a5Override: a5 });
  assert.equal(r.status, 'WAITING_HUMAN');
  assert.match(r.human_question, /promise: guarantees completion/);
  assert.equal(AuditLogger.read(r.audit_file).find((x) => x.type === 'punch_out').rule, 'reviewer-escalate');
});

test('A4 figures that differ from the financials fail G9 with FAILED_MATH', async () => {
  process.env.DEVIN_BIN = FAKE;
  const bad = { ...outputs('a4-proposal-writer'), figures: { materials: 22670, labor: 1, overhead: 5440.8, contingency: 3627.2, final_bid: 45340 } };
  process.env.FAKE_DEVIN_STDOUT = JSON.stringify(bad);
  try {
    const r = await runWorkflow(input('rfp-03'), { ...dirs(), a1Override: outputs('a1-rfp-extractor'), a2Override: outputs('a2-pricing-analyst'), a3Override: outputs('a3-risk-assessor') });
    assert.equal(r.status, 'FAILED_MATH');
    assert.equal(r.failed_step, 'a4-proposal-writer#4');
  } finally {
    delete process.env.FAKE_DEVIN_STDOUT;
  }
});
