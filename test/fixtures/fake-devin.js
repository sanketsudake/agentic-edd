#!/usr/bin/env node
// Stand-in for the devin binary. Same argument shape, no network.
const fs = require('node:fs');
const path = require('node:path');

const args = process.argv.slice(2);
const flag = (name) => args[args.indexOf(name) + 1];
const exportPath = flag('--export');

if (process.env.FAKE_DEVIN_EXIT === '1') {
  process.stderr.write('fake devin failure\n');
  process.exit(1);
}

fs.mkdirSync(path.dirname(exportPath), { recursive: true });
fs.writeFileSync(
  exportPath,
  JSON.stringify({
    schema_version: 'ATIF-v1.7',
    agent: { name: 'devin', model_name: 'Claude Haiku 4.5' },
    steps: [
      { step_id: 1, source: 'user', message: flag('--') },
      {
        step_id: 2,
        source: 'agent',
        model_name: 'Claude Haiku 4.5',
        metrics: { prompt_tokens: 1000, completion_tokens: 50, cached_tokens: 400 },
      },
    ],
    final_metrics: {
      total_prompt_tokens: 1000,
      total_completion_tokens: 50,
      total_cached_tokens: 400,
      total_steps: 2,
    },
  }),
);

const attempt = Number((exportPath.match(/-a(\d+)\.json$/) || [])[1] || 1);
const bad = Number(process.env.FAKE_DEVIN_BAD_ATTEMPTS || 0);

let out;
if (attempt <= bad) out = 'not json';
else if (process.env.FAKE_DEVIN_STDOUT !== undefined) out = process.env.FAKE_DEVIN_STDOUT;
else if (process.env.WF_AGENT)
  out = fs.readFileSync(path.join(__dirname, 'outputs', `${process.env.WF_AGENT}.json`), 'utf8');
else out = 'OK';
process.stdout.write(out);
