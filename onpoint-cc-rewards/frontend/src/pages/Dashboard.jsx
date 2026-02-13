import { getCardImage } from "../utils/cardImageMap";
import { useState, useEffect, useCallback } from "react";
import "./Dashboard.css";
import CardLibrary from "./CardLibrary.jsx";
import UserProfile from "./UserProfile.jsx";
import { useChromeStorageSync } from "use-chrome-storage";

import { useDarkMode } from "../hooks/useDarkMode";

export default function Dashboard({ onSignOut }) {
  // ✅ system-following dark mode (adds/removes "dark" on <html>)
  useDarkMode();

  const [storedCards, setStoredCards] = useChromeStorageSync("cardinfo", []);
  const [currentView, setCurrentView] = useState("dashboard"); // dashboard | library | profile
  const [userCards, setUserCards] = useState([]);

  useEffect(() => {
    console.log("using cards", storedCards);
    const usedCards = (storedCards || []).filter((c) => c != null && c != undefined);

    let mounted = true;

    if (usedCards.length === 0) {
      // ensure we don't synchronously set state inside the effect body
      Promise.resolve().then(() => {
        if (mounted) setUserCards([]);
      });

      return () => {
        mounted = false;
      };
    }

    (async () => {
      try {
        const values = await Promise.all(
          usedCards.map(async (c) => {
            const response = await fetch("http://localhost:3000/api/cards/" + c);
            const data = await response.json();

            const newCard = {
              id: data._id,
              name: data.name,
              issuer: data.issuer,
              annualFee: data.annualFee,
              imageKey: data.imageKey,
              rewards: (data.attributes || [])
                .filter((a) => a.type != "url")
                .map((a_1) => {
                  if (a_1.type == "all") {
                    return { category: "all", rate: a_1.multiplier };
                  }
                  return { category: a_1.category, rate: a_1.multiplier };
                }),
            };

            console.log("received card", newCard);
            return newCard;
          })
        );

        if (mounted) {
          console.log("set user cards", values);
          setUserCards(values);
        }
      } catch (err) {
        console.error("Error fetching cards:", err);
        if (mounted) setUserCards([]);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [storedCards]);

  const addCard = useCallback(
    (card) => {
      if (card == null || card == undefined) return;
      if (card.id == null || card.id == undefined) return;

      setStoredCards([
        ...storedCards.filter((c) => c != null && c != undefined),
        card.id,
      ]);
      setUserCards([
        ...userCards.filter((c) => c != null && c != undefined),
        card,
      ]);
    },
    [storedCards, userCards, setStoredCards, setUserCards]
  );

  const totalAnnualFees = userCards.reduce((sum, card) => sum + card.annualFee, 0);

  return (
    <div className="dash-shell">
      <header className="dash-topbar">
        <div className="brand">
          <span className="brand-icon">▦</span>
          <div>
            <p className="brand-name">OnPoint</p>
            <p className="brand-tag">Maximize Your Rewards</p>
          </div>
        </div>
      </header>

      <nav className="dash-nav">
        <button
          className={`nav-item ${currentView === "dashboard" ? "is-active" : ""}`}
          onClick={() => setCurrentView("dashboard")}
        >
          Dashboard
        </button>
        <button
          className={`nav-item ${currentView === "library" ? "is-active" : ""}`}
          onClick={() => setCurrentView("library")}
        >
          Card Library
        </button>
        <button
          className={`nav-item ${currentView === "profile" ? "is-active" : ""}`}
          onClick={() => setCurrentView("profile")}
        >
          Profile
        </button>
      </nav>

      {currentView === "dashboard" && (
        <main className="dash-main">
          <section className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">💳</div>
              <div>
                <p className="stat-label">Total Cards</p>
                <p className="stat-value">{userCards.length}</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon violet">💲</div>
              <div>
                <p className="stat-label">Annual Fees</p>
                <p className="stat-value">${totalAnnualFees}</p>
              </div>
            </div>
          </section>

          <section className="tip-banner">
            <div className="tip-left">
              <div className="tip-icon">🏅</div>
              <div>
                <p className="tip-title">Smart Tip</p>
                <p className="tip-text">
                  {userCards.length === 0
                    ? "Visit the Card Library to add your first credit card and start getting personalized recommendations!"
                    : userCards.length === 1
                    ? "Great start! Add more cards from the Card Library to maximize rewards across different categories."
                    : "Great wallet! Use the Card Library to discover new cards that complement your spending."}
                </p>
              </div>
            </div>
          </section>

          <section className="cards-panel">
            <header className="cards-header">
              <p className="panel-title">Your Cards</p>
            </header>

            {userCards.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">💳</div>
                <p className="empty-title">No Cards Yet</p>
                <p className="empty-text">
                  Visit the Card Library tab to browse and add credit cards to your wallet.
                </p>
              </div>
            ) : (
              <div className="user-cards-grid">
                {userCards.map((card) => (
                  <div key={card.id} className="user-card-item">
                    <div className="user-card-visual">
                      <img
                        src={getCardImage(card.imageKey)}
                        alt={card.name}
                        style={{
                          width: "100%",
                          height: "140px",
                          objectFit: "cover",
                          borderRadius: "14px",
                          display: "block",
                        }}
                      />
                      <p className="user-card-name">{card.name}</p>
                      <p className="user-card-issuer">{card.issuer}</p>
                    </div>

                    <div className="user-card-info">
                      <div className="user-card-meta">
                        <span>Annual Fee:</span>
                        <span className={card.annualFee === 0 ? "free" : ""}>
                          ${card.annualFee}
                        </span>
                      </div>

                      <div className="user-card-rewards">
                        <p className="rewards-heading">Reward Categories</p>
                        <ul>
                          {card.rewards.slice(0, 3).map((r, i) => (
                            <li key={i}>
                              {r.category}: {r.rate}%
                            </li>
                          ))}
                        </ul>
                      </div>

                      <button
                        className="remove-card-btn"
                        onClick={() => {
                          setStoredCards(
                            storedCards.filter(
                              (c) => c != null && c != undefined && c != card.id
                            )
                          );
                          setUserCards(
                            userCards.filter(
                              (c) => c != null && c != undefined && c.id !== card.id
                            )
                          );
                        }}
                      >
                        Remove Card
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>
      )}

      {currentView === "library" && <CardLibrary userCards={userCards} addCard={addCard} />}

      {currentView === "profile" && <UserProfile onSignOut={onSignOut} />}
    </div>
  );
}
