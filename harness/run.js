#!/usr/bin/env node
// Usage: node harness/run.js '{"id":"x","client":"Acme","rfp_text":"..."}'
//        node harness/run.js --rfp rfp-03
// Prints one JSON line. Exit 0 on DONE or WAITING_HUMAN, exit 2 on FAILED_*.
const { runWorkflow } = require('./dag');
const { loadRfp } = require('./fixtures');

function parseInput(argv) {
  if (argv[0] === '--rfp' && argv[1]) {
    const { id, client, rfp_text } = loadRfp(argv[1]);
    return { id, client, rfp_text };
  }
  if (!argv[0]) throw new Error("usage: node harness/run.js '<json>' | --rfp <id>");
  const input = JSON.parse(argv[0]);
  for (const k of ['client', 'rfp_text'])
    if (typeof input[k] !== 'string') throw new Error(`input.${k} must be a string`);
  return input;
}

let input;
try {
  input = parseInput(process.argv.slice(2));
} catch (err) {
  console.error(err.message);
  process.exit(1);
}

runWorkflow(input)
  .then((r) => {
    console.log(JSON.stringify(r));
    process.exit(r.status.startsWith('FAILED') ? 2 : 0);
  })
  .catch((err) => {
    console.error(err.stack || err.message);
    process.exit(2);
  });
