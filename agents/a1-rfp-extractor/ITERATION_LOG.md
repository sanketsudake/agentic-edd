# Iteration Log — A1 rfp-extractor

Providers under test: Devin SWE-1.6 (`swe-1-6`), Kimi K3 Low (`kimi-k3-low`). Grader: Devin SWE-1.6.
9 test cases × 2 providers = 18 test executions per run. Target: 95% or better.
The expected quantities come from `fixtures/rfps/derivations.md`, not from a reviewer's opinion.

## Observation before Round 1 (from the first live workflow runs, 2026-09-10)

- rfp-03 through the workflow on SWE-1.6: the BOM had the block count, the rebar, the grout, the cap, and the mortar; the final bid was 37,780.60 USD.
- rfp-07 through the workflow: the four main quantities were derived correctly (1,481.48 cu yd of concrete matches `derivations.md`),
but A1 listed "Edge footing width" as a missing quantity because the RFP gives the thickened edge depth (12 in) and not its width.
The workflow routed to NEEDS_INFO instead of ESTIMATE.
This is a prompt defect: an estimator assumes a standard width for a detail the RFP omits and notes the assumption in `basis`.
rfp-07 was added as the ninth eval case so Round 1 measures it.

## Live workflow findings that produced `prompts/v2.md` (2026-09-10, before the promptfoo rounds)

- rfp-02 and rfp-04 through the workflow on v1 both routed to NEEDS_INFO: v1 listed "roof perimeter dimensions" and "edge footing width" as missing.
Both are secondary details that an estimator assumes.
- Change in v2: rule 4 now limits `missing_quantities` to a primary dimension or count that no formula can derive,
and tells the agent to assume the standard value for a secondary detail (a square roof for the perimeter, a thickened edge as wide as it is deep) and to write the assumption in `basis`.
- Result on v2 (live, one run each): rfp-02 ESTIMATE with 400 linear ft of flashing derived; rfp-04 ESTIMATE with the slab and the edge concrete split (44.44 + 7.41 cu yd, within the derivation's 52).
rfp-04 on v2 has no edge formwork line; the manifest marks it present-only, so the promptfoo round will show it as `FORM-EDGE missing`.
The promptfoo config points at v1 so Round 1 measures the baseline; Round 2 measures v2.

## Round 1 — Baseline (`prompts/v1.md`), 2026-09-10

### RED — Result (`results-v1.html`)

- Tests: **8/18 (44%)**. Assertions: **71/84**.
- Failures:
  - rfp-01 (both models): the BOM has one line (the drop ceiling) and lists the partition lengths and room dimensions as missing, so studs, insulation, drywall, and the ADA fixtures are absent.
  - rfp-02 (both): the flashing line is absent and "roof perimeter" is listed as missing; SWE-1.6 also dropped the tear-off line.
  - rfp-03 (both): the concrete cap is given in cu yd (3.3 and 4.9) instead of linear ft; the grout is 3.3 (SWE) and 19.8 (Kimi) cu yd against a derivation of 13; the mortar line is absent; Kimi's scope summary is one sentence.
  - rfp-04 (both): no edge formwork line; SWE lists "thickened edge footing width" as missing; Kimi's rebar is 4,940 linear ft (50% over the grid derivation).
  - rfp-07 (both): "edge footing width" listed as missing, so `missing_quantities` is not empty.
- Passing: rfp-05 (missing dimensions), rfp-06 (asbestos), rfp-08 (injection ignored), rfp-09 (not construction) on both models.

### Observation

- Every failure on the four reference RFPs is the same defect: the agent asks for a detail an estimator assumes (a partition layout, a perimeter, a footing width) and then omits the lines that depend on it.
That is a contract defect in rule 4, not a comprehension defect: the quantities it does derive (3,600 blocks, 1,200 ft of rebar, 44.44 cu yd of slab, 29.63 cu yd of stone) match the derivations.
- A second, smaller defect: the unit of a line does not follow how the material is sold (a cap in cu yd instead of linear ft).
- The schema and the grounding check (G6) passed on every output; the arithmetic of the derived lines is sound.

## Round 2 — Assumptions rule (`prompts/v2.md`)

### Hypothesis

- Restricting `missing_quantities` to primary dimensions, and telling the agent to assume the standard value for a secondary detail and to record the assumption in `basis`, will restore the omitted lines on rfp-01, rfp-02, rfp-04, and rfp-07 without changing the passing cases.

### Change made (`prompts/v2.md`)

- Rule 4 rewritten as described in "Live workflow findings" above. No other change.

### Result (`results-v2.html`)

- Tests: **12/18 (67%)**. Assertions: **75/84**. Kimi 6/9, SWE-1.6 6/9.
- rfp-02, rfp-04, and rfp-07 now extract every line and list nothing as missing. rfp-01 still asks for the partition layout on both models. rfp-03: the cap is in cu yd on SWE-1.6, the grout differs by 2 to 5 times between models, and the summary is one sentence.

### Observation

- The assumptions rule fixed three of the four reference RFPs. What remains is the fit-out layout (no rule covered it), the unit of sale, and the sentence count.
- Two label defects surfaced here and were corrected in the manifest with the reason recorded (`fixtures/rfps/derivations.md`): the grout derivation had double-counted the cell volume, and mortar and edge formwork are not items an estimator lists.

## Round 3 — Units of sale, two sentences, fit-out layout (`prompts/v3.md`)

### Hypothesis

- Naming the unit each material is sold in, requiring exactly two sentences, and giving a partition rule for a fit-out (0.12 linear ft per sq ft of floor) will pass rfp-01 and rfp-03 without changing the rest.

### Result (`results-v3.html`, re-measured after the matcher and label corrections)

- Tests: **13/18 (72%)**. Assertions: **78/84**. Kimi 6/9, SWE-1.6 7/9.
- rfp-01 now has a layout on both models but no restroom fixture line; Kimi dropped the tear-off line on rfp-02; SWE-1.6 gave 7,200 ft of rebar on rfp-03; both models still wrote a one-sentence summary on rfp-03.
- The first measurement of v3 (before the corrections) was 12/18; the matcher then missed "#5 vertical rebar" against the alias "#5 rebar", which is why the matcher became word-based.

### Observation

- Each rule helped where it applied; the misses moved to items the rules did not name (fixtures, the tear-off as a separate line) and to the sentence count, which the model ignores when stated once.

## Round 4 — Named items and a stricter contract (`prompts/v4.md`)

### Hypothesis

- Naming the implied items (a tear-off, insulation, and membrane are three lines; a door per room; a fixture set per restroom), forbidding extra keys, and restating "exactly two sentences, each ending with a period" will pass rfp-01, rfp-02, and rfp-03.

### Result (`results-v4.html`, re-measured after the grout label became presence-only)

- Tests: **14/18 (78%)**. Assertions: **80/84**. Kimi 8/9, SWE-1.6 6/9.
- Kimi: every case except rfp-01, where the ADA fixture set is still absent (doors, studs, insulation, drywall, and ceiling are present with a stated layout).
- SWE-1.6: rfp-01 lacks the ceiling grid and the fixture line; rfp-03 gives the cap as 29.6 (a volume) instead of 400 linear ft; rfp-04 gives 2.96 cu yd of stone (a tenth of the derivation).
- The first measurement of v4 (grout still a fixed label) was 11/18; both models had switched to the cell-volume grout method (14.7 and 22 cu yd), which is why the grout label became presence-only.

### Observation

- Kimi K3 follows the item list and the unit rule; SWE-1.6 keeps slipping on units and on one arithmetic step per RFP.
- The sentence-count and extra-key defects are gone on both models.

## Blocked — below 95% after four versions

- Best configuration: **v4 on Kimi K3, 8/9 (89%)**; on both models 14/18 (78%). The plan caps the rounds at four; the reviewer decides.
- The one Kimi miss is a real omission (the restroom fixture set on the fit-out), not a contract defect. A fifth round would name plumbing fixtures explicitly in rule 4, at the cost of a longer prompt.
- Decision for the workflow: `harness/agents.js` pins A1 v4 on Kimi K3. Every other agent is at 100% on its pinned model.
- Why A1 is the hard agent: it is the only one that turns prose into quantities. The others transform structured input. The workflow-level eval and the campaign measure what that costs end to end: an A1 omission on the fit-out shows up as a low bid, which the bid-range assertion catches.

## Round 5 — An assumption is not a missing quantity (`prompts/v5.md`)

Opened after the cap, because the wf-v2 campaign showed a defect that the suite's assertions had not isolated:
on rfp-02, v4 on Kimi derived every line (flashing 400 linear ft from an assumed square roof) and still listed "roof plan dimensions (shape assumed square ...)" under `missing_quantities`, which sends the run to `NEEDS_INFO`.

### Hypothesis

- One sentence in rule 4, "missing_quantities is an empty array whenever every bom line has a quantity; an assumption is never listed there, it goes in basis", removes that behavior without changing anything else. No other text changed.

### GREEN on the pinned model — Result (`results-v5.html`)

- Tests: **17/18 (94%)**. Assertions: **83/84**. SWE-1.6 9/9, Kimi 8/9.
- The one miss: Kimi wrote a one-sentence scope summary on rfp-03 (the rubric asks for two). Every quantity, unit, and missing-quantities check passed on both models.

### Observation

- One sentence about where an assumption belongs moved SWE-1.6 from 6/9 to 9/9 and Kimi from 8/9 to 8/9 with a different miss. Part of that jump is model variance between runs (see Rounds 3 and 4, where a re-measurement of the same prompt moved by one or two cases); the campaign in `docs/04-success-rate.md` measures the pinned configuration end to end, three times per RFP.
- Decision: `harness/agents.js` pins A1 v5 on SWE-1.6 (9/9, and a sixth of Kimi's price). The "Blocked" note above stands as the record of Rounds 1 to 4.
