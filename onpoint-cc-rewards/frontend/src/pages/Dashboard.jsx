import { useState, useEffect, useCallback, useMemo } from "react";
import "./Dashboard.css";
import CardLibrary from "./CardLibrary.jsx";
import UserProfile from "./UserProfile.jsx";
import { useChromeStorageSync } from "use-chrome-storage";
import { useDarkMode } from "../hooks/useDarkMode";
import { useTranslation } from "../utils/translation.js";

export default function Dashboard({ onSignOut }) {
  // ✅ system-following dark mode (adds/removes "dark" on <html>)
  useDarkMode();

  var searchParams = new URLSearchParams(window.location.search);

  const [storedCards, setStoredCards] = useChromeStorageSync("cardinfo", []);
  const [currentView, setCurrentView] = useState(searchParams.get("view") || "dashboard"); // dashboard | library | savings | profile
  const [userCards, setUserCards] = useState([]);
  const [allTimeSavingsTotal, setAllTimeSavingsTotal] = useState(0);
  const [accountCreatedAt, setAccountCreatedAt] = useState(null);
  const [cardTransactionCounts, setCardTransactionCounts] = useState({});
  const [qualifyingTransactionTotal, setQualifyingTransactionTotal] = useState(0);
  const translate = useTranslation();

  const calculateMonthsSinceAccountCreation = useCallback((createdAtTs) => {
    if (!createdAtTs || !Number.isFinite(createdAtTs)) return 1;

    const startDate = new Date(createdAtTs);
    if (Number.isNaN(startDate.getTime())) return 1;

    const currentDate = new Date();
    const months =
      (currentDate.getFullYear() - startDate.getFullYear()) * 12 +
      (currentDate.getMonth() - startDate.getMonth()) +
      1;

    return Math.max(1, months);
  }, []);

  const monthlyAverage =
    allTimeSavingsTotal > 0
      ? allTimeSavingsTotal / calculateMonthsSinceAccountCreation(accountCreatedAt)
      : 0;
  const monthlyAverageMonthsUsed = calculateMonthsSinceAccountCreation(accountCreatedAt);

  const topCardSummary = useMemo(() => {
    const entries = Object.entries(cardTransactionCounts || {});
    if (!entries.length || qualifyingTransactionTotal <= 0) {
      return {
        name: "No data",
        percentageText: "0% of total transactions",
      };
    }

    const [topName, topCountRaw] = entries.reduce((maxEntry, currentEntry) => {
      const currentCount = Number(currentEntry[1]) || 0;
      const maxCount = Number(maxEntry[1]) || 0;
      return currentCount > maxCount ? currentEntry : maxEntry;
    }, entries[0]);

    const topCount = Number(topCountRaw) || 0;
    const percentage = (topCount / qualifyingTransactionTotal) * 100;

    return {
      name: topName,
      percentageText: `${Math.round(percentage)}% of total transactions`,
    };
  }, [cardTransactionCounts, qualifyingTransactionTotal]);

  useEffect(() => {
    searchParams.set("view", currentView);
    window.history.pushState({}, "", window.location.pathname.split('?', 2)[0] + "?" + searchParams.toString());
  }, [currentView]);

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
              image_url: `http://localhost:3000/${data.image_path}`,  // replaced imageKey
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

  useEffect(() => {
    if (typeof chrome === "undefined" || !chrome.storage?.local) return;
    const CONSISTENCY_TOLERANCE = 0.01;

    const toNumber = (value) => {
      if (typeof value === "number" && Number.isFinite(value)) return value;
      if (typeof value === "string") {
        const parsed = Number(value.replace(/[^\d.-]/g, ""));
        return Number.isFinite(parsed) ? parsed : 0;
      }
      return 0;
    };

    const refreshSavingsMetrics = () => {
      chrome.storage.local.get([
        "savings_all_time_total",
        "accountCreatedAt",
        "savings_card_transaction_counts",
        "savings_qualifying_transaction_total",
      ], (data) => {
        setAllTimeSavingsTotal(toNumber(data?.savings_all_time_total));

        const nextCardCounts =
          data?.savings_card_transaction_counts && typeof data.savings_card_transaction_counts === "object"
            ? data.savings_card_transaction_counts
            : {};
        setCardTransactionCounts(nextCardCounts);
        setQualifyingTransactionTotal(toNumber(data?.savings_qualifying_transaction_total));

        const existingAccountCreatedAt = Number(data?.accountCreatedAt);
        if (Number.isFinite(existingAccountCreatedAt) && existingAccountCreatedAt > 0) {
          setAccountCreatedAt(existingAccountCreatedAt);
          return;
        }

        const now = Date.now();
        chrome.storage.local.set({ accountCreatedAt: now }, () => {
          setAccountCreatedAt(now);
        });
      });
    };

    const verifySavingsConsistency = () => {
      chrome.storage.local.get(["savings_all_time_total", "monthlySavings"], (data) => {
        const allTimeTotal = toNumber(data?.savings_all_time_total);
        const monthlySavings =
          data?.monthlySavings && typeof data.monthlySavings === "object"
            ? data.monthlySavings
            : {};

        let monthlySum = 0;
        Object.keys(monthlySavings).forEach((monthKey) => {
          monthlySum += toNumber(monthlySavings[monthKey]);
        });

        const normalizedMonthlySum = Number(monthlySum.toFixed(2));
        const normalizedAllTimeTotal = Number(allTimeTotal.toFixed(2));
        const difference = Math.abs(normalizedMonthlySum - normalizedAllTimeTotal);

        if (difference < CONSISTENCY_TOLERANCE) {
          console.log("Monthly data matches all-time total");
          return;
        }

        console.warn("Mismatch detected");
        console.warn("monthlySum:", normalizedMonthlySum);
        console.warn("allTimeTotal:", normalizedAllTimeTotal);
        console.warn("difference:", Number(difference.toFixed(2)));
      });
    };

    refreshSavingsMetrics();
    verifySavingsConsistency();

    const handleStorageChange = (changes, areaName) => {
      if (areaName !== "local") return;

      if (changes?.savings_all_time_total) {
        setAllTimeSavingsTotal(toNumber(changes.savings_all_time_total.newValue));
      }

      if (changes?.accountCreatedAt) {
        const nextAccountCreatedAt = Number(changes.accountCreatedAt.newValue);
        if (Number.isFinite(nextAccountCreatedAt) && nextAccountCreatedAt > 0) {
          setAccountCreatedAt(nextAccountCreatedAt);
        }
      }

      if (changes?.savings_card_transaction_counts) {
        const nextCounts = changes.savings_card_transaction_counts.newValue;
        setCardTransactionCounts(nextCounts && typeof nextCounts === "object" ? nextCounts : {});
      }

      if (changes?.savings_qualifying_transaction_total) {
        setQualifyingTransactionTotal(toNumber(changes.savings_qualifying_transaction_total.newValue));
      }

      if (changes?.savings_all_time_total || changes?.monthlySavings) {
        verifySavingsConsistency();
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, []);

  return (
    <div className="dash-shell">
      <header className="dash-topbar">
        <div className="brand">
          <span className="brand-icon">▦</span>
          <div>
            <p className="brand-name">{translate("main.brand-name")}</p>
            <p className="brand-tag">{translate("main.brand-tag")}</p>
          </div>
        </div>
      </header>

      <nav className="dash-nav">
        {
          ["dashboard", "library", "savings", "profile"].map(page => (
            <button
              className={`nav-item ${currentView === page ? "is-active" : ""}`}
              onClick={() => setCurrentView(page)}>
                {translate("main.nav." + page)}
            </button>
          ))
        }
      </nav>

      {currentView === "dashboard" && (
        <main className="dash-main">
          <section className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">💳</div>
              <div>
                <p className="stat-label">{translate("dashboard.stats.total-cards")}</p>
                <p className="stat-value">{userCards.length}</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon violet">💲</div>
              <div>
                <p className="stat-label">{translate("dashboard.stats.annual-fees")}</p>
                <p className="stat-value">${totalAnnualFees}</p>
              </div>
            </div>
          </section>

          <section className="tip-banner">
            <div className="tip-left">
              <div className="tip-icon">🏅</div>
              <div>
                <p className="tip-title">{translate("dashboard.tip.title")}</p>
                <p className="tip-text">
                  { translate("dashboard.tip." + Math.min(userCards.length, 2)) }
                </p>
              </div>
            </div>
          </section>

          <section className="cards-panel">
            <header className="cards-header">
              <p className="panel-title">{translate("dashboard.card-list.title")}</p>
            </header>

            {userCards.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">💳</div>
                <p className="empty-title">{translate("dashboard.card-list.empty-title")}</p>
                <p className="empty-text">{translate("dashboard.card-list.empty-text")}</p>
              </div>
            ) : (
              <div className="user-cards-grid">
                {userCards.map((card) => (
                  <div key={card.id} className="user-card-item">
                    <div className="user-card-visual">
                      <img
                        src={card.image_url}
                        alt={card.name}
                        style={{
                          width: "100%",
                          height: "140px",
                          objectFit: "cover",
                          objectPosition: "top",
                          borderRadius: "14px",
                          display: "block",
                        }}
                      />
                      
                    </div>
                    <p className="user-card-name">{card.name}</p>
                    

                    <div className="user-card-info">
                      <div className="user-card-meta">
                        <span>{translate("card-display.annual-fee")}</span>
                        <span className={card.annualFee === 0 ? "free" : ""}>
                          ${card.annualFee}
                        </span>
                      </div>

                      <div className="user-card-rewards">
                        <p className="rewards-heading">{translate("card-display.rewards")}</p>
                        <ul>
                          {card.rewards.slice(0, 3).map((r, i) => (
                            <li key={i}>
                              
                              {translate("category." + r.category)}: {r.rate}%
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
                        {translate("card-display.remove-from-wallet")}
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

      {currentView === "savings" && (
        <main className="dash-main savings-main">
          <section className="savings-panel">
            <header className="savings-header">
              <h2 className="savings-title">{translate("savings.title")}</h2>
              <p className="savings-subtitle">{translate("savings.subtitle")}</p>
            </header>

            <div className="savings-overview-grid stats-grid" data-section="cashback-overview">
              <div className="stat-card savings-stat-card" data-card="total-rewards">
                <div className="savings-stat-head">
                  <p className="stat-label">Total Rewards</p>
                  <div className="stat-icon" aria-hidden="true">
                    💵
                  </div>
                </div>
                <p
                  className="stat-value"
                  id="totalCashbackValue"
                  data-metric="total-cashback"
                >
                  ${allTimeSavingsTotal.toFixed(2)}
                </p>
                <p className="savings-helper-text">All-time rewards earned</p>
              </div>

              <div className="stat-card savings-stat-card" data-card="monthly-average">
                <div className="savings-stat-head">
                  <p className="stat-label">Monthly Average</p>
                  <div className="stat-icon violet" aria-hidden="true">
                    📅
                  </div>
                </div>
                <p
                  className="stat-value"
                  id="monthlyAverageValue"
                  data-metric="monthly-average"
                >
                  ${monthlyAverage.toFixed(2)}
                </p>
                <p className="savings-helper-text">
                  Average per month · based on {monthlyAverageMonthsUsed} month{monthlyAverageMonthsUsed === 1 ? "" : "s"}
                </p>
              </div>

              <div className="stat-card savings-stat-card" data-card="top-card">
                <div className="savings-stat-head">
                  <p className="stat-label">Top Card</p>
                  <div className="stat-icon success" aria-hidden="true">
                    🏆
                  </div>
                </div>
                <p className="stat-value" id="topCardValue" data-metric="top-card">
                  {topCardSummary.name}
                </p>
                <p className="savings-helper-text" id="topCardSubtext" data-metric="top-card-share">
                  {topCardSummary.percentageText}
                </p>
              </div>
            </div>
          </section>

          <section className="cards-panel savings-monthly-panel">
            <header className="cards-header savings-monthly-header">
              <div>
                <h2 className="savings-title">Monthly Savings Analysis</h2>
                <p className="savings-subtitle">Reward breakdown per card and category</p>
              </div>

              <select id="selectedSavingsMonth" className="savings-month-select" defaultValue="March 2026">
                <option value="March 2026">March 2026</option>
              </select>
            </header>

            <div className="savings-monthly-content">
              <section className="savings-total-banner" aria-label="total-monthly-savings">
                <div>
                  <p className="savings-total-label">TOTAL SAVINGS FOR MARCH 2026</p>
                  <p className="savings-total-value" id="monthlySavingsValue">
                    $134.50
                  </p>
                </div>

                <button className="savings-total-icon" type="button" aria-label="Monthly savings summary icon">
                  💳
                </button>
              </section>

              <div className="savings-two-col-layout">
                <section className="savings-col-card">
                  <p className="savings-col-title">Card Contributions</p>

                  <div id="contributionList" className="savings-contribution-list">
                    <article className="savings-contribution-item">
                      <div className="savings-contribution-left">
                        <div className="savings-item-icon" aria-hidden="true">
                          💳
                        </div>
                        <div>
                          <p className="savings-item-title">Sapphire Preferred</p>
                          <p className="savings-item-subtitle">Chase</p>
                        </div>
                      </div>

                      <div className="savings-contribution-right">
                        <p className="savings-item-amount">+$54.50</p>
                        <p className="savings-item-earned">Earned</p>
                      </div>
                    </article>

                    <article className="savings-contribution-item">
                      <div className="savings-contribution-left">
                        <div className="savings-item-icon" aria-hidden="true">
                          💳
                        </div>
                        <div>
                          <p className="savings-item-title">Blue Cash Everyday</p>
                          <p className="savings-item-subtitle">Amex</p>
                        </div>
                      </div>

                      <div className="savings-contribution-right">
                        <p className="savings-item-amount">+$45.00</p>
                        <p className="savings-item-earned">Earned</p>
                      </div>
                    </article>

                    <article className="savings-contribution-item">
                      <div className="savings-contribution-left">
                        <div className="savings-item-icon" aria-hidden="true">
                          💳
                        </div>
                        <div>
                          <p className="savings-item-title">Custom Cash</p>
                          <p className="savings-item-subtitle">Citi</p>
                        </div>
                      </div>

                      <div className="savings-contribution-right">
                        <p className="savings-item-amount">+$35.00</p>
                        <p className="savings-item-earned">Earned</p>
                      </div>
                    </article>
                  </div>
                </section>

                <section className="savings-col-card">
                  <p className="savings-col-title">Category Breakdown</p>

                  <div id="categoryBreakdownChart" className="savings-donut-placeholder" aria-label="donut-chart-placeholder">
                    <div className="savings-donut-ring" />
                  </div>

                  <div id="categoryLegendList" className="savings-legend-list">
                    <div className="savings-legend-item">
                      <span className="savings-legend-left"><span className="savings-dot travel" />Travel</span>
                      <span>$42.50</span>
                    </div>
                    <div className="savings-legend-item">
                      <span className="savings-legend-left"><span className="savings-dot groceries" />Groceries</span>
                      <span>$36.00</span>
                    </div>
                    <div className="savings-legend-item">
                      <span className="savings-legend-left"><span className="savings-dot gas" />Gas</span>
                      <span>$9.00</span>
                    </div>
                    <div className="savings-legend-item">
                      <span className="savings-legend-left"><span className="savings-dot dining" />Dining</span>
                      <span>$37.00</span>
                    </div>
                    <div className="savings-legend-item">
                      <span className="savings-legend-left"><span className="savings-dot general" />General</span>
                      <span>$10.00</span>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </section>
        </main>
      )}

      {currentView === "profile" && <UserProfile onSignOut={onSignOut} />}
    </div>
  );
}
