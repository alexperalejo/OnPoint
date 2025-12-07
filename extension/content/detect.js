// Content script: checkout detection heuristics
// Exposes a message handler for {type: 'getDetection'} and caches the last result.

(function () {
  // Lightweight wrapper around detect-core. We scope and debounce DOM observations
  // to reduce runtime overhead on heavy pages.

  const getDetectFn = () => {
    if (typeof window !== 'undefined' && window.detectCheckoutPage) return window.detectCheckoutPage;
    if (typeof window !== 'undefined' && window.__fallback_detect) return window.__fallback_detect;
    return null;
  };

  // Persist the latest detection so dev tools can read it without re-sending commands.
  function persistDetection(detection) {
    try {
      const payload = {
        detection,
        url: (typeof location !== 'undefined' && location.href) || '',
        capturedAt: Date.now()
      };
      chrome.storage?.local?.set({ lastDetectionContent: payload });
    } catch (e) {
      /* ignore storage failures */
    }
  }

  function runDetect(doc) {
    doc = doc || (typeof document !== 'undefined' ? document : null);
    const fn = getDetectFn();
    try {
      if (fn) return fn(doc);
    } catch (e) {
      console.warn('detect-core threw', e);
    }
    return { isCheckout: false, score: 0, reasons: [] };
  }

  // Initial run
  let lastDetection = runDetect(document);
  let lastUrl = (typeof location !== 'undefined' && location.href) || '';
  persistDetection(lastDetection);

  // Debounce helper
  let debounceTimer = null;
  const DEBOUNCE_MS = 250;
  const POLL_MS = 2000; // periodic safeguard for SPA/nav changes

  // Limit observation triggers to nodes likely to affect checkout detection
  const importantSelectors = [
    'form',
    '[role="form"]',
    'input[name*=card]',
    'input[id*=card]',
    '[id*=checkout]',
    '[class*=checkout]',
    '[id*=cart]',
    '[class*=cart]',
    'button',
    'iframe'
  ];

  function nodeLooksRelevant(node) {
    try {
      if (!node || node.nodeType !== 1) return false;
      const el = node;
      for (const sel of importantSelectors) {
        if (el.matches && el.matches(sel)) return true;
        if (el.querySelector && el.querySelector(sel)) return true;
      }
    } catch (e) {
      // ignore invalid selectors / security errors
    }
    return false;
  }

  // Poll occasionally to catch SPA navigation without DOM mutations
  try {
    setInterval(() => {
      scheduleRecompute();
    }, POLL_MS);
  } catch (e) { /* ignore */ }

  // Listen for URL-changing events common to SPAs
  try {
    window.addEventListener('popstate', scheduleRecompute, { passive: true });
    window.addEventListener('hashchange', scheduleRecompute, { passive: true });
    window.addEventListener('load', scheduleRecompute, { passive: true });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') scheduleRecompute();
    }, { passive: true });
  } catch (e) { /* ignore */ }

  function scheduleRecompute() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      try {
        const newDet = runDetect(document);
        const currentUrl = (typeof location !== 'undefined' && location.href) || '';
        const changed =
          !lastDetection ||
          newDet.score !== lastDetection.score ||
          newDet.isCheckout !== lastDetection.isCheckout ||
          currentUrl !== lastUrl;
        lastDetection = newDet;
        lastUrl = currentUrl;
        if (changed) {
          persistDetection(lastDetection);
          // helpful page-visible log for manual QA
          try { console.info('checkout-detection:update', lastDetection); } catch (e) { }
        } else {
          // still persist to keep capturedAt fresh even if detection unchanged
          persistDetection(lastDetection);
        }
      } catch (e) {
        // swallow exceptions to avoid breaking page
      }
    }, DEBOUNCE_MS);
  }

  // Observe DOM but only act when mutations look relevant
  try {
    const observer = new MutationObserver((mutations) => {
      try {
        for (const m of mutations) {
          // if attribute changed and it looks relevant
          if (m.type === 'attributes' && nodeLooksRelevant(m.target)) { scheduleRecompute(); return; }
          // check added nodes quickly for relevance
          if (m.addedNodes && m.addedNodes.length) {
            for (const n of m.addedNodes) {
              if (nodeLooksRelevant(n)) { scheduleRecompute(); return; }
            }
          }
          // handle subtree text/content changes by checking the target
          if (m.type === 'childList' && nodeLooksRelevant(m.target)) { scheduleRecompute(); return; }
        }
      } catch (e) { /* ignore */ }
    });
    // Observe body if present; otherwise document
    const root = document && document.body ? document.body : document.documentElement || document;
    observer.observe(root, { subtree: true, childList: true, attributes: true, characterData: false });
  } catch (e) {
    // If MutationObserver isn't available or access denied, skip observation
  }

  // Expose via chrome.runtime messaging
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg && msg.type === 'getDetection') {
      // recompute quickly
      lastDetection = runDetect(document);
      lastUrl = (typeof location !== 'undefined' && location.href) || lastUrl;
      persistDetection(lastDetection);
      sendResponse({ ok: true, detection: lastDetection });
    }
    return true; // keep channel open for async
  });

  // Also expose for debugging
  window.__checkoutDetection = {
    get: () => lastDetection,
    recompute: () => { lastDetection = runDetect(document); return lastDetection; }
  };
})();
