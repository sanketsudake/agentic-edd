# Where the expected quantities come from

Every expected quantity in `manifest.json` is either copied from the RFP or computed here.
Tolerances allow for the choices an estimator makes (waste, spacing, rounding).

## rfp-01 dental fit-out, 2,500 sq ft

- Ceiling grid and tiles: 2,500 sq ft each ("throughout the entire space"). ±10%.
- ADA restroom fixture set: 1 (stated).
- Studs, sound insulation, drywall, finish: present, any quantity. The RFP gives no partition lengths.
  Reference for the bid range: 300 ft of partitions (0.12 ft per sq ft of floor), 10 ft high → 240 studs, 1,600 sq ft insulation, 6,400 sq ft drywall and finish.

## rfp-02 flat roof, 10,000 sq ft

- Tear-off, insulation board, membrane: 10,000 sq ft each. ±5%.
- Drains: 4 (stated).
- Edge flashing: present, any quantity. Reference: a 100 × 100 ft square gives 400 linear ft.

## rfp-03 masonry wall, 400 ft × 8 ft

- Wall area 3,200 sq ft. Blocks: 3,200 × 1.125 per sq ft = 3,600. ±15%.
- #5 rebar: 400 ft × 12 in / 32 in = 150 bars × 8 ft = 1,200 linear ft. ±30%.
- Cap: 400 linear ft (stated). ±5%.
- Grout: present, any quantity. The table method gives 3.5 cu yd; the cell-volume method gives 13 to 22; the models returned everything from 1.7 to 22. Reference for the bid range: 3.5 cu yd.
- Mortar: not expected; estimators fold it into the block price.

## rfp-04 concrete slab, 40 ft × 60 ft × 6 in

- Slab 40 × 60 × 0.5 ft / 27 = 44.4 cu yd. Thickened edge 200 ft × 1 × 1 / 27 = 7.4 cu yd. Concrete 52 cu yd. ±15%.
- #4 rebar on an 18 in grid: (40 / 1.5 + 1) × 60 + (60 / 1.5 + 1) × 40 ≈ 3,300 linear ft. ±25%.
- Crushed stone: 2,400 sq ft × 4 / 12 ft / 27 = 30 cu yd. ±15%.
- Vapor barrier: 2,400 sq ft. ±10%.
- Edge forms: not expected; estimators carry them in labor.

## rfp-12 small repair

- 2 drains, 120 linear ft of flashing (stated).

## rfp-07 huge slab

- 200 × 400 × 0.5 / 27 = 1,481 cu yd of concrete × 180 = 266,667 USD of concrete alone, so the bid passes the 250,000 gate.

## Expected bid range (`scripts/expected-financials.js`)

- Floor: fixed quantities minus 15%, price book prices, contingency 10%.
- Ceiling: fixed quantities plus the reference quantities above, contingency 25%, × 1.5.

## Corrections made while testing

- Grout was first expected at 13 cu yd (a formula that double-counted the cell volume). Both models gave about 3.3. Now "present, any quantity".
- Mortar and edge forms were first expected as lines. Removed.
- The first bid range ignored the present-only lines and the tolerance, and rejected two correct bids. Rewritten as above.
