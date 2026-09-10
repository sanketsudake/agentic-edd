const test = require('node:test');
const assert = require('node:assert/strict');
const {
  computeFinancials,
  verifyPricing,
  verifyProposalFigures,
  roundMoney,
} = require('../harness/financials');
const { pricebookBySku } = require('../harness/fixtures');

const bySku = pricebookBySku();

test('computeFinancials applies 60% labor, 15% overhead, and the given contingency', () => {
  const f = computeFinancials({ total_material_cost: 20910, contingency_rate: 0.1 });
  assert.deepEqual(f, {
    materials: 20910,
    labor: 12546,
    overhead: 5018.4,
    contingency: 3345.6,
    final_bid: 41820,
    rates: { labor: 0.6, overhead: 0.15, contingency: 0.1 },
  });
});

test('computeFinancials uses the default contingency when none is given and rounds to cents', () => {
  const f = computeFinancials({ total_material_cost: 1234.567 });
  assert.equal(f.rates.contingency, 0.1);
  assert.equal(f.materials, 1234.57);
  assert.equal(f.final_bid, roundMoney(1234.57 * 1.6 * 1.25));
});

test('verifyPricing passes a correct A2 output', () => {
  const pricing = {
    lines: [
      {
        description: 'CMU',
        sku: 'CMU-8',
        quantity: 3600,
        unit: 'each',
        unit_cost: 3.2,
        line_total: 11520,
        conversion: null,
      },
      {
        description: 'cap',
        sku: 'CAP-CONC',
        quantity: 400,
        unit: 'linear_ft',
        unit_cost: 14,
        line_total: 5600,
        conversion: null,
      },
    ],
    total_material_cost: 17120,
    unpriced: [],
  };
  assert.equal(verifyPricing(pricing, bySku), null);
});

test('verifyPricing names a wrong unit cost, a wrong line total, a wrong unit, an unknown sku, and a wrong total', () => {
  const pricing = {
    lines: [
      {
        description: 'CMU',
        sku: 'CMU-8',
        quantity: 3600,
        unit: 'each',
        unit_cost: 1,
        line_total: 3600,
        conversion: null,
      },
      {
        description: 'cap',
        sku: 'CAP-CONC',
        quantity: 400,
        unit: 'sq_ft',
        unit_cost: 14,
        line_total: 5601,
        conversion: null,
      },
      {
        description: 'copper',
        sku: 'CU-PANEL',
        quantity: 1,
        unit: 'sq_ft',
        unit_cost: 30,
        line_total: 30,
        conversion: null,
      },
    ],
    total_material_cost: 1,
    unpriced: [],
  };
  const problem = verifyPricing(pricing, bySku);
  assert.match(problem, /CMU-8: unit_cost 1 != 3.2/);
  assert.match(problem, /CAP-CONC: unit sq_ft != linear_ft/);
  assert.match(problem, /CAP-CONC: line_total 5601 != 400 x 14 = 5600/);
  assert.match(problem, /unknown sku CU-PANEL/);
  assert.match(problem, /total_material_cost 1 != sum/);
});

test('verifyPricing accepts totals within one cent', () => {
  const pricing = {
    lines: [
      {
        description: 'grout',
        sku: 'GR-FILL',
        quantity: 12.7,
        unit: 'cu_yd',
        unit_cost: 190,
        line_total: 2413.01,
        conversion: null,
      },
    ],
    total_material_cost: 2413,
    unpriced: [],
  };
  assert.equal(verifyPricing(pricing, bySku), null);
});

test('verifyProposalFigures accepts figures within 50 cents and names the others', () => {
  const fin = computeFinancials({ total_material_cost: 22670, contingency_rate: 0.1 });
  assert.equal(
    verifyProposalFigures({ figures: { ...fin, final_bid: fin.final_bid + 0.4 } }, fin),
    null,
  );
  assert.match(verifyProposalFigures({ figures: { ...fin, labor: 1 } }, fin), /labor: 1 != 13602/);
});
