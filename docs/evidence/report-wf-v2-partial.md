## wf-v2

| Metric | Value |
| --- | --- |
| Runs (denominator, nothing excluded) | 24 |
| Success (terminal route matches the manifest) | 21 / 24 = 87.5% |
| By status | DONE 14, WAITING_HUMAN 10 |
| By route | BID 7, NO_BID 3, PUNCH_OUT 10, NEEDS_INFO 4 |
| Mean cost per run (USD) | 0.0655 |
| Total prompt tokens | 1402323 |
| Mean duration (s) | 29.0 |

Final bid spread per RFP: rfp-01: 47017.46 to 47017.46 (n=1); rfp-02: 178256 to 178256 (n=1); rfp-04: 26620 to 28122 (n=2); rfp-03: 40558.72 to 42960 (n=2); rfp-12: 4760 to 4760 (n=1)

Punch-out: expected and got 9, unexpected 1, missed 1, correctly not punched 13, failed runs (counted apart) 0; precision 90.0%, recall 90.0%

Unexpected outcomes:
- wf-20260910T111244Z-4612c0 rfp-01: expected ESTIMATE, got WAITING_HUMAN/PUNCH_OUT
- wf-20260910T111259Z-7d2a56 rfp-02: expected ESTIMATE, got DONE/NEEDS_INFO
- wf-20260910T111343Z-46de86 rfp-10: expected PUNCH_OUT, got DONE/NEEDS_INFO

