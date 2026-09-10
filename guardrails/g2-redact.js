// G2: deterministic PII redaction.
const RULES = [
  { tag: '[EMAIL]', re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g },
  { tag: '[PHONE]', re: /(?:\+?\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b/g },
  {
    tag: '[SECRET]',
    re: /\b(?:sk-[A-Za-z0-9-]{8,}|AKIA[A-Z0-9]{16}|ghp_[A-Za-z0-9]{20,}|xox[abp]-[A-Za-z0-9-]{10,})\b/g,
  },
];

function redact(text) {
  let out = String(text);
  let count = 0;
  for (const rule of RULES) {
    out = out.replace(rule.re, () => {
      count += 1;
      return rule.tag;
    });
  }
  return { text: out, count };
}

// Deep copy with every string redacted. Used on A1's output before later agents see it.
function redactObject(value) {
  let count = 0;
  const walk = (v) => {
    if (typeof v === 'string') {
      const r = redact(v);
      count += r.count;
      return r.text;
    }
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === 'object')
      return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)]));
    return v;
  };
  return { obj: walk(value), count };
}

module.exports = { redact, redactObject, RULES };
