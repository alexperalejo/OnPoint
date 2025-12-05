import { useState, useEffect } from "react";
import { Dashboard } from "./components/Dashboard";
import { CheckoutSimulator } from "./components/CheckoutSimulator";
import { CardLibrary } from "./components/CardLibrary";
import { CheckoutDetector } from "./components/CheckoutDetector";
import { Onboarding } from "./components/Onboarding";
import {
  CreditCardIcon,
  ShoppingCartIcon,
  BookOpenIcon,
  HomeIcon,
  Cog6ToothIcon,
} from "@heroicons/react/24/outline";
import { UserProfile } from "./components/UserProfile";

export default function App() {
  // Check if opened as full page (from URL parameter) or as popup
  const [isFullPage, setIsFullPage] = useState(false);
  const [currentView, setCurrentView] = useState("detector");

  useEffect(() => {
    // Check if this is opened with ?fullpage=true parameter
    const params = new URLSearchParams(window.location.search);
    const isFullPageMode = params.get('fullpage') === 'true';
    const view = params.get('view');
    
    setIsFullPage(isFullPageMode);
    if (view) {
      setCurrentView(view);
    }
  }, []);

  // Load user data from localStorage
  const [userData, setUserData] = useState(() => {
    const saved = localStorage.getItem("onpoint_user_data");
    return saved ? JSON.parse(saved) : null;
  });

  const [userCards, setUserCards] = useState(() => {
    if (userData?.cards) {
      return userData.cards.map((card, idx) => ({
        ...card,
        id: idx.toString(),
      }));
    }
    return [
      {
        id: "1",
        name: "Chase Freedom Unlimited",
        issuer: "Chase",
        type: "cashback",
        annualFee: 0,
        color: "#1E3A8A",
        rewards: [
          {
            category: "dining",
            rate: 3,
            details: "Including takeout and delivery",
          },
          { category: "drugstore", rate: 3 },
          {
            category: "travel",
            rate: 5,
            details: "Through Chase Travel Portal",
          },
          { category: "all", rate: 1.5 },
        ],
      },
      {
        id: "2",
        name: "American Express Gold",
        issuer: "Amex",
        type: "travel",
        annualFee: 250,
        color: "#D4AF37",
        rewards: [
          {
            category: "dining",
            rate: 4,
            details: "Worldwide at restaurants",
          },
          {
            category: "groceries",
            rate: 4,
            details: "At US supermarkets (up to $25k/year)",
          },
          { category: "all", rate: 1 },
        ],
      },
    ];
  });

  const handleOnboardingComplete = (data) => {
    localStorage.setItem("onpoint_user_data", JSON.stringify(data));
    setUserData(data);
    
    if (data.cards && data.cards.length > 0) {
      setUserCards(
        data.cards.map((card, idx) => ({
          ...card,
          id: idx.toString(),
        }))
      );
    }
    
    // If full page, go to dashboard. If popup, close window
    if (isFullPage) {
      setCurrentView("dashboard");
    } else {
      window.close();
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("onpoint_user_data");
    setUserData(null);
    setUserCards([]);
    setCurrentView("detector");
  };

  // If opened as full page with onboarding intent, always show onboarding (even if logged in)
  if (isFullPage && currentView === "onboarding") {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  // In extension popup, ALWAYS show checkout detector (no dashboard)
  // Dashboard is only for full web app, not extension
  if (!isFullPage) {
    return <CheckoutDetector />;
  }

  // Full page mode - show navigation and different views
  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(to bottom right, #eff6ff, #e0e7ff)',
      fontFamily: 'Poppins, sans-serif'
    }}>
      {/* Header */}
      <header style={{ 
        background: 'white', 
        boxShadow: '0 1px 2px rgba(0,0,0,0.05)', 
        borderBottom: '1px solid #e5e7eb' 
      }}>
        <div style={{ 
          maxWidth: '1280px', 
          margin: '0 auto', 
          padding: '16px', 
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between' 
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <img 
                src={chrome.runtime.getURL('icons/discord.jpg')}
                alt="OnPoint Logo" 
                style={{ 
                  width: '40px', 
                  height: '40px', 
                  borderRadius: '8px',
                  objectFit: 'cover'
                }} 
              />
              <div>
                <h1 style={{ fontSize: '20px', fontWeight: 'bold' }}>OnPoint</h1>
                <p style={{ fontSize: '14px', color: '#6b7280' }}>
                  Maximize Your Rewards
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {userData && (
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '14px', fontWeight: '500' }}>Welcome back,</p>
                  <p style={{ fontSize: '14px', fontWeight: 'bold' }}>
                    {userData.name.split(" ")[0]}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav style={{ background: 'white', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 16px' }}>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={() => setCurrentView("detector")}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 16px',
                borderBottom: currentView === "detector" ? '2px solid #2563eb' : '2px solid transparent',
                color: currentView === "detector" ? '#2563eb' : '#6b7280',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                if (currentView !== "detector") {
                  e.currentTarget.style.color = '#374151';
                  e.currentTarget.style.borderBottom = '2px solid #d1d5db';
                }
              }}
              onMouseLeave={(e) => {
                if (currentView !== "detector") {
                  e.currentTarget.style.color = '#6b7280';
                  e.currentTarget.style.borderBottom = '2px solid transparent';
                }
              }}
            >
              <HomeIcon style={{ width: '16px', height: '16px' }} />
              Dashboard
            </button>
            <button
              onClick={() => setCurrentView("checkout")}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 16px',
                borderBottom: currentView === "checkout" ? '2px solid #2563eb' : '2px solid transparent',
                color: currentView === "checkout" ? '#2563eb' : '#6b7280',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                if (currentView !== "checkout") {
                  e.currentTarget.style.color = '#374151';
                  e.currentTarget.style.borderBottom = '2px solid #d1d5db';
                }
              }}
              onMouseLeave={(e) => {
                if (currentView !== "checkout") {
                  e.currentTarget.style.color = '#6b7280';
                  e.currentTarget.style.borderBottom = '2px solid transparent';
                }
              }}
            >
              <ShoppingCartIcon style={{ width: '16px', height: '16px' }} />
              Checkout Simulator
            </button>
            <button
              onClick={() => setCurrentView("library")}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 16px',
                borderBottom: currentView === "library" ? '2px solid #2563eb' : '2px solid transparent',
                color: currentView === "library" ? '#2563eb' : '#6b7280',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                if (currentView !== "library") {
                  e.currentTarget.style.color = '#374151';
                  e.currentTarget.style.borderBottom = '2px solid #d1d5db';
                }
              }}
              onMouseLeave={(e) => {
                if (currentView !== "library") {
                  e.currentTarget.style.color = '#6b7280';
                  e.currentTarget.style.borderBottom = '2px solid transparent';
                }
              }}
            >
              <BookOpenIcon style={{ width: '16px', height: '16px' }} />
              Card Library
            </button>
            <button
              onClick={() => setCurrentView("profile")}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 16px',
                borderBottom: currentView === "profile" ? '2px solid #2563eb' : '2px solid transparent',
                color: currentView === "profile" ? '#2563eb' : '#6b7280',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                if (currentView !== "profile") {
                  e.currentTarget.style.color = '#374151';
                  e.currentTarget.style.borderBottom = '2px solid #d1d5db';
                }
              }}
              onMouseLeave={(e) => {
                if (currentView !== "profile") {
                  e.currentTarget.style.color = '#6b7280';
                  e.currentTarget.style.borderBottom = '2px solid transparent';
                }
              }}
            >
              <Cog6ToothIcon style={{ width: '16px', height: '16px' }} />
              Profile
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main style={{ 
        maxWidth: '1280px', 
        margin: '0 auto', 
        padding: '32px 16px' 
      }}>
        {currentView === "detector" && (
          <CheckoutDetector onSignUpClick={() => setCurrentView("onboarding")} />
        )}
        {currentView === "dashboard" && (
          <Dashboard cards={userCards} setCards={setUserCards} />
        )}
        {currentView === "checkout" && (
          <CheckoutSimulator cards={userCards} />
        )}
        {currentView === "library" && (
          <CardLibrary userCards={userCards} setUserCards={setUserCards} />
        )}
        {currentView === "profile" && (
          <UserProfile userData={userData} handleLogout={handleLogout} />
        )}
      </main>
    </div>
  );
}
