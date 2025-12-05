import './Onboarding.css';

export function Onboarding({ onBack }) {
  return (
    <div className="onboarding-page">
      <div className="onboarding-card">
        <div className="onboarding-header">
          <div className="onboarding-logo-container">
            <div className="onboarding-logo">
              <div className="logo-text-white">On</div>
              <div className="logo-dot-white"></div>
            </div>
          </div>
          <h1 className="onboarding-title">Welcome to OnPoint</h1>
          <p className="onboarding-subtitle">Get started with smart credit card recommendations</p>
        </div>

        <div className="onboarding-form">
          <div className="form-group">
            <label className="form-label">Email</label>
            <input 
              type="email" 
              placeholder="Enter your email"
              className="form-input"
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Password</label>
            <input 
              type="password" 
              placeholder="Enter your password"
              className="form-input"
            />
          </div>

          <button className="btn-continue">
            Continue
          </button>

          <button 
            onClick={onBack}
            className="btn-back"
          >
            Back to Home
          </button>
        </div>

        <p className="onboarding-footer">
          By continuing, you agree to our Terms & Privacy Policy
        </p>
      </div>
    </div>
  );
}
