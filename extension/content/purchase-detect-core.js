/*
  purchase-detect-core.js
  Returns { isPurchase, score, reasons, isPurchaseByScore, hasStrongReceiptSignal }
  Attaches to window.detectPurchasePage and exports for Node tests.
*/
(function (root) {
  function safeLower(s) {
    try { return String(s || '').toLowerCase(); } catch { return ''; }
  }

  function getPageText(doc) {
    try {
      // prefer innerText, but fall back to textContent for JSDOM environments
      return safeLower(doc?.body?.innerText || doc?.body?.textContent || '');
    } catch {
      return '';
    }
  }

  function detectPurchasePage(doc) {
    doc = doc || (typeof document !== 'undefined' ? document : null);

    const reasons = [];
    let score = 0;

   const url = safeLower((typeof location !== 'undefined' && location.href) || '');
    if (url.includes('amazon.com') && url.includes('thankyou')) {
      return {
        isPurchase: true,
        score: 1,
        reasons: ['amazon-thankyou-fastpath'],
        isPurchaseByScore: true,
        hasStrongReceiptSignal: true
    };
  }
    // URL heuristics (confirmation pages vary widely)
    const urlChecks = [
      { p: 'thank', w: 0.18 },
      { p: 'thanks', w: 0.18 },
      { p: 'confirmation', w: 0.22 },
      { p: 'confirmed', w: 0.18 },
      { p: 'receipt', w: 0.22 },
      { p: 'order-confirmation', w: 0.25 },
      { p: 'order-confirmed', w: 0.25 },
      { p: 'success', w: 0.12 },
      { p: 'complete', w: 0.10 },
      { p: 'purchase', w: 0.10 }
    ];
    for (const c of urlChecks) {
      if (url.includes(c.p)) {
        score += c.w;
        reasons.push(`url:${c.p}`);
      }
    }

    const text = getPageText(doc);

    // Strong receipt/confirmation keywords
    const strongTextSignals = [
      'thank you for your order',
      'thanks for your order',
      'order confirmed',
      'order confirmation',
      'your order is confirmed',
      'your order has been placed',
      'order number',
      'confirmation number',
      'receipt',
      'payment received',
      'we\'ve received your order',
      'purchase complete',
      'transaction complete'
    ];

    let hasStrongText = false;
    for (const k of strongTextSignals) {
      if (text.includes(k)) {
        score += 0.30;
        reasons.push(`text:${k}`);
        hasStrongText = true;
        break;
      }
    }

    // Mild signals (helpful but not decisive)
    const mildSignals = ['email sent', 'sent to your email', 'print receipt', 'view receipt', 'download receipt'];
    let hasMildText = false;
    for (const k of mildSignals) {
      if (text.includes(k)) {
        score += 0.10;
        reasons.push(`text:${k}`);
        hasMildText = true;
        break;
      }
    }

    // Look for "order number" patterns
    let hasOrderIdPattern = false;
    try {
      // keep it broad, avoid false positives by requiring a label
      const orderIdRegex = /(order|confirmation)\s*(number|no\.|#)\s*[:#]?\s*([a-z0-9\-]{5,})/i;
      const m = (getPageText(doc) || '').match(orderIdRegex);
      if (m && m[3]) {
        score += 0.22;
        reasons.push('order-id:pattern');
        hasOrderIdPattern = true;
      }
    } catch { /* ignore */ }

    // JSON-LD schema hints (Order / Invoice / Receipt-ish)
    let hasJsonLdOrder = false;
    try {
      const scripts = Array.from(doc?.querySelectorAll?.('script[type="application/ld+json"]') || []);
      for (const s of scripts) {
        try {
          const json = JSON.parse(s.textContent || '{}');
          const items = Array.isArray(json) ? json : [json];
          for (const it of items) {
            const t = safeLower(it?.['@type']);
            if (t && (t.includes('order') || t.includes('invoice') || t.includes('payment'))) {
              score += 0.22;
              reasons.push(`schema:${t || 'order-like'}`);
              hasJsonLdOrder = true;
              throw new Error('__break__'); // cheap break out
            }
          }
        } catch (e) {
          if (String(e?.message) === '__break__') throw e;
        }
      }
    } catch (e) {
      // swallow parse errors; ignore "__break__" thrown above via outer catch
      if (String(e?.message) !== '__break__') { /* ignore */ }
      else { /* intentionally stopped */ }
    }

    // Cap score
    if (score > 1) score = 1;
    if (score < 0) score = 0;

    // Thresholding: be conservative to avoid “success page” false positives
    const baseThreshold = 0.55;
    const strongThreshold = 0.75;

    const hasStrongReceiptSignal = !!(hasStrongText || hasOrderIdPattern || hasJsonLdOrder);

    let isPurchase = false;
    if (score >= strongThreshold) {
      isPurchase = true;
    } else if (score >= baseThreshold) {
      // require at least one strong receipt signal to reduce false positives
      isPurchase = hasStrongReceiptSignal;
    } else {
      isPurchase = false;
    }

    return {
      isPurchase,
      score: Number(score.toFixed(3)),
      reasons,
      isPurchaseByScore: score >= baseThreshold,
      hasStrongReceiptSignal
    };
  }

  // Export for Node-style requires and also attach to the root (window/global)
  try {
    if (typeof module !== 'undefined' && module.exports) {
      module.exports = detectPurchasePage;
    }
  } catch (e) { /* ignore */ }
  try {
    if (root) root.detectPurchasePage = detectPurchasePage;
  } catch (e) { /* ignore */ }
})(typeof window !== 'undefined' ? window : global);