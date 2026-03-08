const fs = require('fs');
const { JSDOM } = require('jsdom');
const detect = require('../extension/content/detect-core');

function runTest(file) {
  const html = fs.readFileSync(file, 'utf8');
  const dom = new JSDOM(html, { runScripts: 'dangerously' });
  const doc = dom.window.document;
  const res = detect(doc);
  console.log('File:', file);
  console.log(res);
}

runTest('extension/test-pages/checkout-sample.html');
runTest('extension/test-pages/purchase-completion-sample.html');
