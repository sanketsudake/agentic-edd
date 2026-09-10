# Automated Bidding and Estimating Pipeline

A workflow of five evaluated prompts that reads a construction Request for Proposal (RFP), extracts the bill of materials,
prices it from a price book, assesses the risk, computes the financials, writes the client proposal, reviews it,
and hands the decision to a human when money, hazard, or contract terms require it.

The 60% / 15% / 10% formula is computed by the harness and every agent's numbers are verified against it,
and every agent returns JSON that a schema checks. An adversarial reviewer is the fifth agent.

## Where the evidence is

| Topic | Document | Code and data |
| --- | --- | --- |
| Workflow definition, handoffs, branching | `docs/01-workflow-definition.md` | `harness/dag.js`, `harness/branch-rules.js`, `schemas/`, `agents/*/` |
| Each prompt evaluated | `agents/*/ITERATION_LOG.md` | `agents/*/promptfooconfig.yaml`, `agents/*/results-v*.html` |
| The workflow as an evaluated prompt | `workflow/ITERATION_LOG.md` | `workflow/promptfooconfig.yaml`, `workflow/results.html` |
| Guardrails | `docs/02-guardrails.md` | `guardrails/`, `harness/financials.js`, `harness/agent-runner.js` |
| Punch-out to a human | `docs/03-punch-out.md` | `harness/resume.js`, `docs/evidence/` |
| Monitoring and success rate | `docs/04-success-rate.md` | `harness/report.js`, `docs/evidence/audit/` |
| Audit trail | `docs/05-audit-trail.md` | `logs/audit/*.jsonl` (samples in `docs/evidence/audit/`), `harness/trace.js` |
| Issues met on the way | `docs/06-issues-log.md` | |

## Commands

```bash
npm install
npm test                                   # 69 unit tests, no network (a fake Devin binary)
npm run validate                           # promptfoo config check for every agent, no network
npm run eval -- a2-pricing-analyst v1      # promptfoo eval of one agent prompt version (real Devin calls)
node scripts/eval-summary.js a2-pricing-analyst v1
npm run run -- --rfp rfp-03                # one workflow run on a fixture RFP
npm run run -- '{"id":"x","client":"Acme","rfp_text":"..."}'   # one run on any RFP
npm run trace -- <run_id>                  # audit trace of one run
node harness/resume.js <run_id>            # continue a WAITING_HUMAN run after editing runs/<run_id>/checkpoint.json
node harness/report.js                     # success rate, cost, and bid spread over every audit log
scripts/campaign.sh 3                      # every fixture RFP, three times
npx promptfoo eval -c workflow/promptfooconfig.yaml -o workflow/results.html   # the workflow-level eval
```

Engine: the Devin CLI in print mode, with `--export` for the token counts of every call.
Devin injects `~/.config/devin/AGENTS.md` into every call; it was moved aside during the evals and the campaign so the prompts are the only instruction.
The audit log counts every token Devin sends.

## Layout

- `agents/` — one folder per agent: prompt versions, promptfoo eval, assertion script, iteration log, result reports.
- `fixtures/` — the synthetic price book, the 12 RFPs, the manifest with the expected routes and quantities, and the derivation of every expected quantity.
- `harness/` — the workflow: DAG, agent runner, Devin client, financials, branch rules, gates, checkpoint and resume, audit log, trace, report.
- `guardrails/` — redaction (G2), hard rules (G3), grounding (G6). The others live in the harness modules named in `docs/02-guardrails.md`.
- `schemas/` — the JSON contract of every agent output.
- `workflow/` — the workflow-level promptfoo eval.
- `docs/` — the six topic pages, the issues log, and the evidence.
- `logs/audit/` and `runs/` — one JSONL audit file and one run directory per workflow run (git-ignored; samples under `docs/evidence/`).
