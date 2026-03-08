// Minimal service worker (background) for future message routing
// Right now it is intentionally light — most logic lives in the content script and popup.

chrome.runtime.onInstalled.addListener(() => {
  console.log('Checkout Detector extension installed');
});

// Relay from popup to content script if needed later
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // no-op for now, placeholder for future
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