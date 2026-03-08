const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { JSDOM } = require('jsdom');

const detect = require(path.resolve(__dirname, '..', 'extension', 'content', 'detect-core.js'));

const urls = [
  { name: 'Amazon checkout (example)', url: 'https://www.amazon.com/gp/buy/' },
  { name: 'Grubhub checkout', url: 'https://www.grubhub.com/checkout' },
  { name: 'Grubhub landing', url: 'https://www.grubhub.com/' },
  { name: 'PayPal checkout', url: 'https://www.paypal.com/checkoutnow' },
  { name: 'Stripe checkout (example)', url: 'https://checkout.stripe.com/' },
  { name: 'Walmart checkout', url: 'https://www.walmart.com/checkout' },
  { name: 'Target cart', url: 'https://www.target.com/co-cart' },
  { name: 'eBay checkout', url: 'https://www.ebay.com/checkout' },
  { name: 'Shopify (storefront)', url: 'https://www.shopify.com/' },
  { name: 'Etsy checkout', url: 'https://www.etsy.com/checkout' }
];

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    try {
      const client = url.startsWith('https') ? https : http;
      const req = client.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; detector-bot/1.0)' } }, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => resolve({ status: res.statusCode, body: data }));
      });
      req.on('error', reject);
      req.setTimeout(15000, () => { req.destroy(new Error('timeout')) });
    } catch (e) { reject(e); }
  });
}

async function analyzeUrl(obj) {
  const { name, url } = obj;
  try {
    const fetched = await fetchUrl(url);
    if (!fetched || !fetched.body) return { name, url, error: `Empty response (status ${fetched && fetched.status})` };
    const dom = new JSDOM(fetched.body, { runScripts: 'dangerously', resources: 'usable', url });
    await new Promise(r => setTimeout(r, 1200));
    const result = detect(dom.window.document);
    return { name, url, status: fetched.status, result };
  } catch (err) {
    return { name, url, error: String(err) };
  }
}

(async function main() {
  const out = [];
  for (const u of urls) {
    process.stdout.write(`Checking ${u.url} ... `);
    const r = await analyzeUrl(u);
    if (r.error) console.log('ERROR'); else console.log('OK');
    out.push(r);
  }
  const outPath = path.resolve(__dirname, 'report.json');
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf8');
  console.log('\nReport written to', outPath);
  console.log('Summary:');
  out.forEach(o => {
    if (o.error) console.log(`- ${o.name}: ERROR: ${o.error}`);
    else console.log(`- ${o.name}: status=${o.status}, isCheckout=${o.result.isCheckout}, score=${o.result.score}, reasons=${JSON.stringify(o.result.reasons)}`);
  });
})();
