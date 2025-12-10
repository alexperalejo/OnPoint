import { useState, useCallback } from 'react';
import './CardLibrary.css';

const POPULAR_CARDS = [
  {
    name: 'Chase Freedom Unlimited',
    issuer: 'Chase',
    type: 'cashback',
    annualFee: 0,
    color: '#1E3A8A',
    rewards: [
      { category: 'Dining', rate: 3 },
      { category: 'Drugstore', rate: 3 },
      { category: 'Travel', rate: 5 },
      { category: 'All', rate: 1.5 }
    ]
  },
  {
    name: 'Chase Sapphire Preferred',
    issuer: 'Chase',
    type: 'travel',
    annualFee: 95,
    color: '#0A2463',
    rewards: [
      { category: 'Travel', rate: 2 },
      { category: 'Dining', rate: 3 },
      { category: 'All', rate: 1 }
    ]
  },
  {
    name: 'American Express Gold',
    issuer: 'Amex',
    type: 'travel',
    annualFee: 250,
    color: '#D4AF37',
    rewards: [
      { category: 'Dining', rate: 4 },
      { category: 'Groceries', rate: 4 },
      { category: 'All', rate: 1 }
    ]
  },
  {
    name: 'Citi Double Cash',
    issuer: 'Citi',
    type: 'cashback',
    annualFee: 0,
    color: '#003B6F',
    rewards: [
      { category: 'All', rate: 2 }
    ]
  },
  {
    name: 'Capital One SavorOne',
    issuer: 'Capital One',
    type: 'cashback',
    annualFee: 0,
    color: '#CC0000',
    rewards: [
      { category: 'Dining', rate: 3 },
      { category: 'Entertainment', rate: 3 },
      { category: 'Groceries', rate: 3 },
      { category: 'All', rate: 1 }
    ]
  },
  {
    name: 'Discover it Cash Back',
    issuer: 'Discover',
    type: 'cashback',
    annualFee: 0,
    color: '#FF6000',
    rewards: [
      { category: 'Rotating', rate: 5 },
      { category: 'All', rate: 1 }
    ]
  },
  {
    name: 'Capital One Venture X',
    issuer: 'Capital One',
    type: 'travel',
    annualFee: 395,
    color: '#000000',
    rewards: [
      { category: 'Travel', rate: 5 },
      { category: 'All', rate: 2 }
    ]
  },
  {
    name: 'Blue Cash Preferred',
    issuer: 'Amex',
    type: 'cashback',
    annualFee: 95,
    color: '#006FCF',
    rewards: [
      { category: 'Groceries', rate: 6 },
      { category: 'Streaming', rate: 6 },
      { category: 'Gas', rate: 3 },
      { category: 'All', rate: 1 }
    ]
  },
  {
    name: 'Chase Freedom Flex',
    issuer: 'Chase',
    type: 'cashback',
    annualFee: 0,
    color: '#002D72',
    rewards: [
      { category: 'Rotating', rate: 5 },
      { category: 'Dining', rate: 3 },
      { category: 'Drugstore', rate: 3 },
      { category: 'All', rate: 1 }
    ]
  }
];

export default function CardLibrary({ userCards = [], setUserCards }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  const isCardAdded = (cardName) => {
    return userCards.some(c => c.name === cardName);
  };

  const handleAddCard = useCallback((card) => {
    if (!userCards.some(c => c.name === card.name)) {
      const newCard = { ...card, id: `${card.name}-${Math.random().toString(36).substr(2, 9)}` };
      setUserCards([...userCards, newCard]);
    }
  }, [userCards, setUserCards]);

  const filteredCards = POPULAR_CARDS.filter(card => {
    const matchesSearch = card.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         card.issuer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || card.type === filterType;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="card-library-shell">
      <div className="library-header">
        <h2 className="library-title">Card Library</h2>
        <p className="library-subtitle">
          Browse popular credit cards and add them to your wallet. Each card's rewards structure is
          pre-configured so you can immediately start getting recommendations.
        </p>
      </div>

      <div className="library-controls">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search cards by name or issuer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-pills">
          <button
            className={`filter-pill ${filterType === 'all' ? 'active' : ''}`}
            onClick={() => setFilterType('all')}
          >
            All
          </button>
          <button
            className={`filter-pill ${filterType === 'cashback' ? 'active' : ''}`}
            onClick={() => setFilterType('cashback')}
          >
            Cashback
          </button>
          <button
            className={`filter-pill ${filterType === 'travel' ? 'active' : ''}`}
            onClick={() => setFilterType('travel')}
          >
            Travel
          </button>
        </div>
      </div>

      <div className="library-grid">
        {filteredCards.map((card, idx) => (
          <div key={idx} className="library-card">
            <div className="card-visual" style={{ background: card.color }}>
              <p className="card-issuer">{card.issuer}</p>
              <p className="card-name">{card.name}</p>
              <div className="card-chip"></div>
            </div>
            <div className="card-details">
              <div className="card-meta">
                <span className="meta-label">Annual Fee</span>
                <span className={`meta-value ${card.annualFee === 0 ? 'free' : ''}`}>
                  ${card.annualFee}
                </span>
              </div>
              <div className="card-rewards">
                <p className="rewards-label">Rewards:</p>
                <ul className="rewards-list">
                  {card.rewards.slice(0, 3).map((reward, i) => (
                    <li key={i}>{reward.category}: {reward.rate}%</li>
                  ))}
                  {card.rewards.length > 3 && <li>+{card.rewards.length - 3} more</li>}
                </ul>
              </div>
              {isCardAdded(card.name) ? (
                <button className="add-card-btn added" disabled>
                  Already Added
                </button>
              ) : (
                <button
                  className="add-card-btn"
                  onClick={() => handleAddCard(card)}
                >
                  Add to Wallet
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
