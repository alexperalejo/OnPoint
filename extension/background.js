// Minimal service worker (background) for future message routing
// Right now it is intentionally light — most logic lives in the content script and popup.

chrome.runtime.onInstalled.addListener(() => {
  console.log('Checkout Detector extension installed');
});

// In-memory cache of recent checkout totals keyed by host
const CHECKOUT_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours
const checkoutCache = new Map(); // host -> { amount, currency, raw, url, host, ts }

function isRecent(ts, maxAge = CHECKOUT_TTL_MS) {
  return !!ts && (Date.now() - ts) <= maxAge;
}

async function fetchRecommendation(endpoint, payload) {
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.warn('recommendation fetch failed', e);
    return null;
  }
}

// Send a message to a tab (falls back to active tab)
function sendToTab(tabId, message) {
  if (tabId) {
    try { chrome.tabs.sendMessage(tabId, message); return; } catch (e) { }
  }
  // fallback: find active tab in last focused window
  chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
    if (tabs && tabs[0]) chrome.tabs.sendMessage(tabs[0].id, message);
  });
}

// Main message router
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.type) return;

  if (message.type === 'checkoutCaptured') {
    try {
      const c = message.checkout;
      if (c && c.host && typeof c.amount === 'number') {
        checkoutCache.set(c.host, c);
        // also persist as fallback
        try { chrome.storage.local.set({ checkoutTotal: c }); } catch (e) { }
      }
    } catch (e) { /* ignore */ }
    return;
  }

  if (message.type === 'purchaseDetected') {
    (async () => {
      try {
        const purchase = message.purchase;
        const host = purchase?.host || message.host || (sender && sender.url && new URL(sender.url).hostname) || '';

        // try in-memory cache first
        let checkout = host ? checkoutCache.get(host) : null;

        // fallback to storage
        if (!checkout) {
          try {
            const data = await new Promise((resolve) => chrome.storage.local.get(['checkoutTotal'], resolve));
            checkout = data?.checkoutTotal || null;
          } catch (e) { /* ignore */ }
        }

        // validate recency and host
        if (checkout && checkout.host && checkout.host === host && isRecent(checkout.ts)) {
          // create purchaseCandidate object
          const candidate = {
            id: purchase.id || `${Date.now()}_${Math.random().toString(16).slice(2)}`,
            ts: Date.now(),
            host,
            url: purchase.url || (sender && sender.url) || '',
            checkout: {
              amount: checkout.amount,
              currency: checkout.currency,
              raw: checkout.raw,
              url: checkout.url,
              ts: checkout.ts
            },
            orderId: purchase.orderId || null,
            detection: purchase.detection || null
          };

          try { chrome.storage.local.set({ purchaseCandidate: candidate }); } catch (e) { }

          // attempt to fetch recommendation if endpoint configured
          let rec = null;
          try {
            const cfg = await new Promise((resolve) => chrome.storage.local.get(['recommendationEndpoint'], resolve));
            const endpoint = (cfg && cfg.recommendationEndpoint) || null;
            if (endpoint) rec = await fetchRecommendation(endpoint, { checkout: candidate.checkout, host, orderId: candidate.orderId });
          } catch (e) { /* ignore */ }

          // send UI message to the originating tab (or active tab)
          const uiMsg = { type: 'showRecommendation', candidate, recommendation: rec };
          const tabId = sender && sender.tab && sender.tab.id;
          sendToTab(tabId, uiMsg);
        } else {
          // no linked checkout found — store a pending marker for short retry window
          try { chrome.storage.local.set({ pendingPurchase: { host, url: purchase.url || (sender && sender.url) || '', ts: Date.now() } }); } catch (e) { }
        }
      } catch (e) { console.warn('background purchase handling failed', e); }
    })();
    return true;
  }

  // Backwards-compatible handler for UI requests that use { action: 'getDetector', tabId }
  if (message.action === 'getDetector') {
    // Keep the message channel open for an async response
    try {
      const tabId = message.tabId;
      const storageKey = `detector_${tabId}`;
      // Read from storage and reply with the detector value (if any)
      chrome.storage.local.get([storageKey], (res) => {
        try {
          const val = res && res[storageKey];
          sendResponse({ detector: val || null });
        } catch (e) {
          // Best-effort: ensure we still respond
          try { sendResponse({ detector: null }); } catch (er) { }
        }
      });
      return true; // signal we'll call sendResponse asynchronously
    } catch (e) {
      try { sendResponse({ detector: null }); } catch (er) { }
      return false;
    }
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "checkoutDetected") {
        // Badge the icon so user knows a recommendation is ready
        chrome.action.setBadgeText({ text: "!", tabId: sender.tab.id });
        chrome.action.setBadgeBackgroundColor({ color: "#3b82f6", tabId: sender.tab.id });

        // Try to auto-open the popup
        chrome.action.openPopup().catch(() => {
            // openPopup() may fail without a user gesture — badge is the fallback
        });
    }
});