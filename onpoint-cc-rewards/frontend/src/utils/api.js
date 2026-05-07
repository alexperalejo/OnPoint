const DEFAULT_API_BASE_URL = 'https://onpoint-api-s6ce.onrender.com';

export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL).replace(/\/+$/, '');

export function apiUrl(path = '') {
  const normalizedPath = String(path).startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

export function assetUrl(path = '') {
  const normalizedPath = String(path).replace(/^\/+/, '');
  return `${API_BASE_URL}/${normalizedPath}`;
}

// In the extension popup, card images are bundled into extension/dist/ and should
// be served from the local extension package via chrome.runtime.getURL rather than
// fetched from the remote API server (which may not serve static assets).
export function extensionImageUrl(path = '') {
  const normalizedPath = String(path).replace(/^\/+/, '');
  if (typeof chrome !== 'undefined' && chrome.runtime?.getURL) {
    return chrome.runtime.getURL(normalizedPath);
  }
  return assetUrl(normalizedPath);
}