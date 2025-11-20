export function UserProfile({ userData, handleLogout }) {
  return (
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
      }}>Profile</h2>
      
      {userData && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ 
              fontSize: '14px', 
              fontWeight: '500', 
              color: '#374151', 
              display: 'block', 
              marginBottom: '4px' 
            }}>Name</label>
            <p style={{ color: '#111827' }}>{userData.name}</p>
          </div>
          
          {userData.email && (
            <div>
              <label style={{ 
                fontSize: '14px', 
                fontWeight: '500', 
                color: '#374151', 
                display: 'block', 
                marginBottom: '4px' 
              }}>Email</label>
              <p style={{ color: '#111827' }}>{userData.email}</p>
            </div>
          )}

          <div style={{ paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
            <button
              onClick={handleLogout}
              style={{
                padding: '8px 16px',
                background: '#dc2626',
                color: 'white',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#b91c1c'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#dc2626'}
            >
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
