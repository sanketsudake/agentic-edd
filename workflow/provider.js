#!/usr/bin/env node
// promptfoo exec provider for the workflow-level eval. The prompt is a fixture RFP id (for example "rfp-03").
// The exec provider passes the prompt as a shell argument, so the id avoids quoting problems that raw JSON has.
const path = require('node:path');
process.chdir(path.join(__dirname, '..')); // promptfoo runs exec providers from the config folder; the harness writes runs/ and logs/ from the repo root
const { runWorkflow } = require('../harness/dag');
const { loadRfp } = require('../harness/fixtures');
const id = String(process.argv[2] || '').trim();
const { client, rfp_text } = loadRfp(id);
runWorkflow({ id, client, rfp_text }).then((r) => { console.log(JSON.stringify(r)); process.exit(0); })
  .catch((err) => { console.error(err.stack || err.message); process.exit(2); });
