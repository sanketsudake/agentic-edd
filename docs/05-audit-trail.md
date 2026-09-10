# Audit trail

One JSONL file per run: `logs/audit/<run_id>.jsonl`.
Every line is one event with `ts`, `seq`, `run_id`, `type`, and the event's fields.
The same `run_id` names the run directory `runs/<run_id>/` that holds every prompt export, every raw output, the checkpoint, and the reply or the proposal.

## Event types

| Event | When | Fields that matter |
| --- | --- | --- |
| `run_start` | Once | `workflow_version`, `rfp_id`, `client`, `input_sha256`, `agents` (id@prompt version) |
| `step_start` | Before each agent call | `step_id`, `agent`, `prompt_version`, `parent_step_ids`, `model`, `prompt_sha256` |
| `step_result` | After each attempt | `step_id`, `attempt`, `status` (OK or RETRY), `model_name`, `prompt_tokens`, `completion_tokens`, `cached_tokens`, `cost_usd`, `price_table_date`, `duration_ms`, `output_sha256`, `output_path`, `export_path`, `problem` |
| `step_error` | A CLI failure | `step_id`, `attempt`, `error` |
| `guardrail` | Each check | `id` (G1 to G9), `step_id`, `result` (PASS, FAIL, ACCEPTED), `detail` |
| `branch` | After A1 | `route`, `rule`, `detail`, `after` |
| `financials` | After A2 and A3 | `inputs`, `materials`, `labor`, `overhead`, `contingency`, `final_bid`, `rates` |
| `gate` | Each gate | `gate`, `result`, `detail`, `accepted_by_human` |
| `review` | After A5 | `round`, `verdict`, `findings`, `dropped` |
| `punch_out` | Stop for a human | `step_id`, `rule`, `stage`, `human_question`, `checkpoint_path` |
| `human_decision` | On resume | `step_id`, `actor: human`, `action`, `note`, `edits`, and zero tokens and cost |
| `run_end` | Once per stop | `status`, `route`, `failed_step`, `final_bid`, and the run totals |

## Which prompt produced which output

`step_id` is `<agent id>#<n>`; `parent_step_ids` names the steps whose outputs went into the prompt.
A2 and A3 both name A1; A4 names A2 and A3 (or the previous A5 on a revise round); A5 names A4.
Every `step_result` carries the SHA-256 of the rendered prompt (in `step_start`) and of the output, plus the path of the raw output and of the Devin export.
`node harness/trace.js <run_id>` prints the lineage as one line per step.

## Tokens and cost

The three token counts come from the Devin CLI export of every call (`final_metrics.total_prompt_tokens`, `total_completion_tokens`, `total_cached_tokens`).
`prompt_tokens` includes the cached part; `cost_usd` prices the uncached part at the input rate, the cached part at the cached-input rate, and the completion at the output rate,
from `harness/prices.json` (copied from `devin models list`, dated).
The run total is the sum over every attempt, retries included.
Nothing is estimated and nothing is excluded:
a call that Devin makes with about 19,000 tokens of its own tool definitions is recorded at 19,000 tokens.

Example, one full run (rfp-04, `wf-20260910T080455Z-6d4ff7`):

| Step | Model | Prompt tokens | Cached | Completion | Cost (USD) |
| --- | --- | --- | --- | --- | --- |
| a1-rfp-extractor#1 | SWE-1.6 | 20,370 | 13,216 | 1,350 | 0.009595 |
| a3-risk-assessor#3 | SWE-1.6 | 20,368 | 13,312 | 594 | 0.007675 |
| a2-pricing-analyst#2 | SWE-1.6 | 22,525 | 13,312 | 929 | 0.009591 |
| a4-proposal-writer#4 | SWE-1.6 | 20,811 | 13,312 | 1,236 | 0.009502 |
| a5-adversarial-reviewer#5 | SWE-1.6 | 21,470 | 13,312 | 857 | 0.008884 |
| Total | | 105,544 | 66,464 | 4,966 | 0.045247 |

## Where to look

- `docs/evidence/audit/` — the audit logs of the campaign and of the runs cited in these documents.
- `docs/evidence/traces/` — the `trace.js` output of the cited runs.
- `harness/report.js` — the aggregate over every log (see `04-success-rate.md`).
