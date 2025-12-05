/*Header jsx*/

import './Header.css';

export function Header({ onAuthClick }) {
  return (
    <header className="header">
      <div className="header-container">
        <div className="header-content">
          <div className="logo-section">
            {/* Logo */}
            <div className="logo">
              <div className="logo-text">On</div>
              <div className="logo-dot"></div>
            </div>
            
            {/* Text */}
            <div>
              <h1 className="site-title">OnPoint</h1>
              <p className="site-tagline">Use your card wisely.</p>
            </div>
          </div>
          <div className="auth-buttons">
            <button 
              onClick={onAuthClick}
              className="btn btn-login"
            >
              Log in
            </button>
            <button 
              onClick={onAuthClick}
              className="btn btn-signup"
            >
              Sign up
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
