
import { getCardImage } from "../../utils/cardImageMap";
import './CardRecommendation.css';
// This will be redesigned as cardChoice since i can use for both checkout and purchase recommendations,
// but for now just reuse the component and styles from the purchase recommendation work.
export function CardRecommendation({ card, onApply, onDismiss }) {
  if (!card) return null;
  return (
    <div className="card-recommendation" role="region" aria-label="Card Recommendation">
      <div className="cr-header">
        <h3 className="cr-title">Recommended card for this transaction</h3>
      </div>

      {/* Clickable card visual — keyboard-accessible via role+tabIndex */}
      <div
        className="cr-visual"
        onClick={() => onApply(card)}
        role="button"
        tabIndex={0}
        aria-label={`Select ${card.name}`}
        title={`Use ${card.name}`}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onApply(card); } }}
      >
        <div className="cr-name">{card.name}</div>
        <img src={getCardImage(card.imageKey)} alt={card.name} className="cr-image" />
        
      </div>

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

      <button onClick={() => onDismiss(card)} className="cr-dismiss">Dismiss</button>
    </div>
  );
}
