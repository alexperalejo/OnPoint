// shows steps like Sign up -> Add Cards ->Add Extension

import './Steps.css';

export function Steps() {
  const steps = [
    { number: 1, text: 'Sign up' },
    { number: 2, text: 'Enter Cards' },
    { number: 3, text: 'Add Extension' }
  ];

  return (
    <div className="steps-section">
      <div className="steps-grid">
        {steps.map((step) => (
          <div key={step.number} className="step-item">
            <p className="step-text">
              <span className="step-number">Step {step.number}:</span>
              <span>{step.text}</span>
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
