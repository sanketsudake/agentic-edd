const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

// Empty config keeps the user's global Devin config out of the prompt.
const DEVIN_CONFIG = path.join(__dirname, 'devin-config.json');

function readMetrics(exportPath) {
  const data = JSON.parse(fs.readFileSync(exportPath, 'utf8'));
  const agentStep = (data.steps || []).find((s) => s.source === 'agent' && s.model_name);
  const fm = data.final_metrics || {};
  return {
    model_name: (agentStep && agentStep.model_name) || (data.agent && data.agent.model_name) || 'unknown',
    prompt_tokens: fm.total_prompt_tokens || 0,
    completion_tokens: fm.total_completion_tokens || 0,
    cached_tokens: fm.total_cached_tokens || 0,
  };
}

function runDevin({ prompt, model, exportPath, cwd, env = {}, bin = process.env.DEVIN_BIN || 'devin' }) {
  // Devin resolves --export against its own cwd, so the path must be absolute.
  exportPath = path.resolve(exportPath);
  fs.mkdirSync(path.dirname(exportPath), { recursive: true });
  const args = ['-p', '--model', model, '--permission-mode', 'auto',
    '--respect-workspace-trust', 'false', '--config', DEVIN_CONFIG, '--export', exportPath, '--', prompt];
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { cwd, env: { ...process.env, ...env } });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { stderr += d; });
    child.on('error', (err) => { err.code = 'DEVIN_EXIT'; reject(err); });
    child.on('close', (code) => {
      const duration_ms = Date.now() - started;
      if (code !== 0) {
        const e = new Error(`devin exited ${code}: ${(stderr || stdout).trim()}`);
        e.code = 'DEVIN_EXIT';
        return reject(e);
      }
      resolve({ text: stdout.trim(), metrics: readMetrics(exportPath), export_path: exportPath, duration_ms });
    });
  });
}

module.exports = { runDevin, readMetrics };
