import { getCardImage } from '../utils/cardImageMap';
import { useState, useEffect, useCallback } from 'react';
import './CardLibrary.css';
import { useDarkMode } from '../hooks/useDarkMode';
import { useTranslation } from '../utils/translation';

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

const MUTED_CARD_COLORS = [
  '#1f3a5f',
  '#2b4a7d',
  '#355c7d',
  '#2f5d62',
  '#3b3f6b',
  '#6b4e71',
  '#7b5b3e',
  '#3f4c6b'
];

/*function getRandomHexColor() {
  return MUTED_CARD_COLORS[Math.floor(Math.random() * MUTED_CARD_COLORS.length)];
}*/
export default function CardLibrary({ userCards = [], addCard }) {
  useDarkMode(); // enables html.dark + CSS dark styles (system wins)
  const [searchTerm, setSearchTerm] = useState('');
  const [availableCards, setAvailableCards] = useState(POPULAR_CARDS);
  const [filterType, setFilterType] = useState('all');
  const translate = useTranslation("card-library");


  useEffect(() => {
    fetch("http://localhost:3000/api/cards").then(r => r.json())
    .then(data => {
      console.log(data)
      setAvailableCards(data.map(v => {
        return {
          id: v._id,
          name: v.name,
          issuer: v.issuer,
          annualFee: v.annualFee,
          imageKey: v.imageKey,
          rewards: v.attributes.filter(a => a.type != 'url').map(a => {
            if (a.type == "all") return { category: 'all', rate: a.multiplier };
            return { category: a.category, rate: a.multiplier };
          })
        };
      }))
    });
  }, []);

  useCallback()


  const isCardAdded = (cardName) => {
    return userCards.some(c => c.name === cardName);
  };

  const handleAddCard = (card) => {
    if (!isCardAdded(card.name)) {
      console.log('adding card', card)
      //if(!storedCards || storedCards.length == 0)
      //{
      //  Cookies.set("user-cards", card.id +'|')
      //} else{
      //  Cookies.set("user-cards", storedCards + card.id + '|')
      //}
      addCard(card);
    }
  };

  const filteredCards = availableCards.filter(card => {
    const matchesSearch = card.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         card.issuer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || card.type === filterType;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="card-library-shell">
      <div className="library-header">
        <h2 className="library-title">{translate("title")}</h2>
        <p className="library-subtitle">{translate("subtitle")}</p>
      </div>

      <div className="library-controls">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder={translate('search-cards-placeholder')} //Search cards by name or issuer...
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-pills">
          <button
            className={`filter-pill ${filterType === 'all' ? 'active' : ''}`}
            onClick={() => setFilterType('all')}
          >
            {translate("filter.all")}
          </button>
          <button
            className={`filter-pill ${filterType === 'cashback' ? 'active' : ''}`}
            onClick={() => setFilterType('cashback')}
          >
            {translate("filter.cashback")}
          </button>
          <button
            className={`filter-pill ${filterType === 'travel' ? 'active' : ''}`}
            onClick={() => setFilterType('travel')}
          >
            {translate("filter.travel")}
          </button>
        </div>
      </div>

      <div className="library-grid">
        {filteredCards.map((card) => (
          <div key={card.id || card.name} className="library-card">

            <div className="card-visual">
              <img
                src={getCardImage(card.imageKey)}
                alt={card.name}
                className="card-img"
              />
            </div>

            <div className="card-details">
              <div className="card-meta">
                <span className="meta-label">{translate("annual-fee")}</span>
                <span className={`meta-value ${card.annualFee === 0 ? 'free' : ''}`}>
                  {card.annualFee}
                </span>
              </div>
              <div className="card-rewards">
                <p className="rewards-label">{translate("rewards")}</p>
                <ul className="rewards-list">
                  {card.rewards.slice(0, 3).map((reward, i) => (
                    <li key={i}>{translate("card.category."+reward.category)}: {reward.rate}%</li>
                  ))}
                  {card.rewards.length > 3 && <li>+{card.rewards.length - 3} more</li>}
                </ul>
              </div>
              {isCardAdded(card.name) ? (
                <button className="add-card-btn added" disabled>
                  {translate("card-already-added")}
                </button>
              ) : (
                <button
                  className="add-card-btn"
                  onClick={() => handleAddCard(card)}
                >
                  {translate("add-to-wallet")}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
