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
    // Only run detection check when showing the extension detector UI
    if (stage !== 'extension-detector' || typeof chrome === 'undefined') return;

    let mounted = true;

    (async function detectForActiveTab() {
      try {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (!mounted) return;
          if (!tabs || !tabs[0]) {
            setDetectorType('checkout');
            return;
          }
          const tabId = tabs[0].id;
          const storageKey = `detector_${tabId}`;

          chrome.storage.local.get([storageKey], (res) => {
            if (!mounted) return;

            // Check for async runtime errors first
            if (chrome.runtime.lastError) {
              console.warn('chrome.storage.local.get failed:', chrome.runtime.lastError);
              // Try asking the background script if storage failed
              chrome.runtime.sendMessage({ action: 'getDetector', tabId }, (resp) => {
                if (!mounted) return;
                if (chrome.runtime.lastError) {
                  console.warn('chrome.runtime.sendMessage failed:', chrome.runtime.lastError);
                  setDetectorType('checkout');
                  return;
                }
                const d = resp && resp.detector;
                setDetectorType(d === 'purchase' ? 'purchase' : 'checkout');
              });
              return;
            }

            const val = res && res[storageKey];
            if (val === 'purchase' || val === 'checkout') {
              setDetectorType(val);
              return;
            }

            // Ask background as a fallback
            chrome.runtime.sendMessage({ action: 'getDetector', tabId }, (resp) => {
              if (!mounted) return;
              if (chrome.runtime.lastError) {
                console.warn('chrome.runtime.sendMessage failed:', chrome.runtime.lastError);
                setDetectorType('checkout');
                return;
              }
              const d = resp && resp.detector;
              setDetectorType(d === 'purchase' ? 'purchase' : 'checkout');
            });
          });
        });
      } catch {
        setDetectorType('checkout');
      }
    })();

    return () => { mounted = false; };
  }, [stage]);
  
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
