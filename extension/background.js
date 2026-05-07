// Minimal service worker (background) for future message routing
// Right now it is intentionally light — most logic lives in the content script and popup.

//helper function to check preferences before opening popup
async function getNotificationPrefs() {
  const data = await new Promise(resolve => 
    chrome.storage.local.get(['notificationPrefs'], resolve)
  );
  return data?.notificationPrefs || {
    checkoutReminders: true,
    newCardSuggestions: true,
    rewardAlerts: true
  };
}

chrome.runtime.onInstalled.addListener(() => {
  console.log('Checkout Detector extension installed');
});

console.log("[bg] service worker boot", new Date().toISOString());
// In-memory cache of recent checkout totals keyed by host
const CHECKOUT_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours
const checkoutCache = new Map(); // host -> { amount, currency, raw, url, host, ts }

// Detector key TTL and cleanup
const DETECTOR_TTL_MS = 15 * 60 * 1000; // 15 minutes

function setDetectorForTab(tabId, kind) {
  try {
    const storageKey = `detector_${tabId}`;
    const expiryKey = `detector_expiry_${tabId}`;
    const obj = {};
    obj[storageKey] = kind;
    obj[expiryKey] = Date.now() + DETECTOR_TTL_MS;
    chrome.storage.local.set(obj);
  } catch (e) { /* ignore */ }
}

function cleanupDetectorKeys() {
  try {
    chrome.storage.local.get(null, (items) => {
      if (!items) return;
      const now = Date.now();
      const toRemove = [];
      for (const key in items) {
        if (!Object.prototype.hasOwnProperty.call(items, key)) continue;
        if (!key.startsWith('detector_')) continue;
        // skip expiry keys
        if (key.startsWith('detector_expiry_')) continue;
        const parts = key.split('_');
        const tabId = parts.slice(1).join('_');
        const expiryKey = `detector_expiry_${tabId}`;
        const expiry = items[expiryKey];
        if (!expiry || now > expiry) {
          toRemove.push(key);
          toRemove.push(expiryKey);
        }
      }
      if (toRemove.length) {
        try { chrome.storage.local.remove(toRemove); } catch (e) { }
      }
    });
  } catch (e) { /* ignore */ }
}

// Run cleanup occasionally (best-effort; service worker may not persist long-lived timers)
try { setInterval(cleanupDetectorKeys, 5 * 60 * 1000); } catch (e) { }

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
        // Mark this tab as a checkout detector so the popup shows the checkout UI
        try {
          const tabId = sender && sender.tab && sender.tab.id;
          if (tabId) setDetectorForTab(tabId, 'checkout');
        } catch (e) { /* ignore */ }
      }
    } catch (e) { /* ignore */ }
    return;
  }

  if (message.type === 'purchaseDetected') {
    const tabId = sender?.tab?.id;
    // Show badge immediately so user knows something happened
    if (tabId) {
      chrome.action.setBadgeText({ text: "✓", tabId });
      chrome.action.setBadgeBackgroundColor({ color: "#10b981", tabId });
    }

    (async () => {
      try {
        const purchase = message.purchase;
        const host = purchase?.host || message.host || (sender && sender.url && new URL(sender.url).hostname) || '';

        // Mark tab as purchase as soon as any confirmation signal is detected.
        // Linking to checkout may still fail later, but popup should not get stuck in checkout mode.
        try { if (tabId) setDetectorForTab(tabId, 'purchase'); } catch (e) { /* ignore */ }

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

          // Write candidate BEFORE opening popup so REQUEST_CHECKOUT_SNAPSHOT finds it
          await new Promise((resolve) => { try { chrome.storage.local.set({ purchaseCandidate: candidate }, resolve); } catch { resolve(); } });

          // Record spending as soon as purchase is detected — don't wait for popup confirmation.
          // This ensures spending_daily_totals / spending_monthly_totals are always up to date
          // even if the user dismisses PurchaseVerification without confirming a card.
          if (checkout.amount > 0) {
            try {
              const now = new Date();
              const pad = n => String(n).padStart(2, '0');
              const dateKey = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
              const monthKey = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
              const spendData = await new Promise((resolve) =>
                chrome.storage.local.get(['spendingLimits', 'spending_daily_totals', 'spending_monthly_totals', 'spending_dedupe'], resolve)
              );
              // Deduplicate: skip if we already recorded this checkout (same host + ts)
              const dedupeKey = `${host}|${checkout.ts}`;
              const dedupe = Array.isArray(spendData.spending_dedupe) ? spendData.spending_dedupe : [];
              if (!dedupe.includes(dedupeKey)) {
                const dailyTotals = spendData.spending_daily_totals || {};
                const monthlyTotals = spendData.spending_monthly_totals || {};
                const newDaily = Number(((dailyTotals[dateKey] || 0) + checkout.amount).toFixed(2));
                const newMonthly = Number(((monthlyTotals[monthKey] || 0) + checkout.amount).toFixed(2));
                await new Promise((resolve) => chrome.storage.local.set({
                  spending_daily_totals: { ...dailyTotals, [dateKey]: newDaily },
                  spending_monthly_totals: { ...monthlyTotals, [monthKey]: newMonthly },
                  spending_dedupe: [...dedupe, dedupeKey].slice(-200),
                }, resolve));

                // Fire notification if a limit is now exceeded
                const limits = spendData.spendingLimits || {};
                const warnings = [];
                if (limits.dailyEnabled && Number(limits.daily) > 0 && newDaily > Number(limits.daily)) {
                  warnings.push(`Daily limit $${limits.daily} exceeded — $${newDaily.toFixed(2)} spent today.`);
                }
                if (limits.monthlyEnabled && Number(limits.monthly) > 0 && newMonthly > Number(limits.monthly)) {
                  warnings.push(`Monthly limit $${limits.monthly} exceeded — $${newMonthly.toFixed(2)} spent this month.`);
                }
                if (warnings.length > 0) {
                  chrome.notifications.create({
                    type: 'basic',
                    iconUrl: 'icons/Onpoint48.png',
                    title: 'OnPoint — Spending Limit Exceeded',
                    message: warnings.join(' '),
                  });
                }
              }
            } catch (e) { console.warn('[bg] spending tracking failed', e); }
          }

          // attempt to fetch recommendation if endpoint configured
          let rec = null;
          try {
            const cfg = await new Promise((resolve) => chrome.storage.local.get(['recommendationEndpoint'], resolve));
            const endpoint = (cfg && cfg.recommendationEndpoint) || null;
            if (endpoint) rec = await fetchRecommendation(endpoint, { checkout: candidate.checkout, host, orderId: candidate.orderId });
          } catch (e) { /* ignore */ }

          // Persist recommendation inside purchaseCandidate so REQUEST_CHECKOUT_SNAPSHOT
          // returns it even when the user dismissed the checkout popup before confirming.
          // Flatten rec.card to a top-level shape so PurchaseVerification can read
          // image_url and name directly without knowing the API response structure.
          if (rec) {
            candidate.recommendation = rec.card
              ? { ...rec.card, id: String(rec.card.cardId), reason: rec.reason }
              : rec;
            await new Promise((resolve) => { try { chrome.storage.local.set({ purchaseCandidate: candidate }, resolve); } catch { resolve(); } });
          }

          // send UI message to the originating tab (or active tab)
          const uiMsg = { type: 'showRecommendation', candidate, recommendation: rec };
          sendToTab(tabId, uiMsg);
        } else {
          // no linked checkout found — store a pending marker for short retry window
          await new Promise((resolve) => { try { chrome.storage.local.set({ pendingPurchase: { host, url: purchase.url || (sender && sender.url) || '', ts: Date.now() } }, resolve); } catch { resolve(); } });
        }

        // Open popup after storage is ready so REQUEST_CHECKOUT_SNAPSHOT has data to return
        chrome.action.openPopup().catch(() => {});
      } catch (e) { console.warn('background purchase handling failed', e); }
    })();

    return true;

  } // end purchaseDetected

  if (message.type === 'REQUEST_CHECKOUT_SNAPSHOT') {
    try {
      chrome.storage.local.get(['purchaseCandidate', 'checkoutTotal', 'pendingPurchase', 'lastPurchaseContent'], (data) => {
        try {
          const candidate = data?.purchaseCandidate || null;
          const checkout = data?.checkoutTotal || null;
          const pending = data?.pendingPurchase || null;
          const lastPurchase = data?.lastPurchaseContent || null;

          if (candidate) {
            sendResponse({
              ok: true,
              snapshot: {
                merchantId: candidate.host || null,
                merchantName: candidate.host || null,
                total: candidate.checkout?.amount ?? null,
                currency: candidate.checkout?.currency || '$',
                ts: candidate.ts || Date.now(),
                orderId: candidate.orderId || null,
                tags: ['purchase-candidate'],
                checkout: candidate.checkout || null,
                detection: candidate.detection || null,
              },
              recommended: candidate.recommendation || null,
            });
            return;
          }

          if (checkout) {
            sendResponse({
              ok: true,
              snapshot: {
                merchantId: checkout.host || null,
                merchantName: checkout.host || null,
                total: checkout.amount ?? null,
                currency: checkout.currency || '$',
                ts: checkout.ts || Date.now(),
                tags: ['checkout-total'],
                checkout,
              },
            });
            return;
          }

          // Fallback: purchase was detected but checkout wasn't captured — still show the UI
          // so the user can confirm which card they used (amount will show as unavailable).
          if (pending || lastPurchase) {
            const host = pending?.host || (lastPurchase?.url ? (() => { try { return new URL(lastPurchase.url).hostname; } catch { return null; } })() : null);
            sendResponse({
              ok: true,
              snapshot: {
                merchantId: host || null,
                merchantName: host || null,
                total: null,
                currency: '$',
                ts: pending?.ts || lastPurchase?.capturedAt || Date.now(),
                tags: ['pending-purchase'],
                url: pending?.url || lastPurchase?.url || null,
                detection: lastPurchase?.detection || null,
              },
            });
            return;
          }

          sendResponse({ ok: true, snapshot: null });
        } catch (e) {
          try { sendResponse({ ok: false, snapshot: null }); } catch (er) { }
        }
      });
      return true;
    } catch (e) {
      try { sendResponse({ ok: false, snapshot: null }); } catch (er) { }
      return false;
    }
  }

  // Backwards-compatible handler for UI requests that use { action: 'getDetector', tabId }
  if (message.action === 'getDetector') {
    // Keep the message channel open for an async response
    try {
      const tabId = message.tabId;
      const storageKey = `detector_${tabId}`;
      const expiryKey = `detector_expiry_${tabId}`;
      // Read from storage and reply with the detector value (if any), respecting expiry
      chrome.storage.local.get([storageKey, expiryKey], (res) => {
        try {
          const val = res && res[storageKey];
          const expiry = res && res[expiryKey];
          if (!expiry || Date.now() > expiry) {
            // expired — remove keys and report null
            try { chrome.storage.local.remove([storageKey, expiryKey]); } catch (e) { }
            sendResponse({ detector: null });
            return;
          }
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

// When a tab updates, try to inject purchase detector on Amazon thank you pages
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') return;
  if (!tab.url) return;
  
  if (tab.url.includes('amazon.com') && tab.url.includes('thankyou')) {
    chrome.scripting.executeScript({
      target: { tabId },
      files: [
        'content/purchase-detect-core.js',
        'content/purchase.js'
      ]
    }).catch(() => { /* ignore */ });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "checkoutDetected") {
    (async () => {
      const prefs = await getNotificationPrefs();

      // Only show badge if reward alerts are on
      if (prefs.rewardAlerts) {
        chrome.action.setBadgeText({ text: "!", tabId: sender.tab.id });
        chrome.action.setBadgeBackgroundColor({ color: "#3b82f6", tabId: sender.tab.id });
      }

      // Only open popup if checkout reminders are on
      if (prefs.checkoutReminders) {
        chrome.action.openPopup().catch(() => {});
      }
    })();
  }

  if (message.type === 'showSpendingWarning') {
    try {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/Onpoint48.png',
        title: 'OnPoint — Spending Limit Exceeded',
        message: message.message || 'You have exceeded a spending limit.',
      });
    } catch (e) {
      console.warn('[bg] Could not create spending warning notification', e);
    }
  }
});