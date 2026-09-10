#!/usr/bin/env bash
# Usage: scripts/campaign.sh <repeats>   (default 3)
# Runs every fixture RFP through the workflow <repeats> times, sequentially, and prints the report.
set -euo pipefail
cd "$(dirname "$0")/.."
repeats="${1:-3}"
ids=$(node -e 'console.log(require("./harness/fixtures").loadManifest().rfps.map(r => r.id).join(" "))')
for i in $(seq 1 "$repeats"); do
  for id in $ids; do
    printf '%s run %s: ' "$id" "$i"
    node harness/run.js --rfp "$id" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const r=JSON.parse(s.trim().split("\n").pop());console.log(r.run_id, r.status, r.route, r.financials?r.financials.final_bid:"", "$"+r.totals.cost_usd)})' || true
  done
done
node harness/report.js
