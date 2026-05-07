/* global chrome */
import React, { useEffect, useState, useRef } from 'react';
import { CardRecommendation } from "../CardRecommendation/CardRecommendation";
import { useChromeStorageSync } from "use-chrome-storage";
import { apiUrl, extensionImageUrl } from '../../utils/api';
import { useTranslation } from '../../utils/translation';
import './PurchaseVerification.css';

const SAVINGS_TOTAL_KEY = 'savings_all_time_total';
const SAVINGS_DEDUPE_KEY = 'savings_processed_purchase_keys';
const SAVINGS_MONTHLY_KEY = 'monthlySavings';
const SAVINGS_CARD_USAGE_KEY = 'savings_card_transaction_counts';
const SAVINGS_QUALIFYING_TOTAL_KEY = 'savings_qualifying_transaction_total';
const SAVINGS_MONTHLY_CARD_CONTRIBUTIONS_KEY = 'savings_monthly_card_contributions';
const SAVINGS_MONTHLY_CATEGORY_TOTALS_KEY = 'savings_monthly_category_totals';

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

  // rewardPoints is the multiplier/% rate from the backend (e.g., 6 = 6%, 1 = 1%).
  const rewardPoints = toNumber(selectedCard?.rewardPoints);
  if (rewardPoints > 0) {
    const pointValue = toNumber(selectedCard?.pointValue || selectedCard?.pointToDollar || selectedCard?.pointToCashValue);
    if (pointValue > 0) {
      // Points card with a known cents-per-point value
      const earnedPoints = rewardPoints <= 20 ? rewardPoints * purchaseAmount : rewardPoints;
      return earnedPoints * pointValue;
    }
    // Cashback card (or points card without cpp): rewardPoints is the % rate
    return purchaseAmount * (rewardPoints / 100);
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

function getCardUsageKey(selectedCard) {
  if (!selectedCard) return 'Unknown Card';
  if (typeof selectedCard === 'string') return selectedCard;
  return String(selectedCard.name || selectedCard.id || selectedCard.cardId || 'Unknown Card');
}

function normalizeRecommendationCategory(rawCategory) {
  const raw = String(rawCategory || '').trim().toLowerCase();
  if (!raw || raw === 'all') return 'General';
  if (raw.includes('travel')) return 'Travel';
  if (raw.includes('grocery')) return 'Groceries';
  if (raw.includes('dining')) return 'Dining';
  if (raw.includes('gas')) return 'Gas';
  if (raw.includes('drugstore')) return 'Drugstore';
  if (raw.includes('stream')) return 'Streaming';
  if (raw.includes('transit')) return 'Transit';
  if (raw.includes('entertain')) return 'Entertainment';

  return raw
    .split('_')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getRecommendationBreakdownEntries(snapshot, selectedCard) {
  // Reuse recommendation-style matching rules (url/tag/all) so category totals stay aligned with recommendation logic.
  const paymentInfo = {
    url: String(snapshot?.url || snapshot?.checkout?.url || ''),
    tags: Array.isArray(snapshot?.tags) ? snapshot.tags.map(tag => String(tag).toLowerCase()) : [],
  };

  const rawAttributes = Array.isArray(selectedCard?.attributes) ? selectedCard.attributes : [];
  const normalizedAttributes = rawAttributes.map((attribute) => ({
    type: String(attribute?.type || '').toLowerCase(),
    value: String(attribute?.value || attribute?.category || '').toLowerCase(),
    points: toNumber(attribute?.points ?? attribute?.multiplier ?? attribute?.rate),
  }));

  let points = 0;
  const breakdown = [];

  normalizedAttributes.forEach((attribute) => {
    if (!attribute.points || attribute.points <= 0) return;

    switch (attribute.type) {
      case 'url': {
        if (attribute.value && attribute.value === paymentInfo.url) {
          points += attribute.points;
          breakdown.push({ points: attribute.points, from: attribute.value });
        }
        break;
      }
      case 'tag': {
        if (attribute.value && paymentInfo.tags.includes(attribute.value)) {
          points += attribute.points;
          breakdown.push({ points: attribute.points, from: attribute.value });
        }
        break;
      }
      case 'all': {
        points += attribute.points;
        breakdown.push({ points: attribute.points, from: 'all' });
        break;
      }
      default:
        break;
    }
  });

  if (points <= 0 || !breakdown.length) {
    return [{ category: 'General', contribution: 1 }];
  }

  return breakdown.map((entry) => ({
    category: normalizeRecommendationCategory(entry.from),
    contribution: entry.points / points,
  }));
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

async function applyAllTimeSavings(snapshot, selectedCard, options = {}) {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) return;
  const wasUserConfirmed = options && options.userConfirmed === true;
  if (!wasUserConfirmed && !hasPurchaseDetectorYes(snapshot)) return;

  const amount = toNumber(snapshot?.total || snapshot?.checkout?.amount);
  if (amount <= 0) return;

  const rewardValue = computeRewardValue(amount, selectedCard);
  if (rewardValue <= 0) return;

  const dedupeKey = buildPurchaseFingerprint(snapshot, amount, selectedCard);
  const data = await new Promise((resolve) => {
    chrome.storage.local.get(
      [
        SAVINGS_TOTAL_KEY,
        SAVINGS_DEDUPE_KEY,
        SAVINGS_MONTHLY_KEY,
        SAVINGS_CARD_USAGE_KEY,
        SAVINGS_QUALIFYING_TOTAL_KEY,
        SAVINGS_MONTHLY_CARD_CONTRIBUTIONS_KEY,
        SAVINGS_MONTHLY_CATEGORY_TOTALS_KEY,
      ],
      resolve
    );
  });

  const processed = Array.isArray(data?.[SAVINGS_DEDUPE_KEY]) ? data[SAVINGS_DEDUPE_KEY] : [];
  if (processed.includes(dedupeKey)) return;

  const currentTotal = toNumber(data?.[SAVINGS_TOTAL_KEY]);
  const nextTotal = Number((currentTotal + rewardValue).toFixed(2));
  const currentMonthlySavings = data?.[SAVINGS_MONTHLY_KEY] && typeof data[SAVINGS_MONTHLY_KEY] === 'object'
    ? data[SAVINGS_MONTHLY_KEY]
    : {};
  const currentCardUsageCounts = data?.[SAVINGS_CARD_USAGE_KEY] && typeof data[SAVINGS_CARD_USAGE_KEY] === 'object'
    ? data[SAVINGS_CARD_USAGE_KEY]
    : {};
  const currentMonthlyCardContributions = data?.[SAVINGS_MONTHLY_CARD_CONTRIBUTIONS_KEY] && typeof data[SAVINGS_MONTHLY_CARD_CONTRIBUTIONS_KEY] === 'object'
    ? data[SAVINGS_MONTHLY_CARD_CONTRIBUTIONS_KEY]
    : {};
  const currentMonthlyCategoryTotals = data?.[SAVINGS_MONTHLY_CATEGORY_TOTALS_KEY] && typeof data[SAVINGS_MONTHLY_CATEGORY_TOTALS_KEY] === 'object'
    ? data[SAVINGS_MONTHLY_CATEGORY_TOTALS_KEY]
    : {};
  const currentQualifyingTotal = toNumber(data?.[SAVINGS_QUALIFYING_TOTAL_KEY]);
  const monthKey = buildMonthKeyFromTimestamp(snapshot?.ts || snapshot?.checkout?.ts || Date.now());
  const cardUsageKey = getCardUsageKey(selectedCard);
  const currentMonthTotal = toNumber(currentMonthlySavings[monthKey]);
  const currentCardCount = toNumber(currentCardUsageCounts[cardUsageKey]);
  const currentMonthCardContributions =
    currentMonthlyCardContributions[monthKey] && typeof currentMonthlyCardContributions[monthKey] === 'object'
      ? currentMonthlyCardContributions[monthKey]
      : {};
  const currentMonthCategoryTotals =
    currentMonthlyCategoryTotals[monthKey] && typeof currentMonthlyCategoryTotals[monthKey] === 'object'
      ? currentMonthlyCategoryTotals[monthKey]
      : {};
  const currentCardContributionRaw = currentMonthCardContributions[cardUsageKey];
  const currentCardContributionAmount =
    currentCardContributionRaw && typeof currentCardContributionRaw === 'object'
      ? toNumber(currentCardContributionRaw.amount)
      : toNumber(currentCardContributionRaw);
  const currentCardContributionIssuer =
    currentCardContributionRaw && typeof currentCardContributionRaw === 'object'
      ? String(currentCardContributionRaw.issuer || '')
      : '';
  const nextMonthlySavings = {
    ...currentMonthlySavings,
    [monthKey]: Number((currentMonthTotal + rewardValue).toFixed(2)),
  };
  const nextCardUsageCounts = {
    ...currentCardUsageCounts,
    [cardUsageKey]: Number((currentCardCount + 1).toFixed(0)),
  };
  const nextMonthlyCardContributions = {
    ...currentMonthlyCardContributions,
    [monthKey]: {
      ...currentMonthCardContributions,
      [cardUsageKey]: {
        amount: Number((currentCardContributionAmount + rewardValue).toFixed(2)),
        issuer: currentCardContributionIssuer || String(selectedCard?.issuer || ''),
      },
    },
  };

  const recommendationBreakdown = getRecommendationBreakdownEntries(snapshot, selectedCard);
  const nextMonthCategoryTotals = { ...currentMonthCategoryTotals };
  recommendationBreakdown.forEach((entry) => {
    const categoryName = normalizeRecommendationCategory(entry.category);
    const existingAmount = toNumber(nextMonthCategoryTotals[categoryName]);
    const increment = rewardValue * (Number(entry.contribution) || 0);
    nextMonthCategoryTotals[categoryName] = Number((existingAmount + increment).toFixed(2));
  });

  const nextMonthlyCategoryTotals = {
    ...currentMonthlyCategoryTotals,
    [monthKey]: nextMonthCategoryTotals,
  };
  const nextQualifyingTotal = Number((currentQualifyingTotal + 1).toFixed(0));
  const nextProcessed = [...processed, dedupeKey].slice(-200);

  await new Promise((resolve) => {
    chrome.storage.local.set(
      {
        [SAVINGS_TOTAL_KEY]: nextTotal,
        [SAVINGS_DEDUPE_KEY]: nextProcessed,
        [SAVINGS_MONTHLY_KEY]: nextMonthlySavings,
        [SAVINGS_CARD_USAGE_KEY]: nextCardUsageCounts,
        [SAVINGS_MONTHLY_CARD_CONTRIBUTIONS_KEY]: nextMonthlyCardContributions,
        [SAVINGS_MONTHLY_CATEGORY_TOTALS_KEY]: nextMonthlyCategoryTotals,
        [SAVINGS_QUALIFYING_TOTAL_KEY]: nextQualifyingTotal,
      },
      resolve
    );
  });
}

export default function PurchaseVerification({ pageSnapshot, onSaved }) {
  const translate = useTranslation('purchase-verification');
  const [_savedCards] = useChromeStorageSync('cardinfo');
  const [loading, setLoading] = useState(true);
  const [snapshot, setSnapshot] = useState(null);
  const [error, setError] = useState(null);
  const [showRecommendation, setShowRecommendation] = useState(false);
  const [recommendedCard, setRecommendedCard] = useState(null);
  const refSnapshot = useRef(null);
  const refSnapshotRec = useRef(null); // tracks recommendation that arrived with the snapshot
  const [cardNotSaved, setCardNotSaved] = useState(false);
  const [saved, setSaved] = useState(false);
  const [allCards, setAllCards] = useState([]);
  const [showAllCards, setShowAllCards] = useState(false);
  const [loadingCards, setLoadingCards] = useState(false);
  const [spendingWarning, setSpendingWarning] = useState(null);

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
            const snapRec = resp.recommended || resp.snapshot.recommended || null;
            refSnapshotRec.current = snapRec;
            setRecommendedCard(snapRec);
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
          const fallbackRec = event.data.recommended || snap.recommended || null;
          refSnapshotRec.current = fallbackRec;
          setRecommendedCard(fallbackRec);
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

  // After snapshot loads, determine which card to show:
  // 1. If the user explicitly tapped a card in the checkout popup (chosenCard), use that,
  //    then immediately clear it so it doesn't persist to the next purchase session.
  // 2. Otherwise call /api/recommendations with the same rule CheckoutDetector uses —
  //    saved card IDs + checkout URL — so the purchase popup always shows a recommendation
  //    regardless of whether the user interacted with the checkout popup.
  useEffect(() => {
    if (loading || !snapshot) return;
    if (typeof chrome === 'undefined' || !chrome.storage?.local) return;
    // Wait for useChromeStorageSync to finish loading before proceeding
    if (_savedCards === undefined || _savedCards === null) return;

    const cardsArray = Array.isArray(_savedCards)
      ? _savedCards
      : Array.isArray(_savedCards?.value)
        ? _savedCards.value
        : [];
    const savedCardIds = cardsArray.filter(Boolean);

    chrome.storage.local.get(['chosenCard'], async (data) => {
      const chosenCard = data?.chosenCard || null;
      if (chosenCard) {
        // Clear so it doesn't bleed into the next purchase popup session
        chrome.storage.local.remove(['chosenCard']);
        setRecommendedCard(chosenCard);
        setCardNotSaved(false);
        return;
      }

      // No explicit choice — fetch a fresh recommendation exactly like CheckoutDetector does.
      const checkoutUrl = snapshot.checkout?.url || snapshot.url || snapshot.merchantId || '';

      if (!checkoutUrl || !savedCardIds.length) {
        setRecommendedCard(null);
        setCardNotSaved(true);
        return;
      }

      try {
        const res = await fetch(apiUrl('/api/recommendations'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cards: savedCardIds.map(c => c.id || c),
            url: checkoutUrl,
            amount: snapshot.total || 1,
          }),
        });
        if (!res.ok) throw new Error(`recommendations ${res.status}`);
        const body = await res.json();

        const bestCardId = body.card?.cardId;
        if (!bestCardId) throw new Error('no cardId in response');

        const cardRes = await fetch(apiUrl(`/api/cards/${bestCardId}`));
        if (!cardRes.ok) throw new Error(`card fetch ${cardRes.status}`);
        const cardData = await cardRes.json();
        cardData.image_url = extensionImageUrl(cardData.image_path);
        cardData.rewardPoints = body.card.rewardPoints;

        setRecommendedCard(cardData);
        setCardNotSaved(false);
      } catch (err) {
        console.warn('PurchaseVerification: recommendation fetch failed', err);
        setRecommendedCard(null);
        setCardNotSaved(true);
      }
    });
  }, [loading, snapshot, _savedCards]);

  const isDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches || document.documentElement.classList.contains('dark');

  // Spending is recorded by background.js the moment a purchase is detected.
  // This function only reads the already-updated totals and shows a UI warning if limits are exceeded.
  async function checkSpendingLimits() {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) return;

    const now = new Date();
    const dateKey = now.toISOString().slice(0, 10);
    const monthKey = now.toISOString().slice(0, 7);

    const data = await new Promise(resolve =>
      chrome.storage.local.get(['spendingLimits', 'spending_daily_totals', 'spending_monthly_totals'], resolve)
    );

    const limits = data.spendingLimits || {};
    const spentDaily = toNumber(data.spending_daily_totals?.[dateKey]);
    const spentMonthly = toNumber(data.spending_monthly_totals?.[monthKey]);

    const warnings = [];
    if (limits.dailyEnabled && Number(limits.daily) > 0 && spentDaily > Number(limits.daily)) {
      warnings.push(`Daily limit $${limits.daily} exceeded — $${spentDaily.toFixed(2)} spent today.`);
    }
    if (limits.monthlyEnabled && Number(limits.monthly) > 0 && spentMonthly > Number(limits.monthly)) {
      warnings.push(`Monthly limit $${limits.monthly} exceeded — $${spentMonthly.toFixed(2)} spent this month.`);
    }

    if (warnings.length > 0) {
      setSpendingWarning(warnings.join(' '));
    }
  }

  async function handleConfirmCard(card) {
    if (!snapshot) return;

    try {
      await applyAllTimeSavings(snapshot, card || recommendedCard, { userConfirmed: true });
    } catch (e) {
      console.warn('Failed to update all-time savings', e);
    }

    try {
      await checkSpendingLimits();
    } catch (e) {
      console.warn('Failed to check spending limits', e);
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
    setSaved(true);
  }

  async function handleShowAllCards() {
    setLoadingCards(true);
    try {
      const res = await fetch(apiUrl('/api/cards'));
      const cards = await res.json();
      setAllCards(cards.map(c => ({ ...c, image_url: extensionImageUrl(c.image_path) })));
      setShowAllCards(true);
    } catch (e) {
      console.warn('Failed to fetch all cards', e);
    } finally {
      setLoadingCards(false);
    }
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
        '--card-border': 'none',
        '--card-name': isDark ? '#ffffff' : '#7c5d00',
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
            <p className="pv-eyebrow">{translate('.eyebrow')}</p>
            <h1 className="pv-title">{translate('.title')}</h1>
          </div>
          <button
            type="button"
            className="pv-close"
            onClick={handleClosePopup}
            aria-label={translate('.close-aria')}
            title={translate('.close-title')}
          >
            ✕
          </button>
        </div>

        {loading && <p className="pv-muted">{translate('.loading')}</p>}
        {error && <p className="pv-error">{error}</p>}

        {snapshot && (
          <>
            <div className="pv-meta">
              <span>{snapshot.merchantName || snapshot.merchantId || translate('.unknown-merchant')}</span>
              <span>{snapshot.total ? `$${snapshot.total}` : translate('.amount-unavailable')}</span>
            </div>
            <p className="pv-question">{translate('.question')}</p>
          </>
        )}

        {!saved && !showAllCards && !showRecommendation && cardNotSaved && (
          <p className="pv-error">{translate('.card-not-saved')}</p>
        )}

        {!saved && !showAllCards && !showRecommendation && recommendedCard && (
          <button
            type="button"
            className="pv-card-choice"
            onClick={() => handleConfirmCard(recommendedCard)}
            aria-label={`Confirm ${recommendedCard.name}`}
          >
            <div className="pv-card-visual" style={{ background: isDark ? '#111827' : (recommendedCard.color || '#f3c316') }}>
              <img
                src={extensionImageUrl(recommendedCard.image_path) || recommendedCard.image_url}
                alt={recommendedCard.name}
                className="pv-card-image"
              />
            </div>
            <div className="pv-card-name">{recommendedCard.name}</div>
          </button>
        )}

        {!saved && !showAllCards && !showRecommendation && snapshot && (
          <div className="pv-actions">
            <button type="button" className="pv-secondary" onClick={handleShowAllCards} disabled={loadingCards}>
              {loadingCards ? translate('.loading-cards') : translate('.another-card')}
            </button>
            <button type="button" className="pv-dismiss" onClick={handleClosePopup}>
              {translate('.dismiss')}
            </button>
          </div>
        )}

        {!saved && showAllCards && (
          <div className="pv-card-list">
            <p className="pv-question">{translate('.choose-card')}</p>
            <div className="pv-card-list-grid">
              {allCards.map(card => (
                <button
                  key={card._id || card.id}
                  type="button"
                  className="pv-card-list-item"
                  onClick={() => handleConfirmCard(card)}
                  aria-label={`Use ${card.name}`}
                >
                  <div
                    className="pv-card-list-visual"
                    style={{ background: isDark ? '#111827' : (card.color || '#1e3a8a') }}
                  >
                    <img src={card.image_url} alt={card.name} className="pv-card-list-image" />
                  </div>
                  <span className="pv-card-list-name">{card.name}</span>
                </button>
              ))}
            </div>
            <button type="button" className="pv-dismiss" style={{ marginTop: '10px' }} onClick={() => setShowAllCards(false)}>
              {translate('.back')}
            </button>
          </div>
        )}

        {saved && (
          <div className="pv-saved">
            <div className="pv-saved-icon">✓</div>
            <p className="pv-saved-text">{translate('.response-saved')}</p>
            {spendingWarning && (
              <div className="pv-spending-warning">
                ⚠️ {spendingWarning}
              </div>
            )}
            <button type="button" className="pv-dismiss" onClick={handleClosePopup}>{translate('.close')}</button>
          </div>
        )}

        {!saved && showRecommendation && recommendedCard && (
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
