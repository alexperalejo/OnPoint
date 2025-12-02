/*OnPoint homepage features*/

import './FeatureCards.css';

export function FeatureCards() {
  const features = [
    {
      title: 'Maximize Benefits',
      description: 'Recommends best card to maximize card benefits',
      pattern: 'checkout-popup'
    },
    {
      title: 'Track Rewards & Savings',
      description: 'Keep track of points, and how much you have saved',
      pattern: 'savings-chart'
    },
    {
      title: 'Pick the best card for you',
      description: 'Select the credit card that best fit your needs',
      pattern: 'card-selection'
    }
  ];

  const yearData = [
    { month: 'J', amount: 145, height: 55 },
    { month: 'F', amount: 178, height: 70 },
    { month: 'M', amount: 198, height: 80 },
    { month: 'A', amount: 156, height: 60 },
    { month: 'M', amount: 234, height: 95 },
    { month: 'J', amount: 267, height: 100 },
    { month: 'J', amount: 189, height: 75 },
    { month: 'A', amount: 223, height: 90 },
    { month: 'S', amount: 201, height: 82 },
    { month: 'O', amount: 176, height: 68 },
    { month: 'N', amount: 145, height: 55 },
    { month: 'D', amount: 198, height: 80 }
  ];

  return (
    <div className="feature-cards-grid">
      {features.map((feature, index) => (
        <div 
          key={index}
          className="feature-card"
        >
          <h3 className="feature-title">{feature.title}</h3>
          <p className="feature-description">{feature.description}</p>
          <div className={`feature-mockup ${feature.pattern}`}>
            {feature.pattern === 'checkout-popup' && (
              <div className="mockup-content">
                {/* Checkout page background */}
                <div className="checkout-bg">
                  <div className="checkout-header">Checkout</div>
                  
                  {/* Cart items */}
                  <div className="cart-items">
                    <div className="cart-item">
                      <div className="item-name">Wireless Headphones</div>
                      <div className="item-price">$89.99</div>
                    </div>
                    <div className="cart-item">
                      <div className="item-name">Phone Case</div>
                      <div className="item-price">$24.99</div>
                    </div>
                  </div>
                  
                  {/* Total */}
                  <div className="cart-total">
                    <div className="total-label">Total:</div>
                    <div className="total-amount">$114.98</div>
                  </div>
                </div>
                
                {/* Popup recommendation */}
                <div className="recommendation-popup">
                  <div className="popup-content">
                    <div className="popup-icon">💳</div>
                    <div className="popup-details">
                      <div className="popup-label">Recommended Card</div>
                      <div className="recommended-card">
                        <div className="card-name">Chase Sapphire Preferred</div>
                      </div>
                      <div className="popup-benefit">✓ Earn +230 bonus points</div>
                      <div className="popup-info">3x points on this purchase</div>
                    </div>
                  </div>
                  <button className="popup-button">Use This Card</button>
                </div>
              </div>
            )}
            {feature.pattern === 'savings-chart' && (
              <div className="chart-content">
                <div className="chart-title">2024 Yearly Savings</div>
                <div className="chart-total">Total: $2,310 saved</div>
                <div className="chart-bars">
                  {yearData.map((monthData, idx) => (
                    <div key={idx} className="chart-bar-container">
                      <div 
                        className="chart-bar"
                        style={{ height: `${monthData.height * 0.5}px` }}
                      ></div>
                      <div className="chart-label">{monthData.month}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {feature.pattern === 'card-selection' && (
              <div className="card-selection-content">
                <div className="selection-title">Select Your Card</div>
                <div className="card-list">
                  <div className="credit-card chase">
                    <div className="card-title">Chase Freedom Unlimited</div>
                    <div className="card-reward">1.5% cash back</div>
                  </div>
                  <div className="credit-card quicksilver">
                    <div className="card-title">Capital One Quicksilver</div>
                    <div className="card-reward">1.5% cash back</div>
                  </div>
                  <div className="credit-card amex">
                    <div className="card-title">Blue Cash Everyday</div>
                    <div className="card-reward">3% groceries</div>
                  </div>
                  <div className="credit-card savor">
                    <div className="card-title">Capital One Savor</div>
                    <div className="card-reward">4% dining</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
