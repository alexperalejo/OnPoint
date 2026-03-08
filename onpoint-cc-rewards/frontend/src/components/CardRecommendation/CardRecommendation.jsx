
import { getCardImage } from "../../utils/cardImageMap";
import './CardRecommendation.css';

export function CardRecommendation({ card, onApply, onDismiss }) {
  if (!card) return null;
  return (
    <div className="card-recommendation">
      <div className="cr-header">
        <h3 className="cr-title">💡 Recommended Card</h3>
        <button onClick={onDismiss} className="cr-close">✕</button>
      </div>

      <div className="cr-visual" style={{ background: card.color || '#1E3A8A' }}>
        <img src={getCardImage(card.imageKey)} alt={card.name} className="cr-image" />

        <div className="cr-name">{card.name}</div>
      </div>

      <div className="cr-issuer">{card.issuer}</div>
      {card.annualFee !== undefined && (
        <div className="cr-fee">Annual Fee: ${card.annualFee}</div>
      )}

      {card.rewards && card.rewards.length > 0 && (
        <div className="cr-rewards">
          <div className="cr-rewards-title">Top Rewards:</div>
          <ul className="cr-rewards-list">
            {card.rewards.slice(0, 2).map((reward, idx) => (
              <li key={idx}>{reward.category}: {reward.rate}x{reward.details && ` (${reward.details})`}</li>
            ))}
          </ul>
        </div>
      )}

      <button onClick={() => onApply(card)} className="cr-apply">Use This Card</button>

      <div className="cr-info">ℹ️ This card offers the best rewards for this type of purchase based on your profile.</div>
    </div>
  );
}
