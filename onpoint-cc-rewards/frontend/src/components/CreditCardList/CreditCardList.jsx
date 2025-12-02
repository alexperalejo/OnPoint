// Credit Card List component

import './CreditCardList.css';

export function CreditCardList() {
  const logos = [
    <div key="citi" className="logo-citi">citi</div>,
    <div key="chase" className="logo-chase">
      <span className="chase-text">CHASE</span>
      <div className="chase-circle"></div>
    </div>,
    <div key="amex" className="logo-amex">
      <div className="amex-line">AMERICAN</div>
      <div className="amex-line">EXPRESS</div>
    </div>,
    <div key="discover" className="logo-discover">
      <span>DISC</span>
      <div className="discover-circle"></div>
      <span>VER</span>
    </div>,
    <div key="capital" className="logo-capital">Capital One</div>
  ];

  return (
    <div className="credit-card-list">
      <h2 className="list-title">Credit Card List</h2>
      <div className="logos-container">
        <div className="logos-scroll">
          {[...logos, ...logos, ...logos].map((logo, index) => (
            <div key={index} className="logo-item">
              {logo}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
