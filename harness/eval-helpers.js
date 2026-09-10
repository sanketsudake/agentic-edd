// promptfoo javascript assertions must return true, a number, or { pass, score, reason }.
// Our check functions return null/true on pass and a string on failure; this adapter converts them.
function wrapAsserts(exportsObj) {
  const out = {};
  for (const [name, fn] of Object.entries(exportsObj)) {
    out[name] = typeof fn !== 'function' ? fn : (output, context) => {
      let r;
      try { r = fn(output, context); } catch (err) { return { pass: false, score: 0, reason: `${name} threw: ${err.message}` }; }
      if (r === true || r === null || r === undefined) return true;
      if (typeof r === 'string') return { pass: false, score: 0, reason: r };
      return r;
    };
  }
  return out;
}
module.exports = { wrapAsserts };
