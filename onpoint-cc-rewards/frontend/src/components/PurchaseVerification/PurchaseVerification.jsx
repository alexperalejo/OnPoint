/* global chrome */
import React, { useEffect, useState, useRef } from 'react';
import { CardRecommendation } from "../CardRecommendation/CardRecommendation";
import { getCardImage } from '../../utils/cardImageMap';
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
                src={getCardImage(recommendedCard.imageKey)}
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
