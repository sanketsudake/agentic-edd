#!/usr/bin/env bash
# Validates every agent's promptfoo config without calling a model.
set -euo pipefail
cd "$(dirname "$0")/.."
for d in agents/*/; do
  echo "== $d"
  (cd "$d" && npx promptfoo validate -c promptfooconfig.yaml)
done
