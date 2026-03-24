/* global chrome */
import React, { useEffect, useState, useRef } from 'react';
import { CardRecommendation } from "../CardRecommendation/CardRecommendation";
import { useChromeStorageSync } from "use-chrome-storage";
import './PurchaseVerification.css';

const SAVINGS_TOTAL_KEY = 'savings_all_time_total';
const SAVINGS_DEDUPE_KEY = 'savings_processed_purchase_keys';
const SAVINGS_MONTHLY_KEY = 'monthlySavings';

function toNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^\d.-]/g, '');
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function hasPurchaseDetectorYes(snapshot) {
  const direct = snapshot?.purchaseDetector;
  if (direct === true) return true;
  if (typeof direct === 'string' && direct.toLowerCase() === 'yes') return true;

  const detection = snapshot?.detection;
  if (detection === true) return true;
  if (typeof detection === 'string' && detection.toLowerCase() === 'yes') return true;
  if (detection && detection.isPurchase === true) return true;
  if (typeof detection?.isPurchase === 'string' && detection.isPurchase.toLowerCase() === 'yes') return true;

  return false;
}

function getCardRate(card) {
  if (!card || typeof card !== 'object') return 0;

  const directRate = toNumber(card.rate || card.cashbackRate || card.rewardRate);
  if (directRate > 0) return directRate / (directRate > 1 ? 100 : 1);

  if (Array.isArray(card.rewards) && card.rewards.length) {
    const allRate = card.rewards.find((reward) => String(reward?.category || '').toLowerCase() === 'all');
    const candidate = allRate || card.rewards[0];
    const rewardRate = toNumber(candidate?.rate);
    if (rewardRate > 0) return rewardRate / (rewardRate > 1 ? 100 : 1);
  }

  if (Array.isArray(card.attributes) && card.attributes.length) {
    const allAttr = card.attributes.find((attribute) => String(attribute?.type || '').toLowerCase() === 'all');
    const candidate = allAttr || card.attributes[0];
    const attrRate = toNumber(candidate?.multiplier || candidate?.points || candidate?.rate);
    if (attrRate > 0) return attrRate / (attrRate > 1 ? 100 : 1);
  }

  return 0;
}

function computeRewardValue(amount, selectedCard) {
  const purchaseAmount = toNumber(amount);
  if (purchaseAmount <= 0) return 0;

  const points = toNumber(selectedCard?.rewardPoints);
  const pointValue = toNumber(selectedCard?.pointValue || selectedCard?.pointToDollar || selectedCard?.pointToCashValue);
  if (points > 0 && pointValue > 0) {
    return points * pointValue;
  }
  if (points > 0 && pointValue === 0 && Number.isFinite(points)) {
    return points;
  }

  const rate = getCardRate(selectedCard);
  if (rate <= 0) return 0;
  return purchaseAmount * rate;
}

function buildMonthKeyFromTimestamp(timestamp) {
  const numericTs = toNumber(timestamp);
  const parsedDate = new Date(numericTs || Date.now());
  const safeDate = Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
  const year = safeDate.getFullYear();
  const month = String(safeDate.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function buildPurchaseFingerprint(snapshot, amount, selectedCard) {
  const pageUrl = String(snapshot?.url || snapshot?.checkout?.url || snapshot?.merchantId || 'unknown-url');
  const numericAmount = toNumber(amount).toFixed(2);
  const cardRef = String(selectedCard?.id || selectedCard?.name || selectedCard?.cardId || 'unknown-card');
  const orderRef = String(snapshot?.orderId || snapshot?.checkout?.orderId || '');
  return orderRef
    ? `${pageUrl}|${numericAmount}|${cardRef}|${orderRef}`
    : `${pageUrl}|${numericAmount}|${cardRef}`;
}

async function applyAllTimeSavings(snapshot, selectedCard) {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) return;
  if (!hasPurchaseDetectorYes(snapshot)) return;

  const amount = toNumber(snapshot?.total || snapshot?.checkout?.amount);
  if (amount <= 0) return;

  const rewardValue = computeRewardValue(amount, selectedCard);
  if (rewardValue <= 0) return;

  const dedupeKey = buildPurchaseFingerprint(snapshot, amount, selectedCard);
  const data = await new Promise((resolve) => {
    chrome.storage.local.get([SAVINGS_TOTAL_KEY, SAVINGS_DEDUPE_KEY, SAVINGS_MONTHLY_KEY], resolve);
  });

  const processed = Array.isArray(data?.[SAVINGS_DEDUPE_KEY]) ? data[SAVINGS_DEDUPE_KEY] : [];
  if (processed.includes(dedupeKey)) return;

  const currentTotal = toNumber(data?.[SAVINGS_TOTAL_KEY]);
  const nextTotal = Number((currentTotal + rewardValue).toFixed(2));
  const currentMonthlySavings = data?.[SAVINGS_MONTHLY_KEY] && typeof data[SAVINGS_MONTHLY_KEY] === 'object'
    ? data[SAVINGS_MONTHLY_KEY]
    : {};
  const monthKey = buildMonthKeyFromTimestamp(snapshot?.ts || snapshot?.checkout?.ts || Date.now());
  const currentMonthTotal = toNumber(currentMonthlySavings[monthKey]);
  const nextMonthlySavings = {
    ...currentMonthlySavings,
    [monthKey]: Number((currentMonthTotal + rewardValue).toFixed(2)),
  };
  const nextProcessed = [...processed, dedupeKey].slice(-200);

  await new Promise((resolve) => {
    chrome.storage.local.set(
      {
        [SAVINGS_TOTAL_KEY]: nextTotal,
        [SAVINGS_DEDUPE_KEY]: nextProcessed,
        [SAVINGS_MONTHLY_KEY]: nextMonthlySavings,
      },
      resolve
    );
  });
}

export default function PurchaseVerification({ pageSnapshot, onSaved }) {
  const [_savedCards] = useChromeStorageSync('cardinfo');
  const [loading, setLoading] = useState(true);
  const [snapshot, setSnapshot] = useState(null);
  const [error, setError] = useState(null);
  const [showRecommendation, setShowRecommendation] = useState(false);
  const [recommendedCard, setRecommendedCard] = useState(null);
  const refSnapshot = useRef(null);
  const [capturedAt, setCapturedAt] = useState(null);

  function handleClosePopup() {
    setShowRecommendation(false);
    try {
      window.close();
    } catch {
      // Ignore when not running as an extension popup.
    }
  }

  useEffect(() => {
    let mounted = true;

    async function requestSnapshot() {
      setLoading(true);

      if (pageSnapshot) {
        setSnapshot(pageSnapshot);
        refSnapshot.current = pageSnapshot;
        setCapturedAt(new Date(pageSnapshot.ts || Date.now()).toLocaleString());
        setRecommendedCard(pageSnapshot.recommended || null);
        setLoading(false);
        setShowRecommendation(false);
        return;
      }

      // Try chrome.runtime first. Rely on chrome.runtime.lastError in the callback
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({ type: 'REQUEST_CHECKOUT_SNAPSHOT' }, (resp) => {
          if (!mounted) return;

          if (chrome.runtime.lastError) {
            console.warn('REQUEST_CHECKOUT_SNAPSHOT sendMessage error:', chrome.runtime.lastError);
            // fallback to window.postMessage flow below
          } else if (resp && resp.snapshot) {
            setSnapshot(resp.snapshot);
            refSnapshot.current = resp.snapshot;
            setCapturedAt(new Date(resp.snapshot.ts || Date.now()).toLocaleString());
            setRecommendedCard(resp.recommended || resp.snapshot.recommended || null);
            setShowRecommendation(false);
            setLoading(false);
            return; // done
          } else {
            setError('No snapshot from extension');
            setLoading(false);
            return;
          }
        });
        // If sendMessage failed synchronously it will be handled in the callback via lastError.
        // Allow fallback to window.postMessage by continuing below after the callback.
      }

      // Fallback: window.postMessage (or used when sendMessage had lastError)
      const replyEvent = `ONPOINT_CHECKOUT_SNAPSHOT_REPLY_${Date.now()}`;
      const snapshotRef = refSnapshot;

      function handleMessage(event) {
        if (!mounted) return;
        if (!event.data || event.data.type !== replyEvent) return;
        const snap = event.data.snapshot;
        if (!snap) {
          setError('No snapshot received');
        } else {
          setSnapshot(snap);
          snapshotRef.current = snap;
          setCapturedAt(new Date(snap.ts || Date.now()).toLocaleString());
          setRecommendedCard(event.data.recommended || snap.recommended || null);
          setShowRecommendation(false);
        }
        setLoading(false);
        window.removeEventListener('message', handleMessage);
      }

      window.addEventListener('message', handleMessage);
      try {
        window.postMessage({ type: 'REQUEST_CHECKOUT_SNAPSHOT', replyEvent }, '*');
      } catch (e) {
        console.warn('window.postMessage failed:', e);
      }

      // Timeout fallback
      setTimeout(() => {
        try {
          window.removeEventListener('message', handleMessage);
          if (mounted && !snapshotRef.current) {
            setError('Snapshot request timed out');
            setLoading(false);
          }
        } catch (err) {
          setError(String(err));
          setLoading(false);
        }
      }, 2500);
    }

    requestSnapshot();

    return () => { mounted = false; };
  }, [pageSnapshot]);

  const isDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches || document.documentElement.classList.contains('dark');

  async function handleConfirmCard(card) {
    if (!snapshot) return;

    try {
      await applyAllTimeSavings(snapshot, card || recommendedCard);
    } catch (e) {
      console.warn('Failed to update all-time savings', e);
    }

    // Minimal record to send to backend
    const record = {
      idempotencyKey: `pv_${Date.now()}`,
      merchantId: snapshot.merchantId || null,
      total: snapshot.total || null,
      cardUsedId: card?.id || card,
      recommendedId: recommendedCard?.id || null,
      tags: snapshot.tags || [],
      ts: Date.now(),
    };

    try {
      await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
      });
      onSaved && onSaved(record);
    } catch (e) {
      console.warn('Failed to save purchase verification', e);
    }
    setShowRecommendation(false);
  }
  
  // UI rendering
  return (
    <div
      className="purchase-verification"
      style={{
        '--bg': isDark ? '#111827' : '#ffffff',
        '--text': isDark ? '#e2e8f0' : '#1f2937',
        '--title-color': isDark ? '#f8fafc' : '#0f172a',
        '--muted': isDark ? '#94a3b8' : '#666',
        '--secondary': isDark ? '#cbd5e1' : '#4b5563',
        '--error-text': isDark ? '#fca5a5' : '#dc2626',
        '--error-bg': isDark ? 'rgba(220, 38, 38, 0.08)' : '#fee',
        '--error-border': isDark ? '1px solid rgba(220, 38, 38, 0.18)' : 'none',
        '--footer': isDark ? '#64748b' : '#999',
        '--panel-bg': isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255, 255, 255, 0.68)',
        '--panel-border': isDark ? '2px solid rgba(255,255,255,0.06)' : '2px solid #6eaef7',
        '--panel-shadow': isDark ? '0 10px 24px rgba(2,6,23,0.6)' : '0 10px 24px rgba(37, 99, 235, 0.14)',
        '--meta-bg': isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255, 255, 255, 0.72)',
        '--meta-border': isDark ? '1px solid rgba(255,255,255,0.04)' : '1px solid rgba(110, 174, 247, 0.5)',
        '--card-border': isDark ? '3px solid rgba(255,255,255,0.06)' : '3px solid #d9a600',
        '--card-name': isDark ? '#e6b95a' : '#7c5d00',
        '--close-bg': isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.9)',
        '--close-hover-bg': isDark ? 'rgba(255,255,255,0.14)' : '#eef2ff',
        '--close-border': isDark ? '1px solid rgba(148,163,184,0.45)' : '1px solid rgba(107,112,128,0.6)',
        '--close-color': isDark ? '#e2e8f0' : '#4b5563',
        '--close-hover-color': isDark ? '#ffffff' : '#1f2937',
        '--secondary-bg': '#3b82f6',
        '--secondary-border': '#2563eb',
        '--secondary-color': '#ffffff',
        '--secondary-shadow': '0 3px 0 rgba(37, 99, 235, 0.35)',
        '--secondary-hover-bg': '#2563eb',
        '--dismiss-bg': 'transparent',
        '--dismiss-border': isDark ? '#f87171' : '#ef4444',
        '--dismiss-color': isDark ? '#f87171' : '#dc2626',
        '--dismiss-shadow': 'none',
        '--dismiss-hover-bg': isDark ? 'rgba(248, 113, 113, 0.12)' : 'rgba(239, 68, 68, 0.09)'
      }}
    >
      <div className="pv-panel">
        <div className="pv-header">
          <div>
            <p className="pv-eyebrow">Purchase verification</p>
            <h1 className="pv-title">Looks like you just completed a purchase!</h1>
          </div>
          <button
            type="button"
            className="pv-close"
            onClick={handleClosePopup}
            aria-label="Close purchase verification"
            title="Close"
          >
            ✕
          </button>
        </div>

        {loading && <p className="pv-muted">Requesting page snapshot…</p>}
        {error && <p className="pv-error">{error}</p>}

        {snapshot && (
          <>
            <div className="pv-meta">
              <span>{snapshot.merchantName || snapshot.merchantId || 'Unknown merchant'}</span>
              <span>{snapshot.total ? `$${snapshot.total}` : 'Amount unavailable'}</span>
            </div>
            <p className="pv-question">Which card did you end up using?</p>
            {capturedAt && <p className="pv-captured">Captured {capturedAt}</p>}
          </>
        )}

        {!showRecommendation && recommendedCard && (
          <button
            type="button"
            className="pv-card-choice"
            onClick={() => handleConfirmCard(recommendedCard)}
            aria-label={`Confirm ${recommendedCard.name}`}
          >
            <div className="pv-card-visual" style={{ background: recommendedCard.color || '#f3c316' }}>
              <img
                src={recommendedCard.image_url}
                alt={recommendedCard.name}
                className="pv-card-image"
              />
            </div>
            <div className="pv-card-name">{recommendedCard.name}</div>
          </button>
        )}

        {!showRecommendation && snapshot && (
          <div className="pv-actions">
            <button type="button" className="pv-secondary" onClick={() => setShowRecommendation(!!recommendedCard)}>
              Another Card
            </button>
            <button type="button" className="pv-dismiss" onClick={handleClosePopup}>
              Dismiss
            </button>
          </div>
        )}

        {showRecommendation && recommendedCard && (
          <div className="pv-recommendation-wrap">
            <CardRecommendation
              card={recommendedCard}
              onApply={(card) => handleConfirmCard(card)}
              onDismiss={() => setShowRecommendation(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
