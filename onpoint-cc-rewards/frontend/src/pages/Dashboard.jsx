import { useState } from 'react';
import './Dashboard.css';
import CardLibrary from './CardLibrary.jsx';
import UserProfile from './UserProfile.jsx';

export default function Dashboard({ onSignOut }) {
  const [currentView, setCurrentView] = useState('dashboard'); // dashboard | library | profile
  const [userCards, setUserCards] = useState([]);

  const totalAnnualFees = userCards.reduce((sum, card) => sum + card.annualFee, 0);
  const avgRewardRate = userCards.length > 0
    ? userCards.reduce((sum, card) => {
        const baseRate = card.rewards.find(r => r.category === 'All')?.rate || 1;
        return sum + baseRate;
      }, 0) / userCards.length
    : 0;

  return (
    <div className="dash-shell">
      <header className="dash-topbar">
        <div className="brand">
          <span className="brand-icon">▦</span>
          <div>
            <p className="brand-name">OnPoint</p>
            <p className="brand-tag">Maximize Your Rewards</p>
          </div>
        </div>
        <div className="nav-actions">
          <p className="welcome">Welcome back, <strong>OnPoint member</strong></p>
          {onSignOut && (
            <button className="link-btn" onClick={onSignOut}>Sign out</button>
          )}
        </div>
      </header>

      <nav className="dash-nav">
        <button
          className={`nav-item ${currentView === 'dashboard' ? 'is-active' : ''}`}
          onClick={() => setCurrentView('dashboard')}
        >
          Dashboard
        </button>
        <button
          className={`nav-item ${currentView === 'library' ? 'is-active' : ''}`}
          onClick={() => setCurrentView('library')}
        >
          Card Library
        </button>
        <button
          className={`nav-item ${currentView === 'profile' ? 'is-active' : ''}`}
          onClick={() => setCurrentView('profile')}
        >
          Profile
        </button>
      </nav>

      {currentView === 'dashboard' && (
        <main className="dash-main">
          <section className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">💳</div>
              <div>
                <p className="stat-label">Total Cards</p>
                <p className="stat-value">{userCards.length}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon success">📈</div>
              <div>
                <p className="stat-label">Avg. Base Rate</p>
                <p className="stat-value">{avgRewardRate.toFixed(1)}%</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon violet">💲</div>
              <div>
                <p className="stat-label">Annual Fees</p>
                <p className="stat-value">${totalAnnualFees}</p>
              </div>
            </div>
          </section>

          <section className="tip-banner">
            <div className="tip-left">
              <div className="tip-icon">🏅</div>
              <div>
                <p className="tip-title">Smart Tip</p>
                <p className="tip-text">
                  {userCards.length === 0
                    ? "Visit the Card Library to add your first credit card and start getting personalized recommendations!"
                    : userCards.length === 1
                    ? "Great start! Add more cards from the Card Library to maximize rewards across different categories."
                    : "Great wallet! Use the Card Library to discover new cards that complement your spending."}
                </p>
              </div>
            </div>
          </section>

          <section className="cards-panel">
            <header className="cards-header">
              <p className="panel-title">Your Cards</p>
            </header>
            {userCards.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">💳</div>
                <p className="empty-title">No Cards Yet</p>
                <p className="empty-text">Visit the Card Library tab to browse and add credit cards to your wallet.</p>
              </div>
            ) : (
              <div className="user-cards-grid">
                {userCards.map((card) => (
                  <div key={card.id} className="user-card-item">
                    <div className="user-card-visual" style={{ background: card.color }}>
                      <p className="user-card-issuer">{card.issuer}</p>
                      <p className="user-card-name">{card.name}</p>
                    </div>
                    <div className="user-card-info">
                      <div className="user-card-meta">
                        <span>Annual Fee:</span>
                        <span className={card.annualFee === 0 ? 'free' : ''}>${card.annualFee}</span>
                      </div>
                      <div className="user-card-rewards">
                        <p className="rewards-heading">Reward Categories</p>
                        <ul>
                          {card.rewards.slice(0, 3).map((r, i) => (
                            <li key={i}>{r.category}: {r.rate}%</li>
                          ))}
                        </ul>
                      </div>
                      <button
                        className="remove-card-btn"
                        onClick={() => setUserCards(userCards.filter(c => c.id !== card.id))}
                      >
                        Remove Card
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>
      )}

      {currentView === 'library' && <CardLibrary userCards={userCards} setUserCards={setUserCards} />}

      {currentView === 'profile' && <UserProfile onSignOut={onSignOut} />}
    </div>
  );
}
