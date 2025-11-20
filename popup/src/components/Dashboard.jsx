export function Dashboard({ cards, setCards }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ 
        background: 'white', 
        borderRadius: '8px', 
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)', 
        padding: '24px' 
      }}>
        <h2 style={{ 
          fontSize: '24px', 
          fontWeight: 'bold', 
          color: '#111827', 
          marginBottom: '16px' 
        }}>Dashboard</h2>
        <p style={{ color: '#4b5563' }}>
          Welcome to OnPoint! Your personalized credit card rewards dashboard.
        </p>
      </div>

      <div style={{ 
        background: 'white', 
        borderRadius: '8px', 
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)', 
        padding: '24px' 
      }}>
        <h3 style={{ 
          fontSize: '18px', 
          fontWeight: '600', 
          color: '#111827', 
          marginBottom: '16px' 
        }}>Your Cards</h3>
        {cards.length === 0 ? (
          <p style={{ color: '#6b7280' }}>No cards added yet. Visit the Card Library to add cards.</p>
        ) : (
          <div style={{ 
            display: 'grid', 
            gap: '16px', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))' 
          }}>
            {cards.map((card) => (
              <div
                key={card.id}
                style={{ 
                  padding: '16px', 
                  borderRadius: '8px', 
                  border: '2px solid #e5e7eb',
                  borderLeft: `4px solid ${card.color}`,
                  transition: 'border-color 0.2s',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = '#60a5fa'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
              >
                <h4 style={{ fontWeight: 'bold', color: '#111827', marginBottom: '4px' }}>{card.name}</h4>
                <p style={{ fontSize: '14px', color: '#4b5563', marginBottom: '8px' }}>{card.issuer}</p>
                <p style={{ fontSize: '12px', color: '#6b7280' }}>
                  Annual Fee: ${card.annualFee}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
