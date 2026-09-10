const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { runDevin } = require('./devin-client');
const { render } = require('./template');
const { extractJson } = require('./json-extract');
const { validate } = require('./schema-check');
const { costUsd } = require('./pricing');

const sha256 = (data) => crypto.createHash('sha256').update(data).digest('hex');

// Runs one agent: render, call Devin, parse, G1 schema check, optional check(), retry, audit.
// agent = { id, promptFile, promptVersion, schema, model, check?, override? }
async function runAgent({ agent, vars, run, parents = [], attemptMax = 3 }) {
  const template = fs.readFileSync(agent.promptFile, 'utf8');
  const prompt = render(template, vars);
  const stepId = `${agent.id}#${run.nextStep()}`;
  const fileStem = stepId.replace('#', '-');
  const base = { step_id: stepId, agent: agent.id, prompt_version: agent.promptVersion, parent_step_ids: parents, engine: 'devin', model: agent.model };

  if (agent.override) {
    run.audit.event('step_start', { ...base, prompt_sha256: sha256(prompt), prompt_chars: prompt.length, override: true });
    run.audit.event('step_result', { ...base, attempt: 1, model_name: 'override', prompt_tokens: 0, completion_tokens: 0, cached_tokens: 0, cost_usd: 0, price_table_date: null, duration_ms: 0, status: 'OK', problem: null, output_sha256: sha256(JSON.stringify(agent.override)), output_path: null, export_path: null });
    run.audit.event('guardrail', { id: 'G1', step_id: stepId, attempt: 1, result: 'PASS', detail: null });
    return { stepId, output: agent.override };
  }

  run.audit.event('step_start', { ...base, prompt_sha256: sha256(prompt), prompt_chars: prompt.length });

  let lastError;
  for (let attempt = 1; attempt <= attemptMax; attempt += 1) {
    const exportPath = path.join(run.dir, 'exports', `${fileStem}-a${attempt}.json`);
    let res;
    try {
      res = await runDevin({ prompt, model: agent.model, exportPath, cwd: run.workDir, env: { WF_AGENT: agent.id } });
    } catch (err) {
      run.audit.event('step_error', { ...base, attempt, error: err.message });
      lastError = err;
      continue;
    }

    let output;
    let problem = null;
    try {
      output = extractJson(res.text);
      const v = validate(agent.schema, output);
      if (!v.ok) problem = `schema: ${v.errors.join('; ')}`;
      if (!problem && agent.check) {
        const c = agent.check(output);
        if (c) problem = `check: ${c}`;
      }
    } catch (err) {
      problem = `parse: ${err.message}`;
    }

    const outputPath = path.join(run.dir, 'outputs', `${fileStem}-a${attempt}.json`);
    const outputText = problem ? res.text : JSON.stringify(output, null, 2);
    fs.writeFileSync(outputPath, outputText);

    const cost = costUsd(res.metrics);
    run.totals.prompt_tokens += res.metrics.prompt_tokens;
    run.totals.completion_tokens += res.metrics.completion_tokens;
    run.totals.cached_tokens += res.metrics.cached_tokens;
    run.totals.cost_usd = Number((run.totals.cost_usd + cost.cost_usd).toFixed(6));

    run.audit.event('step_result', {
      ...base, attempt, ...res.metrics, ...cost, duration_ms: res.duration_ms,
      status: problem ? 'RETRY' : 'OK', problem,
      output_sha256: sha256(outputText), output_path: path.relative(process.cwd(), outputPath),
      export_path: path.relative(process.cwd(), exportPath),
    });
    run.audit.event('guardrail', { id: 'G1', step_id: stepId, attempt, result: problem ? 'FAIL' : 'PASS', detail: problem });

    if (!problem) return { stepId, output };
    lastError = new Error(problem);
  }

  const e = new Error(`agent ${agent.id} failed after ${attemptMax} attempts: ${lastError.message}`);
  const m = lastError.message;
  e.code = lastError.code === 'DEVIN_EXIT' ? 'FAILED_CLI'
    : /^check: math:/.test(m) ? 'FAILED_MATH'
      : /^check:/.test(m) ? 'FAILED_GROUNDING'
        : 'FAILED_SCHEMA';
  e.stepId = stepId;
  throw e;
}

module.exports = { runAgent };
