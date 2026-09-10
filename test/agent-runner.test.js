const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createRun } = require('../harness/run-context');
const { runAgent } = require('../harness/agent-runner');
const { AuditLogger } = require('../harness/audit-logger');

const FAKE = path.join(__dirname, 'fixtures', 'fake-devin.js');

function tmpRun() {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'run-'));
  return createRun({ runsDir: path.join(base, 'runs'), logDir: path.join(base, 'logs'), workflowVersion: 'wf-test' });
}

function a1Agent() {
  const promptFile = path.join(os.tmpdir(), `a1-prompt-${process.pid}.md`);
  fs.writeFileSync(promptFile, 'Extract: <rfp>{{ rfp }}</rfp>');
  return { id: 'a1-rfp-extractor', promptFile, promptVersion: 'v1', schema: 'a1-extraction', model: 'swe-1-6' };
}

test('runAgent renders, calls devin, validates, and logs one step_result with cost', async () => {
  process.env.DEVIN_BIN = FAKE;
  const run = tmpRun();
  const r = await runAgent({ agent: a1Agent(), vars: { rfp: 'Build a 400 ft wall' }, run });
  assert.equal(r.stepId, 'a1-rfp-extractor#1');
  assert.equal(r.output.bom[0].quantity, 3600);
  const records = AuditLogger.read(run.audit.file);
  const result = records.find((x) => x.type === 'step_result');
  assert.equal(result.status, 'OK');
  assert.equal(result.prompt_tokens, 1000);
  assert.equal(result.cached_tokens, 400);
  assert.equal(result.cost_usd, Number(((600 * 1.0 + 400 * 0.1 + 50 * 5.0) / 1e6).toFixed(6)));
  assert.equal(result.model, 'swe-1-6');
  assert.equal(result.model_name, 'Claude Haiku 4.5');
  assert.ok(fs.existsSync(path.join(run.dir, 'outputs', 'a1-rfp-extractor-1-a1.json')));
  assert.equal(run.totals.prompt_tokens, 1000);
  const g1 = records.find((x) => x.type === 'guardrail' && x.id === 'G1');
  assert.equal(g1.result, 'PASS');
});

test('runAgent retries a bad output and succeeds on the second attempt', async () => {
  process.env.DEVIN_BIN = FAKE;
  process.env.FAKE_DEVIN_BAD_ATTEMPTS = '1';
  try {
    const run = tmpRun();
    const r = await runAgent({ agent: a1Agent(), vars: { rfp: 'x' }, run });
    assert.equal(r.output.bom[0].quantity, 3600);
    const results = AuditLogger.read(run.audit.file).filter((x) => x.type === 'step_result');
    assert.deepEqual(results.map((x) => x.status), ['RETRY', 'OK']);
    assert.deepEqual(results.map((x) => x.attempt), [1, 2]);
  } finally {
    delete process.env.FAKE_DEVIN_BAD_ATTEMPTS;
  }
});

test('runAgent fails with FAILED_SCHEMA after three bad attempts', async () => {
  process.env.DEVIN_BIN = FAKE;
  process.env.FAKE_DEVIN_BAD_ATTEMPTS = '3';
  try {
    const run = tmpRun();
    await assert.rejects(runAgent({ agent: a1Agent(), vars: { rfp: 'x' }, run }), (e) => e.code === 'FAILED_SCHEMA');
  } finally {
    delete process.env.FAKE_DEVIN_BAD_ATTEMPTS;
  }
});

test('runAgent runs agent.check: FAILED_GROUNDING for a plain problem, FAILED_MATH for a math: problem', async () => {
  process.env.DEVIN_BIN = FAKE;
  const run = tmpRun();
  const agent = { ...a1Agent(), check: (o) => (o.is_construction ? 'construction not allowed' : null) };
  await assert.rejects(runAgent({ agent, vars: { rfp: 'x' }, run }), (e) => e.code === 'FAILED_GROUNDING');
  const results = AuditLogger.read(run.audit.file).filter((x) => x.type === 'step_result');
  assert.equal(results.length, 3);
  assert.match(results[0].problem, /^check: construction not allowed/);
  const run2 = tmpRun();
  const mathAgent = { ...a1Agent(), check: () => 'math: total off' };
  await assert.rejects(runAgent({ agent: mathAgent, vars: { rfp: 'x' }, run: run2 }), (e) => e.code === 'FAILED_MATH');
});

test('runAgent override skips devin and logs a zero-cost step', async () => {
  process.env.DEVIN_BIN = FAKE;
  const run = tmpRun();
  const r = await runAgent({ agent: { ...a1Agent(), override: { is_construction: false } }, vars: { rfp: 'x' }, run });
  assert.deepEqual(r.output, { is_construction: false });
  assert.equal(run.totals.cost_usd, 0);
});

test('runAgent fails with FAILED_CLI when devin exits non-zero', async () => {
  process.env.DEVIN_BIN = FAKE;
  process.env.FAKE_DEVIN_EXIT = '1';
  try {
    const run = tmpRun();
    await assert.rejects(runAgent({ agent: a1Agent(), vars: { rfp: 'x' }, run }), (e) => e.code === 'FAILED_CLI');
  } finally {
    delete process.env.FAKE_DEVIN_EXIT;
  }
});
