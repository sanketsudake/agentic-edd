const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { runDevin } = require('../harness/devin-client');

const FAKE = path.join(__dirname, 'fixtures', 'fake-devin.js');

test('runDevin returns stdout and metrics from the export', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'devin-'));
  const exportPath = path.join(dir, 'e-a1.json');
  const r = await runDevin({
    prompt: 'hi',
    model: 'swe-1-6',
    exportPath,
    bin: FAKE,
    env: { FAKE_DEVIN_STDOUT: '{"ok":true}' },
  });
  assert.equal(r.text, '{"ok":true}');
  assert.deepEqual(r.metrics, {
    model_name: 'Claude Haiku 4.5',
    prompt_tokens: 1000,
    completion_tokens: 50,
    cached_tokens: 400,
  });
  assert.equal(r.export_path, path.resolve(exportPath));
  assert.ok(r.duration_ms >= 0);
});

test('runDevin rejects with code DEVIN_EXIT on non-zero exit', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'devin-'));
  await assert.rejects(
    runDevin({
      prompt: 'hi',
      model: 'swe-1-6',
      exportPath: path.join(dir, 'e.json'),
      bin: FAKE,
      env: { FAKE_DEVIN_EXIT: '1' },
    }),
    (e) => e.code === 'DEVIN_EXIT' && /fake devin failure/.test(e.message),
  );
});
