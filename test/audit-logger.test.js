const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { AuditLogger } = require('../harness/audit-logger');

test('AuditLogger appends one JSON line per event with ts, seq, run_id, type', () => {
  const logDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-'));
  const log = new AuditLogger({ runId: 'wf-test-1', logDir });
  log.event('run_start', { workflow_version: 'wf-v0' });
  log.event('step_result', { step_id: 'a1#1', prompt_tokens: 10 });
  const records = AuditLogger.read(log.file);
  assert.equal(records.length, 2);
  assert.equal(records[0].type, 'run_start');
  assert.equal(records[0].seq, 1);
  assert.equal(records[1].seq, 2);
  assert.equal(records[1].run_id, 'wf-test-1');
  assert.equal(records[1].prompt_tokens, 10);
  assert.match(records[0].ts, /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(path.basename(log.file), 'wf-test-1.jsonl');
});
