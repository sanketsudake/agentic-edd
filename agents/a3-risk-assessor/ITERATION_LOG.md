# A3 risk-assessor — change log

Two models under test (Devin SWE-1.6, Kimi K3 Low), one grader (SWE-1.6). 8 scopes × 2 models = 16 tests per round. Target 95%.

| Round | Change | Result | What we learned |
| --- | --- | --- | --- |
| v1 | The original risk prompt without the arithmetic (code does that) | 12/16 (75%) | Flags were right everywhere it mattered (asbestos, liquidated damages, weekends, missing sizes). Misses: paraphrased evidence, an omitted empty `flags` key, a rate above 10% on a plain repair |
| v2 | Evidence must be an exact quote; all four keys always; a rate table (10% when nothing above low) | 16/16 (100%) | Three contract fixes, no change to the judgments |

Pinned: v2 on SWE-1.6.
