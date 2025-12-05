/*import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
*/
import { useState } from 'react';
import { Header } from './components/Header/Header.jsx';
import { FeatureCards } from './components/FeatureCards/FeatureCards.jsx';
import { Steps } from './components/Steps/Steps.jsx';
import { CreditCardList } from './components/CreditCardList/CreditCardList.jsx';
import { Onboarding } from './components/Onboarding/Onboarding.jsx';
import './App.css';

export default function App() {
  const [showOnboarding, setShowOnboarding] = useState(false);

  if (showOnboarding) {
    return (
      <Onboarding 
        onBack={() => setShowOnboarding(false)} 
      />
    );
  }

  return (
    <div className="app">
      <Header onAuthClick={() => setShowOnboarding(true)} />

      <main className="main-content">
        <FeatureCards />
        <Steps />
        <CreditCardList />
      </main>
    </div>
  );
}
