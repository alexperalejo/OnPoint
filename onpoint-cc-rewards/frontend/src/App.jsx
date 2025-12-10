import { useState } from 'react';
import { Header } from './components/Header/Header.jsx';
import { FeatureCards } from './components/FeatureCards/FeatureCards.jsx';
import { Steps } from './components/Steps/Steps.jsx';
import { CreditCardList } from './components/CreditCardList/CreditCardList.jsx';
import { Onboarding } from './components/Onboarding/Onboarding.jsx';
import Dashboard from './pages/Dashboard.jsx';
import './App.css';

export default function App() {
  const [stage, setStage] = useState('landing'); // landing | onboarding | dashboard
  const [authMode, setAuthMode] = useState('signup');
  
  return <Dashboard onSignOut={() => setStage('landing')} />;
  if (stage === 'onboarding') {
    return (
      <Onboarding
        mode={authMode}
        onBack={() => setStage('landing')}
        onComplete={() => setStage('dashboard')}
      />
    );
  }

  if (stage === 'dashboard') {
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
        <CreditCardList />
      </main>
    </div>
  );
}
