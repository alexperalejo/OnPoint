/* global chrome */
import React, { useEffect, useState, useRef } from 'react';
import { CardRecommendation } from "../CardRecommendation/CardRecommendation";
import { useChromeStorageSync } from "use-chrome-storage";
import './PurchaseVerification.css';

export default function PurchaseVerification({ pageSnapshot, onSaved }) {
  const [_savedCards] = useChromeStorageSync('cardinfo');
  const [loading, setLoading] = useState(true);
  const [snapshot, setSnapshot] = useState(null);
  const [error, setError] = useState(null);
  const [showRecommendation, setShowRecommendation] = useState(false);
  const [recommendedCard, setRecommendedCard] = useState(null);
  const refSnapshot = useRef(null);
  const [capturedAt, setCapturedAt] = useState(null);

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
        setShowRecommendation(!!pageSnapshot.recommended);
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
            setShowRecommendation(!!(resp.recommended || resp.snapshot.recommended));
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
          setShowRecommendation(!!(event.data.recommended || snap.recommended));
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
        '--bg': isDark ? '#0f172a' : '#ffffff',
        '--text': isDark ? '#e2e8f0' : '#1f2937',
        '--title-color': isDark ? '#f0f9ff' : '#0f172a',
        '--muted': isDark ? '#94a3b8' : '#666',
        '--secondary': isDark ? '#cbd5e1' : '#4b5563',
        '--error-text': isDark ? '#fca5a5' : '#dc2626',
        '--error-bg': isDark ? 'rgba(220, 38, 38, 0.1)' : '#fee',
        '--error-border': isDark ? '1px solid rgba(220, 38, 38, 0.2)' : 'none',
        '--footer': isDark ? '#64748b' : '#999'
      }}
    >
      <div className="pv-header">
        <div className="pv-icon">🧾</div>
        <h1 className="pv-title">Purchase Verification</h1>
      </div>

      {loading && <p className="pv-muted">Requesting page snapshot…</p>}
      {error && <p className="pv-error">{error}</p>}

      {snapshot && (
        <div className="pv-summary">
          <p>Merchant: <strong>{snapshot.merchantName || snapshot.merchantId || 'Unknown'}</strong></p>
          <p>Total: {snapshot.total ? `$${snapshot.total}` : '—'}</p>
          <p className="small">Captured at: {capturedAt || new Date().toLocaleString()}</p>
        </div>
      )}

      {showRecommendation && recommendedCard && (
        <CardRecommendation
          card={recommendedCard}
          onApply={(card) => handleConfirmCard(card)}
          onDismiss={() => setShowRecommendation(false)}
        />
      )}

      {!showRecommendation && snapshot && (
        <div className="pv-actions">
          <button className="pv-cta" onClick={() => setShowRecommendation(!!recommendedCard)}>Confirm Card</button>
          <button className="pv-secondary" onClick={() => { setShowRecommendation(false); }}>Dismiss</button>
        </div>
      )}

      <footer className="pv-footer">Local snapshot · Manifest V3</footer>
    </div>
  );
}
