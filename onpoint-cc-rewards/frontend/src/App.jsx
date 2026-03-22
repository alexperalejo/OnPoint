/* global chrome */
import { useState, useEffect } from 'react';
import { Header } from './components/Header/Header.jsx';
import { FeatureCards } from './components/FeatureCards/FeatureCards.jsx';
import { Steps } from './components/Steps/Steps.jsx';
import { Onboarding } from './components/Onboarding/Onboarding.jsx';
import Dashboard from './pages/Dashboard.jsx';
import { CheckoutDetector } from './components/CheckoutDetector/CheckoutDetector.jsx';
import PurchaseVerification from './components/PurchaseVerification/PurchaseVerification.jsx';
import { useDarkMode } from './hooks/useDarkMode.js';
import './App.css';

export default function App() {
  const isExtensionMode = window.location.pathname.includes('onboarding') && typeof chrome !== 'undefined';
  const isDashboardPage = window.location.pathname.includes('dashboard');
  const isOnboardingPage = window.location.pathname.includes('onboarding') && !isDashboardPage;
  
  // Determine initial stage based on current page
  let startStage = 'landing';
  if (isExtensionMode && isOnboardingPage) {
    startStage = 'extension-detector';
  } else if (isDashboardPage) {
    startStage = 'dashboard';
  } else if (isOnboardingPage) {
    startStage = 'onboarding';
  }
  
  const [stage, setStage] = useState(startStage); // landing | onboarding | dashboard | extension-detector
  const [authMode, setAuthMode] = useState('signup');
  useDarkMode(); // Hook applies dark mode side effects
  const [detectorType, setDetectorType] = useState(null); // 'checkout' | 'purchase' | null

  useEffect(() => {
    if (stage !== 'extension-detector' || typeof chrome === 'undefined') return;
    let mounted = true;

    const probePurchase = async (tabId) => {
      const sendReq = () =>
        new Promise((resolve) => chrome.tabs.sendMessage(tabId, { type: 'getPurchaseDetection' }, resolve));

      const trySend = async (attemptsLeft = 1) => {
        const resp = await sendReq();
        if (chrome.runtime.lastError) {
          if (attemptsLeft > 0 && chrome.scripting) {
            try {
              await new Promise((res, rej) => {
                chrome.scripting.executeScript(
                  {
                    target: { tabId },
                    files: ['content/purchase-detect-core.js', 'content/purchase.js'],
                  },
                  () => {
                    if (chrome.runtime.lastError) return rej(chrome.runtime.lastError);
                    res();
                  }
                );
              });
              await new Promise((r) => setTimeout(r, 120));
              return trySend(attemptsLeft - 1);
            } catch {
              return null;
            }
          }
          return null;
        }
        return resp;
      };

      const resp = await trySend(1);
      return !!resp?.detection?.isPurchase;
    };

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!mounted) return;
      const tab = tabs && tabs[0];
      if (!tab?.id) {
        setDetectorType('checkout');
        return;
      }

      const resolveByProbe = () => {
        probePurchase(tab.id)
          .then((isPurchasePage) => {
            if (!mounted) return;
            setDetectorType(isPurchasePage ? 'purchase' : 'checkout');
          })
          .catch(() => {
            if (!mounted) return;
            setDetectorType('checkout');
          });
      };

      try {
        chrome.runtime.sendMessage({ action: 'getDetector', tabId: tab.id }, (res) => {
          if (!mounted) return;
          if (chrome.runtime.lastError) {
            resolveByProbe();
            return;
          }
          const kind = res?.detector;
          if (kind === 'purchase') {
            setDetectorType('purchase');
            return;
          }

          // If state is missing or says checkout, directly probe purchase detection to avoid stale routing.
          resolveByProbe();
        });
      } catch {
        resolveByProbe();
      }
    });

    return () => { mounted = false; };
  }, [stage]);

  useEffect(() => {
  if (stage !== 'extension-detector' || detectorType !== 'purchase' || typeof chrome === 'undefined') return;
  let mounted = true;

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!mounted) return;
    const tab = tabs && tabs[0];
    if (!tab) return;
    const tabId = tab.id;

    chrome.storage.local.get(['purchaseCandidate'], (data) => {
      const candidate = data?.purchaseCandidate || null;
      const uiMsg = { type: 'showRecommendation', candidate, recommendation: candidate?.recommendation || null };

      chrome.tabs.sendMessage(tabId, uiMsg, () => {
        if (!chrome.runtime.lastError) return;
        // If no listener, inject UI content script then retry
        if (chrome.scripting && typeof chrome.scripting.executeScript === 'function') {
          chrome.scripting.executeScript(
            { target: { tabId }, files: ['content/checkCardUsed.js'] },
            () => {
              if (chrome.runtime.lastError) return;
              try { chrome.tabs.sendMessage(tabId, uiMsg); } catch{ /* ignore */ }
            }
          );
        }
      });
    });
  });
  return () => { mounted = false; };
}, [stage, detectorType]);

  // In extension mode, decide which detector UI to show
  if (stage === 'extension-detector') {
    // while unknown, show a compact wrapper
    if (!detectorType) {
      return (
        <div className="app" style={{ width: '400px', margin: 0, padding: 0 }}>
          <div style={{ padding: 20 }}>Detecting page type…</div>
        </div>
      );
    }

    return (
      <div className="app" style={{ width: '400px', margin: 0, padding: 0 }}>
        {detectorType === 'purchase' ? (
          <PurchaseVerification />
        ) : (
          <CheckoutDetector />
        )}
      </div>
    );
  }
  
  // Dashboard page - always show dash, never transition to onboarding
  if (isDashboardPage || stage === 'dashboard') {
    return <Dashboard onSignOut={() => setStage('landing')} />;
  }

  // Onboarding page - stay on onboarding, redirect externally on complete
  if (isOnboardingPage || stage === 'onboarding') {
    return (
      <Onboarding
        mode={authMode}
        onBack={() => setStage('landing')}
        onComplete={() => {
          // If on onboarding.html in extension, redirect to dashboard.html
          if (isOnboardingPage && typeof chrome !== 'undefined') {
            window.location.href = chrome.runtime.getURL('dist/dashboard.html');
          } else {
            setStage('dashboard');
          }
        }}
      />
    );
  }

  return (
    <div className="app">
      <Header
        onAuthClick={(mode) => {
          setAuthMode(mode);
          setStage('onboarding');
        }}
      />

      <main className="main-content">
        <FeatureCards />
        <Steps />
      </main>
    </div>
  );
}
