const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { runWorkflow } = require('../harness/dag');
const { loadRfp } = require('../harness/fixtures');
const { formatTrace } = require('../harness/trace');

const FAKE = path.join(__dirname, 'fixtures', 'fake-devin.js');

test('formatTrace lists steps, guardrails, the branch, the financials, the gates, and totals', async () => {
  process.env.DEVIN_BIN = FAKE;
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'trace-'));
  const r = loadRfp('rfp-03');
  const res = await runWorkflow(
    { id: r.id, client: r.client, rfp_text: r.rfp_text },
    { runsDir: path.join(base, 'runs'), logDir: path.join(base, 'logs') },
  );
  const text = formatTrace(res.audit_file);
  assert.match(text, /a1-rfp-extractor#1 .*OK .*prompt=1000 .*cached=400/);
  assert.match(text, /a3-risk-assessor#3 .*parents=a1-rfp-extractor#1/);
  assert.match(text, /G3 PASS/);
  assert.match(text, /BRANCH ESTIMATE \(default\)/);
  assert.match(
    text,
    /FINANCIALS materials=22670 labor=13602 overhead=5440.8 contingency=3627.2 final_bid=45340/,
  );
  assert.match(text, /GATE bid-threshold PASS/);
  assert.match(text, /REVIEW round=1 APPROVE/);
  assert.match(text, /TOTAL .*prompt=5000 .*cost_usd=/);
  assert.match(text, /status=DONE route=BID/);
});
