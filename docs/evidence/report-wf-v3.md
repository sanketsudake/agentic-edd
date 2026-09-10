## wf-v3

| Metric | Value |
| --- | --- |
| Runs (denominator, nothing excluded) | 48 |
| Success (terminal route matches the manifest) | 47 / 48 = 97.9% |
| By status | DONE 27, WAITING_HUMAN 21 |
| By route | BID 19, NEEDS_INFO 4, PUNCH_OUT 21, NO_BID 4 |
| Mean cost per run (USD) | 0.0483 |
| Total prompt tokens | 3424769 |
| Mean duration (s) | 50.1 |

Final bid spread per RFP: rfp-01: 46705.52 to 65611.56 (n=4); rfp-03: 36394 to 44385 (n=3); rfp-04: 26952.7 to 30831 (n=4); rfp-02: 178256 to 185112 (n=4); rfp-12: 4760 to 4760 (n=4)

Punch-out: expected and got 20, unexpected 1, missed 0, correctly not punched 27, failed runs (counted apart) 0; precision 95.2%, recall 100.0%

Unexpected outcomes:
- wf-20260910T113042Z-f463c2 rfp-03: expected ESTIMATE, got WAITING_HUMAN/PUNCH_OUT

