/* global chrome */
import { useState } from 'react';
import { Header } from './components/Header/Header.jsx';
import { FeatureCards } from './components/FeatureCards/FeatureCards.jsx';
import { Steps } from './components/Steps/Steps.jsx';
import { Onboarding } from './components/Onboarding/Onboarding.jsx';
import Dashboard from './pages/Dashboard.jsx';
import { CheckoutDetector } from './components/CheckoutDetector/CheckoutDetector.jsx';
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
  
  // In extension mode, always show CheckoutDetector
  if (stage === 'extension-detector') {
    return (
      <div className="app" style={{ width: '400px', margin: 0, padding: 0 }}>
        <CheckoutDetector />
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
