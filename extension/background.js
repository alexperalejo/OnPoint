// Minimal service worker (background) for future message routing
// Right now it is intentionally light — most logic lives in the content script and popup.

chrome.runtime.onInstalled.addListener(() => {
  console.log('Checkout Detector extension installed');
});

// Relay from popup to content script if needed later
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // no-op for now, placeholder for future
});
