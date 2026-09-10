## wf-v1

| Metric | Value |
| --- | --- |
| Runs (denominator, nothing excluded) | 12 |
| Success (terminal route matches the manifest) | 6 / 12 = 50.0% |
| By status | DONE 9, WAITING_HUMAN 2, FAILED_MATH 1 |
| By route | ESTIMATE 1, NEEDS_INFO 4, PUNCH_OUT 2, BID 3, DECLINED 1 |
| Mean cost per run (USD) | 0.0324 |
| Total prompt tokens | 901556 |
| Mean duration (s) | 58.3 |

Final bid spread per RFP: rfp-02: 178256 to 178256 (n=1); rfp-04: 28421.7 to 28421.7 (n=1); rfp-10: 275945.28 to 275945.28 (n=1)

Punch-out: expected and got 3, unexpected 1, missed 1, correctly not punched 6, failed runs (counted apart) 1; precision 75.0%, recall 75.0%

Unexpected outcomes:
- wf-20260910T072354Z-e30fb1 rfp-03: expected ESTIMATE, got DONE/ESTIMATE
- wf-20260910T072530Z-da1d46 rfp-07: expected PUNCH_OUT, got DONE/NEEDS_INFO
- wf-20260910T075537Z-78e869 rfp-02: expected ESTIMATE, got DONE/NEEDS_INFO
- wf-20260910T075557Z-7b21ac rfp-04: expected ESTIMATE, got DONE/NEEDS_INFO
- wf-20260910T075707Z-320ba5 rfp-02: expected ESTIMATE, got FAILED_MATH/null
- wf-20260910T080054Z-80eaef rfp-02: expected ESTIMATE, got WAITING_HUMAN/PUNCH_OUT

