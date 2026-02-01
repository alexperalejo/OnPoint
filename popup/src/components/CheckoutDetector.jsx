import { useEffect, useState } from "react";
import { CardRecommendation } from "./CardRecommendation";

export function CheckoutDetector({ cards, onSignUpClick }) {
  const [loading, setLoading] = useState(true);
  const [detection, setDetection] = useState(null);
  const [error, setError] = useState(null);
  const [showRecommendation, setShowRecommendation] = useState(false);
  const [recommendedCard, setRecommendedCard] = useState(null);
  const FIXED_THRESHOLD = 0.7;

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

  // BACKEND API INTEGRATION PLACEHOLDER
  // When checkout is detected, call backend like this:
  // const fetchRecommendedCard = async (userCards, pageUrl) => {
  //   const response = await fetch('/api/recommend-card', {
  //     method: 'POST',
  //     headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify({
  //       userCards: userCards,  // List of user's cards with their categories/tags
  //       currentUrl: pageUrl,   // URL of checkout page
  //       pageContent: detection // Detection results (optional)
  //     })
  //   });
  //   return await response.json(); // Returns: { card: bestCard, savingsPercentage: X }
  // };

  // Dummy card for demonstration (will be replaced with backend response)
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
          chrome.tabs.query({ active: true, currentWindow: true }, resolve)
        );
        if (!tabs || !tabs[0]) {
          setError("No active tab found");
          setLoading(false);
          return;
        }
        const tab = tabs[0];
        const tabId = tab.id;
        
        // Check if on a restricted page
        if (tab.url && (tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.startsWith('chrome-extension://'))) {
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
            
            // TODO: Call backend API with:
            // 1. Current page URL
            // 2. User's card list (from localStorage or props)
            // 3. Get back the recommended card
            
            // For now, show dummy card immediately
            fetch("http://localhost:3000/recommendations", {
              method: 'POST',
              body: JSON.stringify({
                url: window.location.href,
                cards: cards.map(c => c.id)
              })
            }).then(response => response.json())
              .then(body => {
                setRecommendedCard(cards.filter(c => c.id == body.card.cardId)[0]);
                setShowRecommendation(true);
              })
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
  }, []);

  return (
    <div style={{ width: '400px', padding: '16px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
        <div style={{ 
          width: '16px', 
          height: '16px', 
          background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)',
          borderRadius: '3px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '10px'
        }}>
          💳
        </div>
        <h1 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0 }}>Checkout Detector</h1>
      </div>

      {loading && <p style={{ color: '#666' }}>Detecting...</p>}
      
      {error && (
        <p style={{ color: '#dc2626', padding: '12px', background: '#fee', borderRadius: '4px' }}>
          {error}
        </p>
      )}

      {detection && (
        <div>
          <div style={{ marginBottom: '12px' }}>
            <p style={{ marginBottom: '8px' }}>
              Is checkout (detector): <strong>{detection.isCheckout ? 'Yes' : 'No'}</strong>
            </p>
            <p style={{ marginBottom: '8px' }}>Score: {detection.score.toFixed(2)}</p>
            <p style={{ marginBottom: '4px', fontWeight: '500', color: '#4b5563' }}>
              Rationale hidden in UI. Check `lastDetectionDebug` in chrome.storage.local.
            </p>
          </div>

          {showRecommendation && recommendedCard && (
            <CardRecommendation 
              card={recommendedCard}
              onApply={(card) => {
                console.log('User selected card:', card);
                // TODO: Backend flag - send to backend that user selected this card for transaction
                // This is where we'd track which card was recommended and if user used it
                setShowRecommendation(false);
              }}
              onDismiss={() => setShowRecommendation(false)}
            />
          )}

        </div>
      )}

      <button
        onClick={() => {
          // Open the frontend web app (localhost during dev, deployed URL in production)
          chrome.tabs.create({ 
            url: 'dashboard.html' 
          });
        }}
        style={{
          width: '100%',
          padding: '10px 16px',
          marginTop: '16px',
          background: '#2563eb',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          fontWeight: '500',
          cursor: 'pointer',
          fontSize: '14px',
          boxSizing: 'border-box'
        }}
        onMouseOver={(e) => e.target.style.background = '#1d4ed8'}
        onMouseOut={(e) => e.target.style.background = '#2563eb'}
      >
        Get Card Recommendations
      </button>

      <div style={{ marginTop: '12px' }}>
        <button 
          onClick={() => location.reload()}
          style={{
            background: '#eee',
            border: 'none',
            padding: '6px 12px',
            borderRadius: '4px',
            fontSize: '13px',
            cursor: 'pointer'
          }}
        >
          Refresh
        </button>
      </div>

      <footer style={{ marginTop: '12px', fontSize: '12px', color: '#999' }}>
        <div>Local-only detection · Manifest V3</div>
      </footer>
    </div>
  );
}
