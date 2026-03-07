// Content script: purchase detection heuristics
// Exposes {type:'getPurchaseDetection'} and stores purchaseCandidate in chrome.storage.local

(function () {
  const getDetectFn = () => {
    if (typeof window !== 'undefined' && window.detectPurchasePage) return window.detectPurchasePage;
    return null;
  };

  function runDetect(doc) {
    const fn = getDetectFn();
    try {
      if (fn) return fn(doc);
    } catch (e) {
      console.warn('purchase-detect-core threw', e);
    }
    return { isPurchase: false, score: 0, reasons: [] };
  }

  function persistDebug(detection) {
    try {
      chrome.storage?.local?.set({
        lastPurchaseContent: {
          detection,
          url: (typeof location !== 'undefined' && location.href) || '',
          capturedAt: Date.now()
        }
      });
    } catch { /* ignore */ }
  }

  function safeHost() {
    try { return location?.hostname || ''; } catch { return ''; }
  }

  function withinMs(ts, maxAgeMs) {
    if (!ts || typeof ts !== 'number') return false;
    const age = Date.now() - ts;
    return age >= 0 && age <= maxAgeMs;
  }

  // Try to extract a loose order id if present (optional metadata)
  function extractOrderId() {
    try {
      const text = document?.body?.innerText || '';
      const m = text.match(/(order|confirmation)\s*(number|no\.|#)\s*[:#]?\s*([a-z0-9\-]{5,})/i);
      return m?.[3] ? String(m[3]) : null;
    } catch {
      return null;
    }
  }

  // Core idea: only promote to "purchaseCandidate" if:
  // - current page looks like confirmation/receipt
  // - and we have a recent checkoutTotal for this host (set by checkout detect.js)
  const PURCHASE_LINK_WINDOW_MS = 2 * 60 * 60 * 1000; // 2 hours

  const listenerFn = (msg, sender, sendResponse) => {
    if (!msg || msg.type !== 'getPurchaseDetection') return; 

    const detection = runDetect(document);
    persistDebug(detection);

    const currentUrl = (() => { try { return location.href; } catch { return ''; } })();
    const host = safeHost();

    chrome.storage?.local?.get(['checkoutTotal', 'purchaseCandidate'], (data) => {
      const checkoutTotal = data?.checkoutTotal || null;
      const prevCandidate = data?.purchaseCandidate || null;

      const canLinkToCheckout =
        !!checkoutTotal &&
        checkoutTotal.host === host &&
        withinMs(checkoutTotal.ts, PURCHASE_LINK_WINDOW_MS) &&
        typeof checkoutTotal.amount === 'number' &&
        checkoutTotal.amount > 0;

      const shouldCreateCandidate = !!(detection?.isPurchase && canLinkToCheckout);

      // avoid spamming candidates if user refreshes the confirmation page
      const alreadySame =
        prevCandidate &&
        prevCandidate.url === currentUrl &&
        prevCandidate.checkout?.ts === checkoutTotal?.ts;

      if (shouldCreateCandidate && !alreadySame) {
        const candidate = {
          id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
          ts: Date.now(),
          host,
          url: currentUrl,
          // link back to checkout total captured earlier
          checkout: {
            amount: checkoutTotal.amount,
            currency: checkoutTotal.currency || '$',
            raw: checkoutTotal.raw || null,
            url: checkoutTotal.url || null,
            ts: checkoutTotal.ts
          },
          orderId: extractOrderId(),
          detection // store reasons for debugging / later UI
        };

        try {
          chrome.storage?.local?.set({ purchaseCandidate: candidate }, () => {
            try {
              chrome.runtime.sendMessage({ type: 'purchaseDetected', purchase: candidate });
            } catch (e) { /* ignore */ }
          });
        } catch (e) {
          console.warn('Failed to persist purchaseCandidate', e);
          try { chrome.runtime.sendMessage({ type: 'purchaseDetected', purchase: candidate }); } catch (e) { }
        }
      }

      sendResponse({
        ok: true,
        detection,
        canLinkToCheckout,
        purchaseCandidateCreated: shouldCreateCandidate && !alreadySame
      });
    });

    return true;
  };

  try {
    if (chrome && chrome.runtime && chrome.runtime.onMessage && typeof chrome.runtime.onMessage.addListener === 'function') {
      try { console.log('purchase.js: calling chrome.runtime.onMessage.addListener'); } catch (e) {}
      chrome.runtime.onMessage.addListener(listenerFn);
      try { if (chrome.runtime._listener == null) chrome.runtime._listener = listenerFn; } catch (e) { /* ignore */ }
      try { console.log('purchase.js: registered listener'); } catch (e) {}
    }
  } catch (e) {
    // ignore if chrome isn't available in this environment
  }

  try {
    if (typeof module !== 'undefined' && module.exports) {
      module.exports = { listenerFn };
    }
  } catch (e) { /* ignore */ }

  // Debug handle
  window.__purchaseDetection = {
    get: () => runDetect(document),
    recompute: () => runDetect(document)
  };
})();