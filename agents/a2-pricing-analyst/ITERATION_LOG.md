# A2 pricing-analyst — change log

Two models under test (Devin SWE-1.6, Kimi K3 Low), one grader (SWE-1.6). 6 BOMs × 2 models = 12 tests per round. Target 95%.

| Round | Change | Result | What we learned |
| --- | --- | --- | --- |
| v1 | The original pricing prompt, with the price book as the only source of prices and line totals before the sum | 12/12 (100%) | Every SKU right, every total within a cent (22,670; 85,700; 14,715), a sheet-to-sq-ft conversion written out, copper items left unpriced as they should be |

Pinned: v1 on SWE-1.6.

Note: the arithmetic assertion is guardrail G9, the same check the pipeline runs on every live call. In 48 campaign runs it never had to retry A2 for a sum.
