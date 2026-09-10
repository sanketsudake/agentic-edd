# A4 proposal-writer — change log

Two models under test (Devin SWE-1.6, Kimi K3 Low), one grader (SWE-1.6). 7 inputs × 2 models = 14 tests per round (6 inputs in round 1). Target 95%.
Inputs are generated (`tests/make-inputs.js`), so every figure equals what the pipeline computes.

| Round | Change | Result | What we learned |
| --- | --- | --- | --- |
| v1 | The original proposal prompt, JSON output, copy the five figures | 12/12 (100%) on the suite | In the live pipeline v1 obeyed a reviewer finding that asked to change a figure and broke the numbers three times (G9 caught it). The suite lacked that case, so it was added |
| v2 | The five figures are final and verified; a finding that asks to change one is wrong | 14/14 (100%) | Figures held against the wrong finding on both models. The first run of v2 was 13/14 because the signature-line check did not accept "Accepted by: ____"; the check was widened and the run repeated |

Pinned: v2 on SWE-1.6.
