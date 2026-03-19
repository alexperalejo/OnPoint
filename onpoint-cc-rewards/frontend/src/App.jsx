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
  const [detectorType] = useState(null); // 'checkout' | 'purchase' | null

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
