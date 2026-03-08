const http = require('http');
const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');

// Simple static server helper
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
        const mime = {'.html':'text/html', '.js':'application/javascript', '.css':'text/css'}[ext] || 'text/plain';
        res.writeHead(200, { 'Content-Type': mime });
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

test.describe('Simulated extension e2e', () => {
  let server;
  const root = path.resolve(__dirname, '..', '..', 'extension', 'test-pages');

  test.beforeAll(async () => {
    server = await startStaticServer(root, 8000);
    console.log('Static server started at http://localhost:8000/');
  });

  test.afterAll(async () => {
    server && server.close();
  });

  test('detect -> link purchase -> show recommendation UI', async ({ page }) => {
    // Mock chrome API before any script runs
    await page.addInitScript(() => {
      window.chrome = {};
      window.chrome.storage = { local: { _data: {} } };
      window.chrome.storage.local.get = function (keys, cb) {
        try {
          if (Array.isArray(keys)) {
            const out = {};
            keys.forEach(k => out[k] = window.chrome.storage.local._data[k]);
            cb(out); return;
          }
          if (typeof keys === 'object') {
            const out = {};
            Object.keys(keys).forEach(k => out[k] = window.chrome.storage.local._data[k] !== undefined ? window.chrome.storage.local._data[k] : keys[k]);
            cb(out); return;
          }
          cb({ [keys]: window.chrome.storage.local._data[keys] });
        } catch (e) { cb({}); }
      };
      window.chrome.storage.local.set = function (obj, cb) { try { Object.assign(window.chrome.storage.local._data, obj); } catch (e) {} cb && cb(); };
      window.chrome.runtime = { lastError: null, _listeners: [], _sent: [], sendMessage(msg, cb) { window.chrome.runtime._sent.push(msg); cb && cb(null); }, onMessage: { _listeners: [], addListener(fn) { window.chrome.runtime.onMessage._listeners.push(fn); } } };
      window.chrome.tabs = { query(opts, cb) { cb([{ id: 1, url: window.location.href }]); }, create(){} };
      window.chrome.scripting = { executeScript(){} };
    });

    // Navigate to checkout page and inject detect scripts
    await page.goto('http://localhost:8000/checkout-sample.html');
    await page.addScriptTag({ path: path.resolve(__dirname, '..', '..', 'extension', 'content', 'detect-core.js') });
    await page.addScriptTag({ path: path.resolve(__dirname, '..', '..', 'extension', 'content', 'detect.js') });

    // trigger getDetection via runtime listeners
    const getDet = await page.evaluate(() => {
      const listeners = window.chrome.runtime.onMessage._listeners || [];
      window._lastGet = null;
      listeners.forEach(fn => { try { fn({ type: 'getDetection' }, null, (resp) => { window._lastGet = resp; }); } catch (e) {} });
      return { resp: window._lastGet, storage: window.chrome.storage.local._data };
    });
    expect(getDet.resp).toBeTruthy();
    expect(getDet.storage.lastDetectionContent).toBeTruthy();

    // Navigate to purchase page. Ensure checkoutTotal exists in this page context.
    await page.goto('http://localhost:8000/purchase-completion-sample.html');
    await page.addScriptTag({ path: path.resolve(__dirname, '..', '..', 'extension', 'content', 'purchase-detect-core.js') });
    await page.addScriptTag({ path: path.resolve(__dirname, '..', '..', 'extension', 'content', 'purchase.js') });
    await page.addScriptTag({ path: path.resolve(__dirname, '..', '..', 'extension', 'content', 'checkCardUsed.js') });

    // Populate checkoutTotal in this page context
    await page.evaluate(() => {
      try {
        window.chrome.storage.local._data.checkoutTotal = {
          amount: 49.95,
          currency: '$', raw: '$49.95', url: 'http://localhost:8000/checkout-sample.html', host: window.location.hostname || 'localhost', ts: Date.now()
        };
      } catch (e) {}
    });

    // Trigger purchase detection listener
    const purchaseResp = await page.evaluate(() => {
      const listeners = window.chrome.runtime.onMessage._listeners || [];
      window._lastPurchase = null;
      listeners.forEach(fn => { try { fn({ type: 'getPurchaseDetection' }, null, (resp) => { window._lastPurchase = resp; }); } catch (e) {} });
      return { resp: window._lastPurchase, storage: window.chrome.storage.local._data, sent: window.chrome.runtime._sent };
    });

    expect(purchaseResp.resp).toBeTruthy();
    expect(purchaseResp.storage.purchaseCandidate).toBeTruthy();
    const sent = purchaseResp.sent || [];
    expect(sent.some(m => m && m.type === 'purchaseDetected')).toBeTruthy();

    // Simulate background message showRecommendation and assert panel appears
    await page.evaluate(() => {
      const listeners = window.chrome.runtime.onMessage._listeners || [];
      const candidate = window.chrome.storage.local._data.purchaseCandidate || null;
      const msg = { type: 'showRecommendation', candidate, recommendation: { cardName: 'Suggested card', reason: 'linked purchase', estimate: '$1' } };
      listeners.forEach(fn => { try { fn(msg, null, () => {}); } catch (e) {} });
    });

    await expect(page.locator('#onpoint-recommendation-root')).toBeVisible({ timeout: 3000 });
    const panelText = await page.locator('#onpoint-recommendation-root').innerText();
    expect(panelText).toContain('Which card did you use?');
    expect(panelText).toContain('Suggested card');
  });

  test('detect EUR formatted total -> link purchase -> show UI', async ({ page }) => {
    // Mock chrome API before any script runs
    await page.addInitScript(() => {
      window.chrome = {};
      window.chrome.storage = { local: { _data: {} } };
      window.chrome.storage.local.get = function (keys, cb) {
        try {
          if (Array.isArray(keys)) { const out = {}; keys.forEach(k => out[k] = window.chrome.storage.local._data[k]); cb(out); return; }
          if (typeof keys === 'object') { const out = {}; Object.keys(keys).forEach(k => out[k] = window.chrome.storage.local._data[k] !== undefined ? window.chrome.storage.local._data[k] : keys[k]); cb(out); return; }
          cb({ [keys]: window.chrome.storage.local._data[keys] });
        } catch (e) { cb({}); }
      };
      window.chrome.storage.local.set = function (obj, cb) { try { Object.assign(window.chrome.storage.local._data, obj); } catch (e) {} cb && cb(); };
      window.chrome.runtime = { lastError: null, _listeners: [], _sent: [], sendMessage(msg, cb) { window.chrome.runtime._sent.push(msg); cb && cb(null); }, onMessage: { _listeners: [], addListener(fn) { window.chrome.runtime.onMessage._listeners.push(fn); } } };
      window.chrome.tabs = { query(opts, cb) { cb([{ id: 1, url: window.location.href }]); }, create(){} };
      window.chrome.scripting = { executeScript(){} };
    });

    // Navigate to EUR checkout page and inject detect scripts
    await page.goto('http://localhost:8000/checkout-sample-eur.html');
    await page.addScriptTag({ path: path.resolve(__dirname, '..', '..', 'extension', 'content', 'detect-core.js') });
    await page.addScriptTag({ path: path.resolve(__dirname, '..', '..', 'extension', 'content', 'detect.js') });

    // trigger getDetection
    const getDet = await page.evaluate(() => {
      const listeners = window.chrome.runtime.onMessage._listeners || [];
      window._lastGet = null;
      listeners.forEach(fn => { try { fn({ type: 'getDetection' }, null, (resp) => { window._lastGet = resp; }); } catch (e) {} });
      return { resp: window._lastGet, storage: window.chrome.storage.local._data };
    });
    expect(getDet.resp).toBeTruthy();
    // Ensure detector captured a checkout and stored lastDetectionContent
    expect(getDet.storage.lastDetectionContent).toBeTruthy();

    // Now simulate navigation to purchase page and inject purchase scripts
    await page.goto('http://localhost:8000/purchase-completion-sample.html');
    await page.addScriptTag({ path: path.resolve(__dirname, '..', '..', 'extension', 'content', 'purchase-detect-core.js') });
    await page.addScriptTag({ path: path.resolve(__dirname, '..', '..', 'extension', 'content', 'purchase.js') });
    await page.addScriptTag({ path: path.resolve(__dirname, '..', '..', 'extension', 'content', 'checkCardUsed.js') });

    // Populate checkoutTotal in page context using European formatting normalized value
    await page.evaluate(() => {
      try {
        window.chrome.storage.local._data.checkoutTotal = {
          amount: 49.95,
          currency: '€', raw: '49,95 €', url: 'http://localhost:8000/checkout-sample-eur.html', host: window.location.hostname || 'localhost', ts: Date.now()
        };
      } catch (e) {}
    });

    // Trigger purchase detection
    const purchaseResp = await page.evaluate(() => {
      const listeners = window.chrome.runtime.onMessage._listeners || [];
      window._lastPurchase = null;
      listeners.forEach(fn => { try { fn({ type: 'getPurchaseDetection' }, null, (resp) => { window._lastPurchase = resp; }); } catch (e) {} });
      return { resp: window._lastPurchase, storage: window.chrome.storage.local._data, sent: window.chrome.runtime._sent };
    });

    expect(purchaseResp.resp).toBeTruthy();
    expect(purchaseResp.storage.purchaseCandidate).toBeTruthy();
    expect((purchaseResp.sent || []).some(m => m && m.type === 'purchaseDetected')).toBeTruthy();

    // Simulate background message and verify UI panel
    await page.evaluate(() => {
      const listeners = window.chrome.runtime.onMessage._listeners || [];
      const candidate = window.chrome.storage.local._data.purchaseCandidate || null;
      const msg = { type: 'showRecommendation', candidate, recommendation: { cardName: 'Suggested card', reason: 'linked purchase', estimate: '€1' } };
      listeners.forEach(fn => { try { fn(msg, null, () => {}); } catch (e) {} });
    });

    await expect(page.locator('#onpoint-recommendation-root')).toBeVisible({ timeout: 3000 });
    const panelText = await page.locator('#onpoint-recommendation-root').innerText();
    expect(panelText).toContain('Which card did you use?');
    expect(panelText).toContain('Suggested card');
  });
});
