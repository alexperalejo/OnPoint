/*
  detect-core.js
  A small portable detection function that returns { isCheckout, score, reasons }.
  Exposes as module.exports for Node (tests) and attaches to window for browser content script.
*/
(function (root) {
  function detectCheckoutPage(doc) {
    doc = doc || (typeof document !== 'undefined' ? document : null);
    const reasons = [];
    let score = 0;
    const url = (typeof location !== 'undefined' && location.href ? location.href : (doc && doc.location && doc.location.href) || '').toLowerCase();

    // URL heuristics (broadened)
    const urlChecks = [
      { p: 'checkout', w: 0.28 },
      { p: '/cart', w: 0.06 },
      { p: 'payment', w: 0.14 },
      { p: 'order', w: 0.05 },
      { p: 'purchase', w: 0.05 },
      { p: 'basket', w: 0.05 },
      { p: 'confirm', w: 0.03 },
      { p: 'review', w: 0.01 },
      { p: 'pay', w: 0.06 }
    ];
    urlChecks.forEach(c => { if (url.includes(c.p)) { score += c.w; reasons.push(`url:${c.p}`); } });


    const bodyText = (doc && doc.body && doc.body.innerText || '').toLowerCase();
    // Expanded keywords for button labels and headings
    const keywords = [
      'place order', 'place your order', 'complete purchase', 'pay now', 'buy now',
      'proceed to checkout', 'continue to payment', 'continue to checkout', 'complete order',
      'confirm order', 'review and place order', 'review order', 'order summary', 'checkout'
    ];
    for (const k of keywords) {
      if (bodyText.includes(k)) { score += 0.16; reasons.push(`text:${k}`); break; }
    }

    // Detect button text that implies payment/checkout
    try {
      const btnTexts = Array.from((doc || document).querySelectorAll('button,input[type="button"],input[type="submit"],a'))
        .map(n => (n.innerText || n.value || (n.getAttribute && n.getAttribute('aria-label')) || '').toLowerCase())
        .filter(Boolean);
      for (const t of btnTexts) {
        if (/^(pay|pay now|place order|place your order|checkout|confirm order|complete purchase|complete order|buy now)/i.test(t)) { score += 0.18; reasons.push('cta:button'); break; }
      }
    } catch (e) {}

  // Detect payment fields
    const paymentFieldSelectors = [
      'input[name*=card]',
      'input[id*=card]',
      'input[name*=cc-]',
      'input[id*=cc-]',
      'input[name*=credit]',
      'input[id*=credit]',
      'input[name*=cardnumber]',
      'input[id*=cardnumber]',
      'input[autocomplete*=cc-number]',
      'input[name*=expiry]',
      'input[name*=cvv]',
      'input[name*=cvc]'
    ];
    let hasPaymentField = false
    if (doc) {
      for (const sel of paymentFieldSelectors) {
        try {
          if (doc.querySelector && doc.querySelector(sel)) { score += 0.25; reasons.push('payment-field'); hasPaymentField = true; break; }
        } catch (e) { }
      }
    }

    // Look for forms with address-like fields (include selects and textareas)
    const addrFields = ['address', 'street', 'zip', 'postal', 'city', 'state', 'country', 'province'];
    let foundAddr = 0;
    if (doc) {
      addrFields.forEach(k => {
        try {
          if (doc.querySelector(`input[name*="${k}"]`) || doc.querySelector(`input[id*="${k}"]`) || doc.querySelector(`select[name*="${k}"]`) || doc.querySelector(`textarea[name*="${k}"]`)) foundAddr++;
        } catch (e) { }
      });
    }
  if (foundAddr >= 2) { score += 0.06; reasons.push('address-fields'); }

    // Structural cues: classes / ids, ARIA roles, and schema.org markers
    const structural = ['checkout', 'order', 'payment', 'cart', 'order-summary', 'shipping'];
    if (doc) {
      for (const s of structural) {
        try { if (doc.querySelector(`[class*="${s}"]`) || doc.querySelector(`[id*="${s}"]`)) { score += 0.02; reasons.push(`struct:${s}`); } } catch (e) { }
      }
      // ARIA/roles
      try {
        if (doc.querySelector('[role*=form]') || doc.querySelector('[role*=main]')) { score += 0.03; reasons.push('role:form/main'); }
      } catch (e) {}
      // schema.org JSON-LD checks for Order/Checkout
      try {
        const scripts = Array.from(doc.querySelectorAll('script[type="application/ld+json"]'));
        let hasJsonLd = false
        for (const s of scripts) {
          try {
            const json = JSON.parse(s.textContent || '{}');
            const types = [];
            if (Array.isArray(json)) json.forEach(i => i['@type'] && types.push(i['@type']));
            else if (json['@type']) types.push(json['@type']);
            for (const t of types) {
              if (/order|checkout/i.test(t)) { score += 0.18; reasons.push('schema:ld+json'); break; }
            }
          } catch (e) { }
        }
      } catch (e) {}
    }

    // Platform signatures (simple examples)
    try {
      if (doc && (doc.querySelector('form[action*="/checkout"]') || url.includes('shopify') || url.includes('woocommerce') || url.includes('magento') || url.includes('bigcommerce'))) {
        score += 0.05; reasons.push('platform:shop-like');
      }
    } catch (e) { }

    // Detect common third-party payment provider iframes (Stripe, Braintree, PayPal, Square, Adyen, Authorize.net)
    try {
      if (doc) {
        const iframes = Array.from(doc.querySelectorAll('iframe')) || [];
        const providers = ['stripe', 'braintree', 'paypal', 'square', 'adyen', 'authorize', 'checkout', 'pay'];
        let hasPaymentIframe = false
        outer: for (const fr of iframes) {
          const src = (fr.src || '').toLowerCase();
          const name = (fr.name || '').toLowerCase();
          const title = (fr.title || '').toLowerCase();
          for (const p of providers) {
            if ((src && src.includes(p)) || (name && name.includes(p)) || (title && title.includes(p))) {
              score += 0.22; reasons.push(`payment-iframe:${p}`); hasPaymentIframe = true; break outer;
            }
          }
        }
      }
    } catch (e) { }

    // Detect presence of currency/total indicators near numbers (e.g., $12.34, 12.34 USD)
    try {
      if (doc) {
        const text = (doc && doc.body && doc.body.innerText || '').toLowerCase();
  // common currency symbols and patterns (simpler, broader regex)
  const moneyRegex = /[$€£¥₹]?\s?\d{1,3}(?:[\,\.]\d{3})*(?:[\,\.]\d{2})?\s?(usd|eur|gbp|cad|aud)?/i;
        let hasOrderTotal = false
        if (moneyRegex.test(text)) {
          // only add if 'total' or 'order' or 'subtotal' appears nearby
          const nearby = /total|subtotal|order total|amount due|amount payable|order summary|grand total/i;
          if (nearby.test(text)) { score += 0.14; reasons.push('order-total'); hasOrderTotal = true; }
        }
      }
    } catch (e) {}

    if (score > 1) score = 1;

    // Post-check rule to reduce false positives on CTA-heavy landing pages:
    // Default base threshold we treat as a candidate is 0.7. If score >= 0.8 we accept.
    // If score is in [0.7, 0.8) require a "strong payment" signal (payment field, order total, JSON-LD checkout/order, or payment iframe).
    const baseThreshold = 0.7
    const strongThreshold = 0.8

    // derive booleans if not set earlier
    hasJsonLd = typeof hasJsonLd !== 'undefined' ? hasJsonLd : (reasons.indexOf('schema:ld+json') !== -1)
    hasPaymentIframe = typeof hasPaymentIframe !== 'undefined' ? hasPaymentIframe : (reasons.find(r => r.indexOf('payment-iframe:') === 0) !== undefined)
    hasPaymentField = typeof hasPaymentField !== 'undefined' ? hasPaymentField : (reasons.indexOf('payment-field') !== -1)
    hasOrderTotal = typeof hasOrderTotal !== 'undefined' ? hasOrderTotal : (reasons.indexOf('order-total') !== -1)

    // Accept if clearly above strong threshold.
    // If between baseThreshold and strongThreshold, now require a strong payment signal
    // (field/iframe/JSON-LD) instead of any weak signal like 'order total'.
    const hasPaymentSignal = hasPaymentField || hasOrderTotal || hasJsonLd || hasPaymentIframe
    const hasStrongPaymentSignal = hasPaymentField || hasPaymentIframe || hasJsonLd

    let isCheckout = false
    if (score >= strongThreshold) {
      isCheckout = true
    } else if (score >= baseThreshold) {
      // between 0.7 and 0.8: only accept if strong signals exist
      isCheckout = hasStrongPaymentSignal
    } else {
      isCheckout = false
    }

    // Also expose the raw threshold pass and payment-signal flag so callers (UI/tests)
    // can display both the score-based pass and the detector's post-check acceptance.
    const isCheckoutByScore = score >= baseThreshold

    return {
      isCheckout, // final decision after post-check rules (keeps existing behavior)
      score: Number(score.toFixed(3)),
      reasons,
      isCheckoutByScore,
      hasPaymentSignal
    };
  }

  // Export for Node tests and attach to window for content script
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = detectCheckoutPage;
  } else if (root) {
    root.detectCheckoutPage = detectCheckoutPage;
  }
})(typeof window !== 'undefined' ? window : global);
