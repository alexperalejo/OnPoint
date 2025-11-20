import { useState } from "react";

export function Onboarding({ onComplete }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    cards: [],
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (step === 1 && formData.name && formData.email) {
      // Move to card selection (for future implementation)
      // For now, complete onboarding with user data
      onComplete(formData);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(to top, #fbc2eb 0%, #a6c1ee 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      fontFamily: 'Poppins, system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        padding: '32px',
        maxWidth: '448px',
        width: '100%'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ 
            fontSize: '30px', 
            fontWeight: 'bold', 
            color: '#111827',
            marginBottom: '8px',
            margin: 0
          }}>
            Welcome to OnPoint
          </h1>
          <p style={{ color: '#4b5563', fontSize: '16px', margin: '8px 0 0 0' }}>
            Let's get started with your credit card rewards journey
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div>
            <label
              htmlFor="name"
              style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '8px'
              }}
            >
              Full Name
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              style={{
                width: '100%',
                padding: '10px 16px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '16px',
                boxSizing: 'border-box'
              }}
              placeholder="John Doe"
              required
            />
          </div>

          <div>
            <label
              htmlFor="email"
              style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '8px'
              }}
            >
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              style={{
                width: '100%',
                padding: '10px 16px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '16px',
                boxSizing: 'border-box'
              }}
              placeholder="john@example.com"
              required
            />
          </div>

          <button
            type="submit"
            style={{
              width: '100%',
              background: '#2563eb',
              color: 'white',
              padding: '12px',
              borderRadius: '8px',
              border: 'none',
              fontWeight: '500',
              fontSize: '16px',
              cursor: 'pointer'
            }}
            onMouseOver={(e) => e.target.style.background = '#1d4ed8'}
            onMouseOut={(e) => e.target.style.background = '#2563eb'}
          >
            Get Started
          </button>
        </form>

        <p style={{ 
          fontSize: '12px', 
          color: '#6b7280', 
          textAlign: 'center', 
          marginTop: '24px',
          lineHeight: '1.5'
        }}>
          By continuing, you agree to our Terms of Service and Privacy Policy.
          <br />
          <span style={{ fontStyle: 'italic' }}>
            (Backend integration with MongoDB/Firebase coming soon)
          </span>
        </p>
      </div>
    </div>
  );
}
