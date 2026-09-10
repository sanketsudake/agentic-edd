#!/usr/bin/env bash
# Usage: scripts/eval-agent.sh <agent-dir-name> <prompt-version>
# Example: scripts/eval-agent.sh a2-pricing-analyst v1
# Writes results-<version>.html (the report) and results-<version>.json (for scripts/eval-summary.js).
set -euo pipefail
agent_dir="agents/$1"
version="$2"
cd "$(dirname "$0")/../$agent_dir"
npx promptfoo eval --no-cache --no-progress-bar -c promptfooconfig.yaml -p "prompts/$version.md" -o "results-$version.html" -o "results-$version.json"
