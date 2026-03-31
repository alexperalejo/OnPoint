/* global chrome */
import { useEffect, useState } from "react"; // React hooks for state and lifecycle
import { CardRecommendation } from "../CardRecommendation/CardRecommendation"; // Card recommendation component
import { useChromeStorageSync } from "use-chrome-storage" // Custom hook to access chrome.storage.sync for saved cards
import './CheckoutDetector.css';

export function CheckoutDetector() {
  const [savedCards] = useChromeStorageSync('cardinfo')
  const [loading, setLoading] = useState(true);
  const [detection, setDetection] = useState(null);
  const [error, setError] = useState(null);
  const [showRecommendation, setShowRecommendation] = useState(false);
  const [recommendedCard, setRecommendedCard] = useState(null);
  const [breakdown, setBreakdown] = useState(null); // for detailed recommendation breakdown
  const [reason] = useState(null);
  const FIXED_THRESHOLD = 0.7;
  const [purchaseTotal, setPurchaseTotal] = useState(null);

  function handleClosePopup() {
    try {
      window.close();
    } catch {
      // Ignore when not running as an extension popup.
    }
  }

  // Persist the latest detection plus a small history for developer inspection.
  async function persistDetectionDebug(payload) {
    try {
      const getExisting = () => new Promise((resolve) => {
        chrome.storage?.local?.get(['detectionHistory'], (data) => resolve(data || {}));
      });
      const existing = await getExisting();
      const history = Array.isArray(existing.detectionHistory) ? existing.detectionHistory : [];
      const nextHistory = [{ ...payload }, ...history].slice(0, 10);
      await chrome.storage?.local?.set({
        lastDetectionDebug: payload,
        detectionHistory: nextHistory,
      });
    } catch (storageErr) {
      console.warn('Could not store detection debug info', storageErr);
    }
  }

  const DUMMY_RECOMMENDED_CARD = {
    id: "1",
    name: "Chase Freedom Unlimited",
    issuer: "Chase",
    type: "cashback",
    annualFee: 0,
    color: "#1E3A8A",
    rewards: [
      {
        category: "dining",
        rate: 3,
        details: "Including takeout and delivery",
      },
      { category: "drugstore", rate: 3 },
      {
        category: "travel",
        rate: 5,
        details: "Through Chase Travel Portal",
      },
      { category: "all", rate: 1.5 },
    ],
  };

  useEffect(() => {
    async function queryContent() {
      try {
        const tabs = await new Promise((resolve) =>
  chrome.tabs.query({ 
    active: true, 
    lastFocusedWindow: true,
    url: ['http://*/*', 'https://*/*']
  }, resolve)

        );
        if (!tabs || !tabs[0]) {
          setError("No active tab found");
          setLoading(false);
          return;
        }
        const tab = tabs[0];
        const tabId = tab.id;
        
        // Check if on a restricted page
        if (tab.url && (tab.url.startsWith('chrome://') || 
                        tab.url.startsWith('edge://') || 
                        tab.url.startsWith('chrome-extension://'))) {
          setError("Cannot run on browser internal pages. Please visit a regular website.");
          setLoading(false);
          return;
        }
        const sendReq = () =>
          new Promise((resolve) =>
            chrome.tabs.sendMessage(tabId, { type: "getDetection" }, resolve)
          );

        const trySend = async (attemptsLeft = 1) => {
          const resp = await sendReq();
          if (chrome.runtime.lastError) {
            if (attemptsLeft > 0 && chrome.scripting) {
              try {
                await new Promise((res, rej) => {
                  chrome.scripting.executeScript(
                    {
                      target: { tabId },
                      files: ["content/detect-core.js", "content/detect.js"],
                    },
                    (injectionResults) => {
                      if (chrome.runtime.lastError)
                        return rej(chrome.runtime.lastError);
                      res(injectionResults);
                    }
                  );
                });
                await new Promise((r) => setTimeout(r, 150));
                return trySend(attemptsLeft - 1);
              } catch (injErr) {
                setError("Unable to inject content script: " + String(injErr));
                setLoading(false);
                return null;
              }
            }
            setError("Content script not available on this page");
            setLoading(false);
            return null;
          }
          return resp;
        };

        const resp = await trySend(1);
        if (resp && resp.ok) {
          setDetection(resp.detection);
          // Persist full rationale for developers (out of UI)
          persistDetectionDebug({
            detection: resp.detection,
            tabUrl: tab.url,
            capturedAt: Date.now(),
          });
          setLoading(false);
          
          // When checkout detected, prepare to fetch card recommendation from backend
          if (resp.detection.isCheckout) {
            console.log('Checkout detected on URL:', window.location.href);
                
                // Get checkout total from content script (which extracted it from the page) for use in recommendation and display
                chrome.storage.local.get(['checkoutTotal'], (data) => {
                  if (data.checkoutTotal && data.checkoutTotal.amount) {
                    setPurchaseTotal(data.checkoutTotal.amount);
                  }
                });
            
            // Call recommendations API with all cards
        const cardsArray = Array.isArray(savedCards)
          ? savedCards
          : Array.isArray(savedCards?.value)
            ? savedCards.value
            : [];

        if (!cardsArray.length) {
          console.log("[CHECKOUT] No saved card IDs yet");
          return;
        }

        const cardIds = cardsArray.map(c => c.id || c);
        


        console.log("[CARDS ARRAY]", cardsArray);
        console.log("[CARD IDS SENT]", cardIds);


        const res = await fetch('http://localhost:3000/api/recommendations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cards: cardIds, url: tab.url, amount: 1 })
        });

        const body = await res.json();

        console.log("[API RESPONSE]", body);
        console.log("[CARDS ARRAY IDS]", cardsArray.map(c => String(c.id || c)));
        console.log("[RETURNED CARD ID]", String(body.card?.cardId));

        const bestCard = cardsArray.find(c => String(c.id || c) === String(body.card?.cardId));

        // bestCard is just an ID string, fetch the full card object
        if (bestCard) {
            const cardId = bestCard.id || bestCard; // handle both object and string cases
            const cardRes = await fetch(`http://localhost:3000/api/cards/${cardId}`);
            const cardData = await cardRes.json();
            const tagBreakdown = body.card.breakdown.find(b => b.from !== 'cashback');
            console.log("[CARD TYPE]", cardData.cardType); 
            cardData.image_url = `http://localhost:3000/${cardData.image_path}`;
            cardData.rewardPoints = body.card.rewardPoints; // attach reward points info to card data for display
            // Use the highest non-cashback breakdown points for display
            cardData.rewardPoints = tagBreakdown ? tagBreakdown.points : body.card.rewardPoints;

            console.log("[IMAGE URL]", cardData.image_url);
            setRecommendedCard(cardData);
            setBreakdown(body.card.breakdown); // in case we want to show detailed breakdown
            setShowRecommendation(true);
        } else {
            console.log("[NO MATCH] Card not found in wallet");
            setRecommendedCard(null);
            setShowRecommendation(false);
        }

          }
        } else if (resp === null) {
          // error already set
          setLoading(false);
        } else {
          setError("No response from content script");
          setLoading(false);
        }
      } catch (e) {
        setError(String(e));
        setLoading(false);
      }
    }
    queryContent();
  }, [savedCards]);



  const isDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches || document.documentElement.classList.contains('dark');
  
  //Checkout Detector UI
  return (
    <div
      className="checkout-detector"
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
        '--panel-bg': isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc',
        '--panel-border': isDark ? '1px solid rgba(148,163,184,0.35)' : '1px solid #e5e7eb',
        '--panel-title': isDark ? '#f8fafc' : '#0f172a',
        '--panel-text': isDark ? '#cbd5e1' : '#4b5563',
        '--refresh-bg': isDark ? '#334155' : '#eee',
        '--refresh-hover-bg': isDark ? '#475569' : '#ddd',
        '--refresh-border': isDark ? '1px solid #475569' : '1px solid #d1d5db',
        '--refresh-text': isDark ? '#e2e8f0' : '#1f2937'
      }}
    >
      <div className="cd-header">
        <div className="cd-icon">💳</div>
        <h1 className="cd-title">OnPoint</h1>
        <button
          type="button"
          onClick={handleClosePopup}
          className="cd-close"
          aria-label="Close detector"
          title="Close"
        >✕</button>
      </div>

      {loading && <p className="cd-muted">Detecting...</p>}
      
      {error && (
        <p className="cd-error">
          {error}
        </p>
      )}

      {detection && (
        <div>
          {showRecommendation && recommendedCard && (
            <CardRecommendation 
              card={recommendedCard}
              reason={reason}
              total={purchaseTotal}
              breakdown={breakdown}
              onApply={(card) => {
                console.log('User selected card:', card);
                try {
                  chrome.storage?.local?.set({ chosenCard: card });
                } catch (e) {
                  console.warn('Could not save chosen card', e);
                }
                setShowRecommendation(false);
              }}
              onDismiss={() => {
                setShowRecommendation(false);
                window.close();
              }}
            />
          )}

        </div>
      )}
        <button
          type="button"
          onClick={() => {
          // Open the main dashboard
          chrome.tabs.create({ 
            url: chrome.runtime.getURL('dist/dashboard.html') 
          });
        }}
          className="cd-close"
          aria-label="Close detector"
          title="Close"
        >Settings</button>
    </div>
  );
}
