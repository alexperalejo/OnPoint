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
  //====================================================================
  //Checkout total extraction helpers
  //====================================================================
  // Money Helper function to extract value and currency from text, used by some detect-core rules
    function parseMoney(text) {
    if (!text) return null;
    const cleaned = String(text).replace(/\s+/g, " ").trim();

    const m = cleaned.match(/([€£¥₹$])?\s*([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]{2})|[0-9]+(?:[.,][0-9]{2})?)/);
    if (!m) return null;

    const currency = m[1] || "$";
    let amountStr = m[2];

    const hasComma = amountStr.includes(",");
    const hasDot = amountStr.includes(".");

    if (hasComma && hasDot) {
      // 1,234.56 (US) OR 1.234,56 (EU) — decide by last separator
      if (amountStr.lastIndexOf(",") > amountStr.lastIndexOf(".")) {
        amountStr = amountStr.replace(/\./g, "").replace(",", ".");
      } else {
        amountStr = amountStr.replace(/,/g, "");
      }
    } else if (hasComma && !hasDot) {
      // 1,234 -> 1234
      amountStr = amountStr.replace(/,/g, "");
    }

    const value = Number(amountStr);
    if (Number.isNaN(value)) return null;
    return { value, currency, raw: text };
  } // end parseMoney

  function isVisible(element){
    if (!element) return false;

    const rect = element.getBoundingClientRect?.();
    if (!rect) return true; 
    return rect.width > 0 && rect.height > 0;
  } //end isVisible helper

  function scoreElement(element){
    const baseScore = new Set([
      element?.getAttribute?.("data-testid"),
      element?.getAttribute?.("data-anchor-id"),
      element?.id,
      element?.className
    ].filter(Boolean).map(x => String(x).toLowerCase()));
    
    let score = 0;
    const joined = Array.from(baseScore).join(" ");

    if (joined.includes("grand")) score += 5;
    if (joined.includes("ordercarttotal")) score += 5;
    if (joined.includes("total")) score += 3;
    if (joined.includes("amount")) score += 1;
    if (joined.includes("tax")) score -= 2;
    if (joined.includes("fee")) score -= 2;
    if (joined.includes("subtotal")) score -= 4;

    if (isVisible(element)) score += 1;

    return score;
  } //end scoreElement

  //Generic selector (from 3 merchants)
  function extractTotalBySelectors() {
    const selectors = [
      // Your exact ones (still "generic" because they’re attribute based)
      '[data-testid="resGrandTotalCost"]',
      '[data-testid="totalForStayAmount"]',
      '[data-testid="grand-total-value"]',
      '[data-anchor-id="OrderCartTotal"]',

      // Broader patterns that catch a lot of sites
      '[data-testid*="grand"][data-testid*="total"]',
      '[data-testid*="grand-total"]',
      '[data-testid*="order"][data-testid*="total"]',
      '[data-testid*="total"]',
      '[data-anchor-id*="Total"]',
      '[data-anchor-id*="total"]',
      '[id*="grand"][id*="total"]',
      '[id*="order"][id*="total"]',
      '[class*="grand"][class*="total"]',
      '[class*="order"][class*="total"]'
    ];

    const candidates = [];
    for (const sel of selectors) {
      const els = document.querySelectorAll(sel);
      for (const el of els) {
        const money = parseMoney(el.textContent);
        if (!money) continue;
        candidates.push({ el, money, score: scoreElement(el) });
      }
    } 

    if (!candidates.length) return null;

    // Pick best by (score desc), then by amount desc (final total often largest)
    candidates.sort((a, b) => (b.score - a.score) || (b.money.value - a.money.value));
    return candidates[0].money;
  } // end extractTotalBySelectors

//Fallback label-based scan (useful for Expedia if selectors ever fail)
  function extractTotalByLabels() {
    const labelPatterns = [
      /trip\s*total/i,
      /order\s*total/i,
      /grand\s*total/i,
      /total\s*due/i,
      /amount\s*due/i,
      /estimated\s*total/i,
      /\btotal\b/i, // last resort
    ];

    const nodes = Array.from(document.querySelectorAll("body *"))
      .filter(el => el.children.length === 0)
      .slice(0, 3500);

    for (const el of nodes) {
      const t = (el.textContent || "").trim();
      if (!t) continue;

      const matches = labelPatterns.some(p => p.test(t));
      if (!matches) continue;

      // try sibling/parent container for money
      const sib = el.nextElementSibling;
      const m1 = parseMoney(sib?.textContent);
      if (m1) return m1;

      const parent = el.parentElement;
      const m2 = parseMoney(parent?.textContent);
      if (m2) return m2;
    }

    return null;
  } // end extractTotalByLabels

  function extractCheckoutTotal() {
    return extractTotalBySelectors() || extractTotalByLabels();
  }
  //====================================================================

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

      lastDetection = runDetect(document);
      lastUrl = location.href;
      persistDetection(lastDetection);

      const total = extractCheckoutTotal();

    if (lastDetection?.isCheckout && total && total.value > 0) {
      chrome.storage?.local?.get(["checkoutTotal"], (prev) => {
        const old = prev?.checkoutTotal?.amount;
        if (old === total.value && prev?.checkoutTotal?.url === location.href) return;

        const checkoutObj = {
          amount: total.value,
          currency: total.currency,
          raw: total.raw,
          url: location.href,
          host: location.hostname,
          ts: Date.now(),
        };
        try {
          chrome.storage?.local?.set({ checkoutTotal: checkoutObj }, () => {
            try {
              chrome.runtime.sendMessage({ type: 'checkoutCaptured', checkout: checkoutObj });
            } catch (e) { /* ignore */ }
          });
        } catch (e) {
          try { chrome.runtime.sendMessage({ type: 'checkoutCaptured', checkout: checkoutObj }); } catch (e) { }
        }
      });
    } //end conditional storage of checkout total

      sendResponse({
        ok: true,
        detection: lastDetection,
        checkoutTotal: total || null
      });
    }
    return true;
  }); // end message listener

  // expose for debugging
  window.__checkoutDetection = {
    get: () => lastDetection,
    recompute: () => { lastDetection = runDetect(document); return lastDetection; }
  };
})();
