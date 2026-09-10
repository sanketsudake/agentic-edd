// Every commercial constant of the pipeline. The spec (section 4) is the source of these values.
module.exports = {
  LABOR_RATE: 0.6, // of total material cost
  OVERHEAD_RATE: 0.15, // of materials + labor
  CONTINGENCY_DEFAULT: 0.1, // of materials + labor, when A3 gives no rate
  CONTINGENCY_MIN: 0.1,
  CONTINGENCY_MAX: 0.25,
  BID_THRESHOLD_USD: 250000, // a final bid above this punches out
  LINE_TOLERANCE_USD: 0.01, // G9 on A2 line totals and the material total
  FIGURE_TOLERANCE_USD: 0.5, // G9 on A4 figures
};
