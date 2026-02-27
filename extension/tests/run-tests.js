const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const assert = require('assert');

const detect = require(path.resolve(__dirname, '../content/detect-core.js'));
const purchaseDetect = require(path.resolve(__dirname, '../content/purchase-detect-core.js'));

function loadFileToDom(filePath, url) {
  const html = fs.readFileSync(filePath, 'utf8');
  const dom = new JSDOM(html, { runScripts: 'dangerously', resources: 'usable', url: url || 'http://localhost/' });
  return dom;
}

async function testFile(fileRel, expectedIsCheckout, url) {
  const filePath = path.resolve(__dirname, '..', fileRel);
  const dom = loadFileToDom(filePath, url);
  // let resources load briefly
  await new Promise(r => setTimeout(r, 200));
  const result = detect(dom.window.document);
  console.log(fileRel, '=>', result);
  assert.strictEqual(result.isCheckout, expectedIsCheckout, `Expected isCheckout=${expectedIsCheckout} for ${fileRel}, got ${result.isCheckout}`);
}

async function testPurchaseFile(fileRel, expectedIsPurchase, url) {
  const filePath = path.resolve(__dirname, '..', fileRel);
  const dom = loadFileToDom(filePath, url);
  await new Promise(r => setTimeout(r, 200));
  const result = purchaseDetect(dom.window.document);
  console.log(fileRel, '=>', result);
  if (typeof expectedIsPurchase === 'boolean') {
    assert.strictEqual(result.isPurchase, expectedIsPurchase, `Expected isPurchase=${expectedIsPurchase} for ${fileRel}, got ${result.isPurchase}`);
  }
}

(async function () {
  try {
    // Set a URL containing 'checkout' for the checkout sample so URL heuristics apply
    await testFile('test-pages/checkout-sample.html', true, 'https://example.com/checkout');
    await testFile('test-pages/non-checkout.html', false, 'https://example.com/article');
    // Purchase detection tests
    await testPurchaseFile('test-pages/purchase-completion-sample.html', true, 'https://example.com/thank-you');
    console.log('All tests passed');
    process.exit(0);
  } catch (e) {
    console.error('Test failed:', e && e.message || e);
    process.exit(2);
  }
})();
