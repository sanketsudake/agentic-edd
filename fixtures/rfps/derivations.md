# Expected quantities — derivations

Every `expected_bom` quantity in `manifest.json` comes from one of these formulas.
A quantity that the RFP states is copied; a derived one is computed here.
Tolerances cover the reasonable choices an estimator can make (waste, spacing, rounding).

## rfp-01 dental fit-out (2,500 sq ft)

- CLG-GRID 2,500 sq ft: "throughout the entire space" (stated area). Tolerance 10%.
- CLG-TILE 2,500 sq ft: same area. Tolerance 10%.
- ADA-RR 1: "one ADA-compliant restroom" (stated). Tolerance 0.
- MS-2X4, INS-SND, DW-58, DW-FIN: present, any quantity.
The partition lengths are not stated, so the quantity is an estimator's layout choice.

## rfp-02 flat roof (10,000 sq ft)

- RF-TEAR, RF-ISO3, RF-TPO60 10,000 sq ft each: stated roof area. Tolerance 5%.
- RF-DRAIN 4: stated. Tolerance 0.
- RF-FLASH: present, any quantity.
The perimeter is not stated (a 100 ft × 100 ft square gives 400 linear ft).

## rfp-03 masonry wall (400 linear ft × 8 ft)

- Wall area = 400 × 8 = 3,200 sq ft.
- CMU-8 = 3,200 sq ft × 1.125 blocks per sq ft (an 8×16 in face is 0.889 sq ft) = 3,600 each. Tolerance 15%.
- RB-5: 400 ft × 12 in / 32 in = 150 bars × 8 ft = 1,200 linear ft. Tolerance 30% (laps and dowels).
- GR-FILL: present, any quantity. Label correction 2026-09-10 (second): the table method gives 3.5 cu yd (0.11 cu yd per 100 sq ft at 32 in on center) and the cell-volume method gives 13 to 22 cu yd; across four prompt versions the two models returned 1.7, 2.4, 3.3, 7.2, 14.7, 19.8, and 22. A quantity that differs by ten times between two accepted methods is not a label; the check is that the grout line exists and A2 prices it.
  Label correction 2026-09-10: the first version of this line used 0.19 cu ft per cell course and gave 13 cu yd, which double-counted the cell volume; both models under test derived about 3.3 cu yd, and the table confirms them.
- CAP-CONC 400 linear ft: stated length. Tolerance 5%.
- MORTAR: not expected. Label correction 2026-09-10: estimators carry mortar inside the block unit price; neither model itemized it, and the price book line stays available to A2 when an agent does list it.

## rfp-04 concrete slab (40 ft × 60 ft × 6 in)

- Slab volume = 40 × 60 × 0.5 ft = 1,200 cu ft = 44.4 cu yd.
- Thickened edge = perimeter 200 ft × 1 ft × 1 ft (12 in deeper and 12 in wide) = 200 cu ft = 7.4 cu yd.
- CONC-3500 = 44.4 + 7.4 = 51.8 cu yd, rounded to 52. Tolerance 15%.
- RB-4 on an 18 in grid: (40 / 1.5 + 1) × 60 + (60 / 1.5 + 1) × 40 = 27.7 × 60 + 41 × 40 = 1,660 + 1,640 = 3,300 linear ft. Tolerance 25%.
- STONE-CR = 2,400 sq ft × (4 / 12) ft / 27 = 29.6 cu yd, rounded to 30. Tolerance 15%.
- VB-10 = 2,400 sq ft. Tolerance 10%.
- FORM-EDGE: not expected. Label correction 2026-09-10: edge forms are a reusable site item that estimators carry in labor, not in the material list.

## rfp-12 small repair

- RF-DRAIN 2, RF-FLASH 120 linear ft: stated. Tolerance 0.

## rfp-07 large slab (why it passes the threshold)

- CONC-3500 = 200 × 400 × 0.5 / 27 = 1,481 cu yd × 180 = 266,667 USD of concrete alone,
so the final bid is far above 250,000 USD.

## Expected bid range (`scripts/expected-financials.js`)

- Floor: the fixed quantities reduced by the 15% quantity tolerance, priced from the price book, at contingency 0.10.
- Ceiling: the fixed quantities at face value plus a reference quantity for every present-only line
(`reference_quantity` in the manifest: the fit-out layout from rule 4 of the A1 prompt gives 240 studs, 1,600 sq ft of sound insulation, 6,400 sq ft of drywall and of finish; the roof perimeter 400 linear ft; the grout 3.5 cu yd), at contingency 0.25, times 1.5 for an estimator's waste and layout choices.
- Range correction 2026-09-10: the first version ignored the present-only lines in the ceiling and the tolerance in the floor, so a correct fit-out bid (49,093) and a correct slab bid (28,122, 0.4% under a floor of 28,230) both fell outside it.
