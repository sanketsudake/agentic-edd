const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { AuditLogger } = require('./audit-logger');

function newRunId() {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  return `wf-${stamp}-${crypto.randomBytes(3).toString('hex')}`;
}

function createRun({ runsDir = 'runs', logDir = path.join('logs', 'audit'), workflowVersion = 'wf-v1', runId = newRunId() } = {}) {
  const dir = path.join(runsDir, runId);
  const workDir = path.join(dir, 'work');
  fs.mkdirSync(workDir, { recursive: true });
  fs.mkdirSync(path.join(dir, 'exports'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'outputs'), { recursive: true });
  let step = 0;
  return {
    id: runId,
    dir,
    workDir,
    workflowVersion,
    audit: new AuditLogger({ runId, logDir }),
    totals: { prompt_tokens: 0, completion_tokens: 0, cached_tokens: 0, cost_usd: 0 },
    nextStep() { step += 1; return step; },
  };
}

// Reopens an existing run for resume: same id, same audit file, step counter and totals restored from the log.
function openRun({ runId, runsDir = 'runs', logDir = path.join('logs', 'audit'), workflowVersion = 'wf-v1' }) {
  const run = createRun({ runsDir, logDir, workflowVersion, runId });
  const records = AuditLogger.read(run.audit.file);
  run.audit.seq = records.length ? records[records.length - 1].seq : 0;
  let step = 0;
  for (const r of records) {
    if (r.type === 'step_start') step = Math.max(step, Number(String(r.step_id).split('#')[1]));
    if (r.type === 'step_result') {
      run.totals.prompt_tokens += r.prompt_tokens || 0;
      run.totals.completion_tokens += r.completion_tokens || 0;
      run.totals.cached_tokens += r.cached_tokens || 0;
      run.totals.cost_usd = Number((run.totals.cost_usd + (r.cost_usd || 0)).toFixed(6));
    }
  }
  run.nextStep = () => { step += 1; return step; };
  return run;
}

module.exports = { createRun, openRun, newRunId };
