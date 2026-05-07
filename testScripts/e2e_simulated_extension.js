const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

// Simple static file server for extension/test-pages
function startStaticServer(root, port = 8000) {
  const server = http.createServer((req, res) => {
    try {
      let reqPath = req.url.split('?')[0];
      if (reqPath === '/') reqPath = '/checkout-sample.html';
      const filePath = path.join(root, decodeURIComponent(reqPath));
      if (!filePath.startsWith(path.resolve(root))) {
        res.writeHead(403); res.end('Forbidden'); return;
      }
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const content = fs.readFileSync(filePath);
        const ext = path.extname(filePath).toLowerCase();
        const m = {
          '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json'
        }[ext] || 'text/plain';
        res.writeHead(200, { 'Content-Type': m });
        res.end(content);
      } else {
        res.writeHead(404); res.end('Not Found');
      }
    } catch (e) {
      res.writeHead(500); res.end(String(e));
    }
  });
  return new Promise((resolve) => server.listen(port, () => resolve(server)));
}

(async () => {
  const root = path.resolve(__dirname, '..', 'extension', 'test-pages');
  const server = await startStaticServer(root, 8000);
  console.log('Static server started at http://localhost:8000/');

  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Add a basic mock `chrome` API before any script runs
  await page.addInitScript(() => {
    window.chrome = {};
    window.chrome.storage = { local: { _data: {} } };
    window.chrome.storage.local.get = function (keys, cb) {
      try {
        if (Array.isArray(keys)) {
          const out = {};
          keys.forEach(k => out[k] = window.chrome.storage.local._data[k]);
          cb(out);
          return;
        }
        if (typeof keys === 'object') {
          const out = {};
          Object.keys(keys).forEach(k => out[k] = window.chrome.storage.local._data[k] !== undefined ? window.chrome.storage.local._data[k] : keys[k]);
          cb(out);
          return;
        }
        cb({ [keys]: window.chrome.storage.local._data[keys] });
      } catch (e) { console.warn(e); cb({}); }
    };
    window.chrome.storage.local.set = function (obj, cb) {
      try { Object.assign(window.chrome.storage.local._data, obj); } catch (e) { }
      cb && cb();
    };

    window.chrome.runtime = {
      lastError: null,
      _listeners: [],
      _sent: [],
      sendMessage(msg, cb) { window.chrome.runtime._sent.push(msg); cb && cb(null); },
      onMessage: {
        _listeners: [],
        addListener(fn) { window.chrome.runtime.onMessage._listeners.push(fn); }
      }
    };

    window.chrome.tabs = { query(opts, cb) { cb([{ id: 1, url: window.location.href }]); }, create() { } };
    window.chrome.scripting = { executeScript() { } };
  });

  // Helper to inject a local script file into the page
  async function injectScript(page, relPath) {
    const full = path.resolve(__dirname, '..', relPath);
    await page.addScriptTag({ path: full });
    console.log('Injected', relPath);
  }

  // --- CHECKOUT PAGE FLOW ---
  await page.goto('http://localhost:8000/checkout-sample.html');
  // Inject detect-core and detect scripts (simulate content scripts)
  await injectScript(page, 'extension/content/detect-core.js');
  await injectScript(page, 'extension/content/detect.js');

  // Give scripts a tick to register listeners
  await page.waitForTimeout(200);

  // Trigger the onMessage listeners for 'getDetection'
  const getDetResp = await page.evaluate(() => {
    const listeners = window.chrome.runtime.onMessage._listeners || [];
    window._lastGetDetectionResp = null;
    listeners.forEach(fn => {
      try {
        fn({ type: 'getDetection' }, null, (resp) => { window._lastGetDetectionResp = resp; });
      } catch (e) { /* ignore */ }
    });
    return { resp: window._lastGetDetectionResp, storage: window.chrome.storage.local._data };
  });

  console.log('Checkout detection response:', getDetResp.resp);
  console.log('Storage after detection:', getDetResp.storage);

  // --- PURCHASE PAGE FLOW ---
  // Pre-populate a matching checkoutTotal so purchase detection can link to it
  await page.evaluate(() => {
    try {
      window.chrome.storage.local._data.checkoutTotal = {
        amount: 49.95,
        currency: '$',
        raw: '$49.95',
        url: 'http://localhost:8000/checkout-sample.html',
        host: window.location.hostname || 'localhost',
        ts: Date.now()
      };
    } catch (e) { /* ignore */ }
  });

  await page.goto('http://localhost:8000/purchase-completion-sample.html');
  await injectScript(page, 'extension/content/purchase-detect-core.js');
  await injectScript(page, 'extension/content/purchase.js');
  await page.waitForTimeout(200);

  // Ensure the purchase page's chrome.storage has a matching checkoutTotal (page contexts reset on navigation)
  await page.evaluate(() => {
    try {
      window.chrome.storage.local._data.checkoutTotal = {
        amount: 49.95,
        currency: '$',
        raw: '$49.95',
        url: 'http://localhost:8000/checkout-sample.html',
        host: window.location.hostname || 'localhost',
        ts: Date.now()
      };
    } catch (e) { /* ignore */ }
  });

  const purchaseResp = await page.evaluate(() => {
    const listeners = window.chrome.runtime.onMessage._listeners || [];
    window._lastPurchaseResp = null;
    listeners.forEach(fn => {
      try {
        fn({ type: 'getPurchaseDetection' }, null, (resp) => { window._lastPurchaseResp = resp; });
      } catch (e) {}
    });
    return { resp: window._lastPurchaseResp, storage: window.chrome.storage.local._data, sent: window.chrome.runtime._sent };
  });

  console.log('Purchase detection response:', purchaseResp.resp);
  console.log('Storage after purchase detection:', purchaseResp.storage);
  console.log('Messages sent by content scripts:', purchaseResp.sent);
  // Assertions: ensure a purchaseCandidate was created and a purchaseDetected message was sent
  const checks = await page.evaluate(() => {
    const storage = window.chrome.storage.local._data || {};
    const sent = window.chrome.runtime._sent || [];
    const hasCandidate = !!storage.purchaseCandidate;
    const sentPurchaseDetected = sent.some(m => m && m.type === 'purchaseDetected');
    return { hasCandidate, sentPurchaseDetected };
  });

  console.log('Assertion checks:', checks);

  if (!checks.hasCandidate) {
    console.error('TEST FAIL: purchaseCandidate was not created in chrome.storage.local');
    await browser.close(); server.close(); process.exit(1);
  }
  if (!checks.sentPurchaseDetected) {
    console.error('TEST FAIL: purchaseDetected message was not sent by content scripts');
    await browser.close(); server.close(); process.exit(1);
  }

  // Simulate background sending a showRecommendation message by invoking runtime.onMessage listeners
  await page.evaluate(() => {
    try {
      const listeners = window.chrome.runtime.onMessage._listeners || [];
      const candidate = window.chrome.storage.local._data.purchaseCandidate || null;
      const msg = { type: 'showRecommendation', candidate, recommendation: { cardName: 'Suggested card', reason: 'linked purchase', estimate: '$1' } };
      listeners.forEach(fn => {
        try { fn(msg, null, () => {}); } catch (e) { /* ignore */ }
      });
    } catch (e) { /* ignore */ }
  });

  // Wait for the UI panel to appear (created by content script reacting to showRecommendation)
  let panelExists = false;
  try {
    await page.waitForSelector('#onpoint-recommendation-root', { timeout: 3000 });
    panelExists = true;
  } catch (e) { panelExists = false; }

  console.log('Recommendation panel present after background message?', panelExists);

  if (!panelExists) {
    console.error('TEST FAIL: Recommendation panel did not appear after background showRecommendation');
    await browser.close(); server.close(); process.exit(1);
  }

  // Verify panel content briefly
  const panelText = await page.$eval('#onpoint-recommendation-root', el => el.innerText);
  console.log('Panel text snippet:', panelText.split('\n').slice(0,5).join(' | '));

  console.log('TEST PASS: purchaseCandidate created, purchaseDetected sent, panel shown');

  await browser.close();
  server.close();
  console.log('E2E simulated extension test finished.');
})();
