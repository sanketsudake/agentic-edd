# Bid Pipeline

Turns a construction request for proposal (RFP) into a priced, reviewed bid proposal.
Five small AI agents do the judgment. Plain code does the math, the routing, and the safety checks.

## What it does

```
RFP text
  → A1 reads it and lists the materials (bill of materials)
  → A2 prices the materials from a price book   ┐ run at the same time
  → A3 rates the risk and picks a contingency   ┘
  → code computes labor, overhead, contingency, final bid
  → A4 writes the client proposal
  → A5 attacks the proposal (wrong numbers, invented scope, empty promises)
  → proposal.md
```

Four ways a run can end:

| End | When |
| --- | --- |
| `BID` | Proposal written and approved by the reviewer |
| `NEEDS_INFO` | The RFP lacks a size or a count; a reply asks for it |
| `NO_BID` | Not construction work; a polite decline |
| `PUNCH_OUT` | A human must decide: hazardous material, legal clause, unknown material, bid above 250,000 USD, or the reviewer escalated. The run pauses and resumes after the human edits a checkpoint file |

## Results

| What | Result |
| --- | --- |
| Each agent tested alone (promptfoo) | A2, A3, A4 at 100%. A1 and A5 at 94% on both models, 100% on the model each one uses |
| Whole pipeline, 12 RFPs | 12/12 |
| Campaign, 48 runs | 47/48 matched the expected outcome (97.9%). 0 crashes |
| Punch-out | Every run that had to stop for a human did (recall 100%) |
| Cost | About 0.05 USD per run |

## Try it

```bash
npm install
npm test                                 # 69 unit tests, no model calls
npm run run -- --rfp rfp-03              # one run on a sample RFP
npm run trace -- <run_id>                # what each agent did, tokens, cost
node harness/resume.js <run_id>          # continue a paused run after editing runs/<run_id>/checkpoint.json
node harness/report.js                   # success rate over every run
npm run eval -- a2-pricing-analyst v1    # test one agent prompt (model calls)
```

Model calls go through the Devin CLI. Every call's tokens and cost land in `logs/audit/<run_id>.jsonl`.

## Where things are

| Folder | What is inside |
| --- | --- |
| `agents/` | One folder per agent: prompt versions, tests, results, and a log of what changed and why |
| `harness/` | The pipeline: order of agents, math, routing, checkpoints, audit log |
| `guardrails/` | Redaction, hard-stop phrases, grounding checks |
| `fixtures/` | The price book, 12 sample RFPs, and the expected answer for each |
| `schemas/` | The JSON shape every agent must return |
| `workflow/` | The test of the whole pipeline |
| `docs/` | One page per topic, plus the evidence (audit logs, traces, proposals) |

Read next: `DESIGN.md` (why it is built this way), then `docs/`.
