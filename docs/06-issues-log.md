# Issues log

Every problem met while building the workflow, what caused it, and what changed. Kept as evidence that the evals and the guardrails did their job.

| # | Date | Where | What happened | Cause | Change |
| --- | --- | --- | --- | --- | --- |
| 1 | 2026-09-09 | Devin CLI | A one-word reply costs about 20,000 prompt tokens | Devin sends its tool definitions on every call | Recorded as real spend; disclosed in `05-audit-trail.md` |
| 2 | 2026-09-10 | Devin CLI | The user's `~/.config/devin/AGENTS.md` (about 550 tokens) is injected into every prompt; an empty `--config` file does not remove it | Devin loads always-on rules from the home directory | Moved aside during the evals and the campaign; documented in the README |
| 3 | 2026-09-10 | Models | Kimi 2.7 from an earlier project no longer exists on the account | Provider catalogue changed | Kimi K3 Low replaces it; SWE-1.6 stays as the second model and the grader |
| 4 | 2026-09-10 | Harness | First live run failed `FAILED_CLI`: Devin could not write the export file | The export path was relative and Devin resolved it against its own working directory | `devin-client.js` resolves the path to absolute |
| 5 | 2026-09-10 | A1 v1, live | rfp-02, rfp-04, rfp-07 routed to `NEEDS_INFO` | The agent asked for details an estimator assumes (roof perimeter, footing width) | A1 v2, rule 4 (assumptions written in `basis`) |
| 6 | 2026-09-10 | A5 v1 and A4 v1, live | rfp-02 ended `FAILED_MATH` | The reviewer recomputed overhead from the rate and got it wrong; the writer obeyed the wrong finding three times | Rates removed from the agents' inputs; A4 v2 keeps verified figures; A5 v2 compares and never recomputes; new guardrail G5 drops unfounded number findings |
| 7 | 2026-09-10 | A5 v2, live | rfp-02 punched out on the G4 loop cap | The reviewer flagged the client's own "two weekends" requirement as a promise, twice | A5 v3, rule 4 (a stated requirement is not a promise) |
| 8 | 2026-09-10 | Evals | First baseline runs scored 11% and 0% | Two assertion bugs in the harness: promptfoo needs multi-line inline JavaScript, and file assertions must return a result object, not a string | `harness/eval-helpers.js` adapter; configs rewritten; the runs were repeated |
| 9 | 2026-09-10 | Labels | Both models derived about 3.3 cu yd of grout for rfp-03 against an expected 13 | The derivation double-counted the cell volume; a standard grout table gives 3.5 cu yd | `manifest.json` and `derivations.md` corrected, with the reason recorded |
| 10 | 2026-09-10 | Labels | Neither model itemized mortar (rfp-03) or edge formwork (rfp-04) | Estimators carry both inside other prices | The two present-only expectations removed, with the reason recorded |
| 11 | 2026-09-10 | A4 and A5 suites | Both passed at 100% on v1 while the live workflow failed | The suites lacked the failing cases (a wrong finding; a restated requirement) | One case added to each suite before Round 2 |
| 12 | 2026-09-10 | A3 v1, live | One invalid-JSON output on rfp-02 | Model formatting slip | G1 retried once; the second attempt passed; no change |
| 13 | 2026-09-10 | Workflow eval | The wf-v2 workflow eval failed two correct bids | The bid range ignored the present-only lines in the ceiling and the quantity tolerance in the floor | Range derivation rewritten (`derivations.md`, "Expected bid range") |
| 14 | 2026-09-10 | A1 v4, campaign | rfp-02 and rfp-10 routed to `NEEDS_INFO` although every quantity was derived | The agent listed an assumption under `missing_quantities` | A1 v5 (one sentence in rule 4); wf-v2 campaign stopped, wf-v3 campaign run in full |
| 15 | 2026-09-10 | A2 v1, campaign | One rfp-03 repeat punched out on an unpriced "smooth concrete cap" | The agent did not map the line to "smooth precast concrete wall cap" | No change: the gate stopped the run safely; a human prices the line in the checkpoint. A price book alias "concrete cap" exists; the miss is model variance |
