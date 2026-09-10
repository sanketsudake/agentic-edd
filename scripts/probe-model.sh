#!/usr/bin/env bash
# Usage: scripts/probe-model.sh <devin-model-id>
# Prints the model_name that Devin reports in its export, plus the token metrics.
set -euo pipefail
model="$1"
out="$(mktemp -d)/export.json"
devin -p --model "$model" --permission-mode auto --respect-workspace-trust false --config "$(dirname "$0")/../harness/devin-config.json" --export "$out" -- "Reply with the single word OK." >/dev/null
node -e '
const d = require(process.argv[1]);
const step = d.steps.find(s => s.source === "agent" && s.metrics);
console.log(JSON.stringify({ model_name: step.model_name, ...d.final_metrics }));
' "$out"
