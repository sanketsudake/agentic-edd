const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const RFP_DIR = path.join(ROOT, 'fixtures', 'rfps');

function loadPricebook() {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'fixtures', 'pricebook.json'), 'utf8'));
}

function pricebookBySku(pricebook = loadPricebook()) {
  return Object.fromEntries(pricebook.items.map((i) => [i.sku, i]));
}

function loadManifest() {
  return JSON.parse(fs.readFileSync(path.join(RFP_DIR, 'manifest.json'), 'utf8'));
}

function loadRfp(id) {
  const entry = loadManifest().rfps.find((r) => r.id === id);
  if (!entry) throw new Error(`No fixture RFP with id "${id}"`);
  const rfp_text = fs.readFileSync(path.join(RFP_DIR, entry.file), 'utf8').trim();
  return { id: entry.id, client: entry.client, rfp_text, expected: entry.expected, expected_bom: entry.expected_bom };
}

module.exports = { loadPricebook, pricebookBySku, loadManifest, loadRfp, ROOT };
