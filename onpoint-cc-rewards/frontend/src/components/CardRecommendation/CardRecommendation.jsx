
import { getCardImage } from "../../utils/cardImageMap";
export function CardRecommendation({ card, onApply, onDismiss }) {
  if (!card) return null;

  return (
    <div style={{
      background: 'white',
      border: '2px solid #e5e7eb',
      borderRadius: '8px',
      padding: '12px',
      marginTop: '12px',
      fontSize: '14px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'start',
        marginBottom: '12px'
      }}>
        <h3 style={{ 
          margin: 0, 
          fontSize: '16px', 
          fontWeight: '600',
          color: '#111827'
        }}>
          💡 Recommended Card
        </h3>
        <button
          onClick={onDismiss}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '18px',
            cursor: 'pointer',
            padding: 0,
            color: '#6b7280'
          }}
        >
          ✕
        </button>
      </div>

      <div style={{
        padding: '12px',
        background: card.color || '#1E3A8A',
        borderRadius: '6px',
        color: 'white',
        marginBottom: '12px'
      }}>
        <img
          src={getCardImage(card.imageKey)}
          alt={card.name}
          style={{
            width: '100%',
            maxWidth: '260px',
            borderRadius: '10px',
            marginBottom: '8px',
            display: 'block'
          }}
        />

        <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>
          {card.name}
        </div>

          {card.name}
        
        </div>
        <div style={{ fontSize: '12px', opacity: 0.9 }}>
          {card.issuer}
        </div>
        {card.annualFee !== undefined && (
          <div style={{ fontSize: '12px', marginTop: '4px' }}>
            Annual Fee: ${card.annualFee}
          </div>
        )}
      

      {card.rewards && card.rewards.length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          <div style={{ 
            fontSize: '12px', 
            fontWeight: '600', 
            color: '#374151',
            marginBottom: '6px'
          }}>
            Top Rewards:
          </div>
          <ul style={{ 
            margin: 0, 
            paddingLeft: '16px',
            fontSize: '12px',
            color: '#4b5563'
          }}>
            {card.rewards.slice(0, 2).map((reward, idx) => (
              <li key={idx} style={{ marginBottom: '4px' }}>
                {reward.category}: {reward.rate}x
                {reward.details && ` (${reward.details})`}
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        onClick={() => onApply(card)}
        style={{
          width: '100%',
          padding: '10px',
          background: '#059669',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          fontWeight: '500',
          cursor: 'pointer',
          fontSize: '14px'
        }}
        onMouseOver={(e) => e.target.style.background = '#047857'}
        onMouseOut={(e) => e.target.style.background = '#059669'}
      >
        Use This Card
      </button>

      <div style={{
        marginTop: '12px',
        padding: '8px',
        background: '#f3f4f6',
        borderRadius: '4px',
        fontSize: '11px',
        color: '#6b7280'
      }}>
        ℹ️ This card offers the best rewards for this type of purchase based on your profile.
      </div>
    </div>
  );
}
