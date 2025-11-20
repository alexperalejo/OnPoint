import { useEffect, useState } from "react";

export function CheckoutDetector({ onSignUpClick }) {
  const [loading, setLoading] = useState(true);
  const [detection, setDetection] = useState(null);
  const [error, setError] = useState(null);
  const FIXED_THRESHOLD = 0.7;

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
        } else if (resp === null) {
          // error already set
        } else {
          setError("No response from content script");
        }
        setLoading(false);
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
            <p style={{ marginBottom: '4px', fontWeight: '500' }}>Reasons:</p>
            <ul style={{ paddingLeft: '20px', margin: 0 }}>
              {detection.reasons.map((r, i) => (
                <li key={i} style={{ marginBottom: '4px', color: '#444' }}>{r}</li>
              ))}
            </ul>
          </div>

          {detection.isCheckout && (
            <button
              onClick={() => {
                // Open same page but as full page with onboarding parameter
                chrome.tabs.create({ 
                  url: chrome.runtime.getURL('dist/onboarding.html?fullpage=true&view=onboarding') 
                });
              }}
              style={{
                width: '100%',
                padding: '10px',
                marginTop: '12px',
                background: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
              onMouseOver={(e) => e.target.style.background = '#1d4ed8'}
              onMouseOut={(e) => e.target.style.background = '#2563eb'}
            >
              Get Card Recommendations
            </button>
          )}

          <div style={{ 
            marginTop: '16px', 
            paddingTop: '12px', 
            borderTop: '1px solid #e5e7eb',
            fontSize: '13px',
            color: '#666'
          }}>
            <div>Detection threshold: <strong>{FIXED_THRESHOLD.toFixed(2)}</strong></div>
            <div>Passes score threshold (&gt;= {FIXED_THRESHOLD.toFixed(2)}): <strong>{detection.isCheckoutByScore ? 'Yes' : 'No'}</strong></div>
            <div>Accepted after post-check rules: <strong>{detection.isCheckout ? 'Yes' : 'No'}</strong></div>
            <div style={{ fontSize: '11px', marginTop: '8px' }}>
              Note: detector may accept pages with strong payment signals even if the raw score is slightly below the threshold.
              <br />
              Payment signal present: <strong>{detection.hasPaymentSignal ? 'Yes' : 'No'}</strong>
            </div>
          </div>
        </div>
      )}

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
