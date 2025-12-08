import './Onboarding.css';
import { useMemo, useState } from 'react';

const steps = [
  { id: 1, title: 'Create Your Account', subtitle: 'Let’s get started with your OnPoint profile' },
  { id: 2, title: 'Select Your Credit Cards', subtitle: 'Choose the cards you currently have in your wallet' },
  { id: 3, title: 'Notification Preferences', subtitle: 'Stay informed about your rewards and opportunities' },
];

const cardIssuers = [
  { issuer: 'Chase', cardCount: 2 },
  { issuer: 'Amex', cardCount: 1 },
  { issuer: 'Citi', cardCount: 1 },
  { issuer: 'Capital One', cardCount: 1 },
  { issuer: 'Discover', cardCount: 1 },
];

const notificationOptions = [
  {
    id: 'checkout',
    label: 'Checkout Reminders',
    description: 'Get a notification when you’re checking out online to remind you to use the best card',
  },
  {
    id: 'reports',
    label: 'Monthly Reward Reports',
    description: 'Receive a monthly summary of rewards earned and opportunities you captured',
  },
  {
    id: 'suggestions',
    label: 'New Card Suggestions',
    description: 'Get personalized recommendations for new cards that could maximize your rewards based on spending',
  },
  {
    id: 'alerts',
    label: 'Reward Alerts',
    description: 'Get notified about expiring rewards, rotating categories, and limited-time bonus opportunities',
  },
];

export function Onboarding({ mode = 'signup', onBack, onComplete }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({ fullName: '', email: '' });
  const [selectedIssuers, setSelectedIssuers] = useState(() => {
    const defaults = {};
    cardIssuers.forEach(({ issuer }) => {
      defaults[issuer] = true;
    });
    return defaults;
  });
  const [preferences, setPreferences] = useState({
    checkout: true,
    reports: true,
    suggestions: false,
    alerts: true,
  });
  const [showSuccess, setShowSuccess] = useState(false);

  const isSignup = mode === 'signup';

  const totalSelectedCards = useMemo(() => {
    return cardIssuers.reduce((count, item) => {
      return count + (selectedIssuers[item.issuer] ? item.cardCount : 0);
    }, 0);
  }, [selectedIssuers]);

  const enabledNotifications = useMemo(() => {
    return Object.values(preferences).filter(Boolean).length;
  }, [preferences]);

  const handleNext = () => {
    if (currentStep === steps.length) {
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

  const toggleIssuer = (issuer) => {
    setSelectedIssuers((prev) => ({ ...prev, [issuer]: !prev[issuer] }));
  };

  const togglePreference = (id) => {
    setPreferences((prev) => ({ ...prev, [id]: !prev[id] }));
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
            <h3 className="success-title">{isSignup ? 'Account created successfully!' : 'Welcome back!'}</h3>
            <p className="success-subtext">Redirecting you to OnPoint...</p>
          </div>
        ) : (
          <div className="onboarding-body">
            {currentStep === 1 && (
              <>
                <div className="callout primary">
                  <div className="callout-icon">💡</div>
                  <div>
                    <p className="callout-title">Join thousands who are maximizing rewards</p>
                    <p className="callout-text">OnPoint users save an average of $284/year in previously missed rewards</p>
                  </div>
                </div>

                <div className="form-grid">
                  <label className="field">
                    <span className="field-label">Full Name *</span>
                    <div className="field-input">
                      <span className="field-leading">👤</span>
                      <input
                        type="text"
                        placeholder="Enter your full name"
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        required
                      />
                    </div>
                  </label>

                  <label className="field">
                    <span className="field-label">Email Address *</span>
                    <div className="field-input">
                      <span className="field-leading">✉️</span>
                      <input
                        type="email"
                        placeholder="Enter your email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                      />
                    </div>
                    <span className="field-hint">We’ll use this to send you reward alerts and monthly reports</span>
                  </label>
                </div>

                <div className="callout success">
                  <div className="callout-icon">✔</div>
                  <div>
                    <p className="callout-title">Your data is secure</p>
                    <p className="callout-text">We never store your actual credit card numbers. Only reward structures to help you maximize benefits.</p>
                  </div>
                </div>
              </>
            )}

            {currentStep === 2 && (
              <>
                <div className="callout info">
                  <div className="callout-icon">💡</div>
                  <div>
                    <p className="callout-title">Select all the cards you own</p>
                    <p className="callout-text">You can always add more later or create custom cards.</p>
                  </div>
                </div>

                <div className="card-list">
                  {cardIssuers.map((issuer) => {
                    const isSelected = selectedIssuers[issuer.issuer];
                    return (
                      <button
                        key={issuer.issuer}
                        type="button"
                        className={`card-row ${isSelected ? 'is-selected' : ''}`}
                        onClick={() => toggleIssuer(issuer.issuer)}
                      >
                        <div className="card-row-left">
                          <span className="chevron">{isSelected ? '▾' : '▸'}</span>
                          <span className="issuer-name">{issuer.issuer}</span>
                        </div>
                        <div className="card-row-right">{issuer.cardCount} card{issuer.cardCount > 1 ? 's' : ''}</div>
                      </button>
                    );
                  })}
                </div>

                <p className="muted-text">Don’t see your card? You can add custom cards after setup.</p>
              </>
            )}

            {currentStep === 3 && (
              <>
                <div className="callout info">
                  <div className="callout-icon">💡</div>
                  <div>
                    <p className="callout-title">Customize how OnPoint keeps you updated.</p>
                    <p className="callout-text">You can change these anytime in settings.</p>
                  </div>
                </div>

                <div className="preferences-list">
                  {notificationOptions.map((option) => (
                    <label key={option.id} className="preference-row">
                      <input
                        type="checkbox"
                        checked={preferences[option.id]}
                        onChange={() => togglePreference(option.id)}
                      />
                      <div>
                        <p className="preference-title">{option.label}</p>
                        <p className="preference-desc">{option.description}</p>
                      </div>
                    </label>
                  ))}
                </div>

                <div className="success-banner">
                  <div className="success-banner-icon">🎉</div>
                  <div className="success-banner-body">
                    <p className="success-banner-title">You’re All Set!</p>
                    <p className="success-banner-text">Click "Complete Setup" to start maximizing your credit card rewards with OnPoint.</p>
                    <div className="summary-grid">
                      <div>
                        <p className="summary-label">Cards Added</p>
                        <p className="summary-value">{totalSelectedCards}</p>
                      </div>
                      <div>
                        <p className="summary-label">Notifications On</p>
                        <p className="summary-value">{enabledNotifications}</p>
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
