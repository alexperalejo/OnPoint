/* global chrome */
import './Onboarding.css';
import { useMemo, useState, useEffect } from 'react';
import { apiUrl, extensionImageUrl } from '../../utils/api';

const steps = [
  { id: 1, title: 'Select Your Credit Cards', subtitle: 'Choose the cards you currently have in your wallet' },
  { id: 2, title: 'Set Spending Limits', subtitle: 'Set optional limits to stay in control of your spending' },
];

export function Onboarding({ onBack, onComplete }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedCards, setSelectedCards] = useState({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [apiCards, setApiCards] = useState([]);
  const [loadingCards, setLoadingCards] = useState(true);
  const [spendingLimits, setSpendingLimits] = useState({
    daily: '',
    dailyEnabled: false,
    weekly: '',
    weeklyEnabled: false,
    monthly: '',
    monthlyEnabled: false,
  });

  const getCardImageSrc = (card) => {
    if (card?.image_path) {
      return extensionImageUrl(card.image_path);
    }
    if (card?.image_url) {
      return card.image_url;
    }
    return '';
  };

  useEffect(() => {
    fetch(apiUrl('/api/cards'))
      .then(r => r.json())
      .then(data => {
        setApiCards(Array.isArray(data) ? data : []);
        // Start with no cards selected; user explicitly chooses cards.
        setSelectedCards({});
      })
      .catch(() => {})
      .finally(() => setLoadingCards(false));

    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.get(['spendingLimits'], (data) => {
        if (data?.spendingLimits && typeof data.spendingLimits === 'object') {
          setSpendingLimits((prev) => ({ ...prev, ...data.spendingLimits }));
        }
      });
    }
  }, []);

  const totalSelectedCards = useMemo(() => {
    return Object.values(selectedCards).filter(Boolean).length;
  }, [selectedCards]);

  const enabledLimitCount = useMemo(() => {
    return ['dailyEnabled', 'weeklyEnabled', 'monthlyEnabled'].filter((k) => !!spendingLimits[k]).length;
  }, [spendingLimits]);

  const handleNext = () => {
    if (currentStep === steps.length) {
      // Persist onboarding data to chrome.storage.local if available
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        const selectedCardIds = Object.entries(selectedCards)
          .filter(([, v]) => v)
          .map(([id]) => id);
        chrome.storage.local.set({
          onboardingComplete: true,
          onboardingCardIds: selectedCardIds,
          cardinfo: selectedCardIds,
          spendingLimits,
        });
      }
      setShowSuccess(true);
      setTimeout(() => {
        if (onComplete) {
          onComplete();
          return;
        }
        if (onBack) {
          onBack();
        }
      }, 1200);
      return;
    }
    setCurrentStep((prev) => Math.min(prev + 1, steps.length));
  };

  const handleBack = () => {
    if (currentStep === 1) {
      if (onBack) onBack();
      return;
    }
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const toggleCard = (id) => {
    setSelectedCards((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const updateLimit = (key, value) => {
    setSpendingLimits((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="onboarding-shell">
      <div className="onboarding-card">
        <div className="progress-container">
          <div className="progress-bar" aria-label={`Step ${currentStep} of ${steps.length}`}>
            {steps.map((step) => (
              <div
                key={step.id}
                className={`progress-pill ${step.id <= currentStep ? 'is-active' : ''}`}
              />
            ))}
          </div>
          <p className="progress-label">Step {currentStep} of {steps.length}</p>
        </div>

        <div className="onboarding-header">
          <div className="header-icon">
            <div className="icon-circle">{currentStep}</div>
          </div>
          <div>
            <h1 className="onboarding-title">{steps[currentStep - 1].title}</h1>
            <p className="onboarding-subtitle">{steps[currentStep - 1].subtitle}</p>
          </div>
        </div>

        {showSuccess ? (
          <div className="success-panel">
            <div className="success-icon">✓</div>
            <h3 className="success-title">Setup complete!</h3>
            <p className="success-subtext">Redirecting you to OnPoint...</p>
          </div>
        ) : (
          <div className="onboarding-body">
            {currentStep === 1 && (
              <>
                <div className="callout info">
                  <div>
                    <p className="callout-title">Select all the cards you own</p>
                    <p className="callout-text">You can always add more later from the card library.</p>
                  </div>
                </div>

                {loadingCards ? (
                  <p className="muted-text" style={{ textAlign: 'center', padding: '1.5rem 0' }}>Loading cards…</p>
                ) : apiCards.length === 0 ? (
                  <p className="muted-text" style={{ textAlign: 'center', padding: '1.5rem 0' }}>Could not load cards. You can add them from the dashboard.</p>
                ) : (
                  <div className="card-list">
                    {Object.entries(
                      apiCards.reduce((acc, card) => {
                        if (!acc[card.issuer]) acc[card.issuer] = [];
                        acc[card.issuer].push(card);
                        return acc;
                      }, {})
                    ).map(([issuer, cards]) => (
                      <div key={issuer} className="issuer-group">
                        <p className="issuer-group-label">{issuer}</p>
                        {cards.map((card) => {
                          const isSelected = !!selectedCards[card._id];
                          const cardImageSrc = getCardImageSrc(card);
                          return (
                            <button
                              key={card._id}
                              type="button"
                              className={`card-row ${isSelected ? 'is-selected' : ''}`}
                              onClick={() => toggleCard(card._id)}
                            >
                              <div className="card-row-left">
                                <div className="card-thumb-wrap" aria-hidden="true">
                                  {cardImageSrc ? (
                                    <img
                                      src={cardImageSrc}
                                      alt=""
                                      className="card-thumb"
                                      loading="lazy"
                                    />
                                  ) : (
                                    <div className="card-thumb card-thumb-placeholder" />
                                  )}
                                </div>
                                <span className="chevron">{isSelected ? '▾' : '▸'}</span>
                                <span className="issuer-name">{card.name}</span>
                              </div>
                              <div className="card-row-right">{card.annualFee === 0 ? 'No fee' : `$${card.annualFee}/yr`}</div>
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                )}

                <p className="muted-text">Don't see your card? You can add custom cards after setup.</p>
              </>
            )}

            {currentStep === 2 && (
              <>
                <div className="callout info">
                  <div>
                    <p className="callout-title">Set optional guardrails</p>
                    <p className="callout-text">These limits help OnPoint warn you when purchases approach your daily, weekly, or monthly targets.</p>
                  </div>
                </div>

                <div className="onboarding-limits-list">
                  <div className="onboarding-limit-item">
                    <div className="onboarding-limit-row">
                      <label className="onboarding-limit-label">Daily Limit</label>
                      <button
                        type="button"
                        className={`onboarding-limit-toggle ${spendingLimits.dailyEnabled ? 'on' : 'off'}`}
                        onClick={() => updateLimit('dailyEnabled', !spendingLimits.dailyEnabled)}
                      >
                        {spendingLimits.dailyEnabled ? 'On' : 'Off'}
                      </button>
                    </div>
                    {spendingLimits.dailyEnabled && (
                      <div className="onboarding-limit-input-wrap">
                        <span className="onboarding-limit-prefix">$</span>
                        <input
                          type="number"
                          min="0"
                          className="onboarding-limit-input"
                          placeholder="0.00"
                          value={spendingLimits.daily}
                          onChange={(e) => updateLimit('daily', e.target.value)}
                        />
                      </div>
                    )}
                  </div>

                  <div className="onboarding-limit-item">
                    <div className="onboarding-limit-row">
                      <label className="onboarding-limit-label">Weekly Limit</label>
                      <button
                        type="button"
                        className={`onboarding-limit-toggle ${spendingLimits.weeklyEnabled ? 'on' : 'off'}`}
                        onClick={() => updateLimit('weeklyEnabled', !spendingLimits.weeklyEnabled)}
                      >
                        {spendingLimits.weeklyEnabled ? 'On' : 'Off'}
                      </button>
                    </div>
                    {spendingLimits.weeklyEnabled && (
                      <div className="onboarding-limit-input-wrap">
                        <span className="onboarding-limit-prefix">$</span>
                        <input
                          type="number"
                          min="0"
                          className="onboarding-limit-input"
                          placeholder="0.00"
                          value={spendingLimits.weekly}
                          onChange={(e) => updateLimit('weekly', e.target.value)}
                        />
                      </div>
                    )}
                  </div>

                  <div className="onboarding-limit-item">
                    <div className="onboarding-limit-row">
                      <label className="onboarding-limit-label">Monthly Limit</label>
                      <button
                        type="button"
                        className={`onboarding-limit-toggle ${spendingLimits.monthlyEnabled ? 'on' : 'off'}`}
                        onClick={() => updateLimit('monthlyEnabled', !spendingLimits.monthlyEnabled)}
                      >
                        {spendingLimits.monthlyEnabled ? 'On' : 'Off'}
                      </button>
                    </div>
                    {spendingLimits.monthlyEnabled && (
                      <div className="onboarding-limit-input-wrap">
                        <span className="onboarding-limit-prefix">$</span>
                        <input
                          type="number"
                          min="0"
                          className="onboarding-limit-input"
                          placeholder="0.00"
                          value={spendingLimits.monthly}
                          onChange={(e) => updateLimit('monthly', e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="success-banner">
                  <div className="success-banner-body">
                    <p className="success-banner-title">Ready to go</p>
                    <p className="success-banner-text">Click "Complete Setup" to start maximizing your credit card rewards with OnPoint.</p>
                    <div className="summary-grid">
                      <div>
                        <p className="summary-label">Cards Added</p>
                        <p className="summary-value">{totalSelectedCards}</p>
                      </div>
                      <div>
                        <p className="summary-label">Limits Enabled</p>
                        <p className="summary-value">{enabledLimitCount}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {!showSuccess && (
          <div className="onboarding-footer">
            <button type="button" className="btn ghost" onClick={handleBack}>
              ← Back
            </button>
            <button type="button" className="btn primary" onClick={handleNext}>
              {currentStep === steps.length ? 'Complete Setup' : 'Next →'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
