function extractJson(text) {
  let s = String(text);
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fence) s = fence[1];
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) {
    const e = new Error('no JSON object found in output');
    e.code = 'PARSE';
    throw e;
  }
  try {
    return JSON.parse(s.slice(start, end + 1));
  } catch (err) {
    const e = new Error(`invalid JSON: ${err.message}`);
    e.code = 'PARSE';
    throw e;
  }
}

module.exports = { extractJson };
