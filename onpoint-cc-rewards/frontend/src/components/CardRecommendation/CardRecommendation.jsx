import { useState } from 'react';
import './CardRecommendation.css';
// This will be redesigned as cardChoice since i can use for both checkout and purchase recommendations,
// but for now just reuse the component and styles from the purchase recommendation work.
export function CardRecommendation({ card, onApply, onDismiss, total, reason }) {
  const [showDetails, setShowDetails] = useState(false);

  if (!card) return null;

  const isDark =
    window.matchMedia?.('(prefers-color-scheme: dark)').matches ||
    document.documentElement.classList.contains('dark');

  // Calculate rewards earned if total is available
  const rewardRate = card.rewardPoints || 0;
  const rewardsEarned = total ? ((rewardRate / 100) * total).toFixed(2) : null;

  return (
    <div
      className="card-recommendation"
      role="region"
      aria-label="Card Recommendation"
      style={{
        '--cr-bg': isDark ? '#111827' : '#ffffff',
        '--cr-border': isDark ? '#111827' : '#dbe2ea',
        '--cr-text': isDark ? '#e5e7eb' : '#334155',
        '--cr-title': isDark ? '#f8fafc' : '#0f172a',
        '--cr-name': isDark ? '#f8fafc' : '#0f172a',
        '--cr-subtle': isDark ? '#d1d5db' : '#475569',
        '--cr-muted': isDark ? '#9ca3af' : '#64748b',
        '--cr-dismiss': isDark ? '#f87171' : '#dc2626',
        '--cr-dismiss-border': isDark ? '#f87171' : '#ef4444',
        '--cr-dismiss-hover-bg': isDark ? 'rgba(248, 113, 113, 0.12)' : 'rgba(239, 68, 68, 0.09)',
        '--cr-dismiss-hover': isDark ? '#fca5a5' : '#b91c1c',
        '--cr-info-bg': isDark ? '#1f2937' : '#f8fafc',
        '--cr-info-border': isDark ? '#374151' : '#e2e8f0',
        '--cr-info-text': isDark ? '#9ca3af' : '#64748b'
      }}
    >
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
        <img src={card.image_url} alt={card.name} className="cr-image" />
        
      </div>

      <div className="cr-card-name">{card.name}</div>

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
      <button
        className="cr-details-toggle"
        onClick={() => setShowDetails(!showDetails)}
      >
        Show Details {showDetails ? '▲' : '▼'}
      </button>

      {showDetails && (
        <div className="cr-details-panel">
          {total && (
            <div className="cr-details-row">
              <span>Total:</span>
              <span>${Number(total).toFixed(2)}</span>
            </div>
          )}
          <div className="cr-details-row">
            <span>Reward Rate:</span>
            <span>{rewardRate}% Cashback</span>
          </div>
          {rewardsEarned && (
            <div className="cr-details-row">
              <span>Rewards Earned:</span>
              <span>${rewardsEarned}</span>
            </div>
          )}
          {reason && (
            <div className="cr-details-reason">{reason}</div>
          )}
          <button
            className="cr-details-close"
            onClick={() => setShowDetails(false)}
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}
