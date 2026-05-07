/* global chrome */
import { useState, useEffect, useCallback, useMemo } from "react";
import "./Dashboard.css";
import CardLibrary from "./CardLibrary.jsx";
import UserProfile from "./UserProfile.jsx";
import { useChromeStorageSync } from "use-chrome-storage";
import { useDarkMode } from "../hooks/useDarkMode";
import { useTranslation } from "../utils/translation.js";
import { apiUrl, assetUrl } from '../utils/api';

const SYNTHETIC_STORAGE_KEYS = [
  "savings_all_time_total",
  "accountCreatedAt",
  "savings_card_transaction_counts",
  "savings_qualifying_transaction_total",
  "monthlySavings",
  "savings_monthly_card_contributions",
  "savings_monthly_category_totals",
  "spending_monthly_totals",
  "spending_daily_totals",
];

export default function Dashboard({ onSignOut }) {
  const { isDarkMode, toggleDarkMode } = useDarkMode();

  var searchParams = new URLSearchParams(window.location.search);

  const [storedCards, setStoredCards] = useChromeStorageSync("cardinfo", []);
  const [currentView, setCurrentView] = useState(searchParams.get("view") || "dashboard"); // dashboard | library | savings | account
  const [userCards, setUserCards] = useState([]);
  const [allTimeSavingsTotal, setAllTimeSavingsTotal] = useState(0);
  const [accountCreatedAt, setAccountCreatedAt] = useState(null);
  const [cardTransactionCounts, setCardTransactionCounts] = useState({});
  const [qualifyingTransactionTotal, setQualifyingTransactionTotal] = useState(0);
  const [monthlySavings, setMonthlySavings] = useState({});
  const [monthlyCardContributions, setMonthlyCardContributions] = useState({});
  const [monthlyCategoryTotals, setMonthlyCategoryTotals] = useState({});
  const [selectedSavingsMonth, setSelectedSavingsMonth] = useState("");
  const [expandedCards, setExpandedCards] = useState({});
  const [personalizedRecs, setPersonalizedRecs] = useState([]);
  const [recsLoading, setRecsLoading] = useState(false);
  const [spendingLimits, setSpendingLimits] = useState({});
  const [dailySpendingTotals, setDailySpendingTotals] = useState({});
  const [monthlySpendingTotals, setMonthlySpendingTotals] = useState({});
  const [syntheticLoadStatus, setSyntheticLoadStatus] = useState("");
  const translate = useTranslation();

  const toNumber = useCallback((value) => {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const parsed = Number(value.replace(/[^\d.-]/g, ""));
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
  }, []);

  const getMonthKeyLabel = useCallback((monthKey) => {
    const match = String(monthKey || "").match(/^(\d{4})-(\d{2})$/);
    if (!match) return String(monthKey || "");
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    const date = new Date(year, month, 1);
    if (Number.isNaN(date.getTime())) return String(monthKey || "");
    return date.toLocaleString("en-US", { month: "long", year: "numeric" });
  }, []);

  const savingsMonthKeys = useMemo(() => {
    const monthKeySet = new Set([
      ...Object.keys(monthlySavings || {}),
      ...Object.keys(monthlyCardContributions || {}),
    ]);

    const validMonths = Array.from(monthKeySet).filter((monthKey) => /^\d{4}-\d{2}$/.test(monthKey));

    if (!validMonths.length) {
      const now = new Date();
      return [`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`];
    }

    return validMonths.sort((a, b) => b.localeCompare(a));
  }, [monthlySavings, monthlyCardContributions]);

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

  // selected month is read from state and used as the source of truth for this section
  const activeSavingsMonth = selectedSavingsMonth || savingsMonthKeys[0] || "";

  // monthly total is read from stored monthlySavings for the selected month
  const selectedMonthTotalSavings = useMemo(() => {
    if (!activeSavingsMonth) return 0;
    return toNumber(monthlySavings?.[activeSavingsMonth]);
  }, [activeSavingsMonth, monthlySavings, toNumber]);

  // top 3 contributors are selected by sorting selected-month card totals descending
  const selectedMonthTopContributors = useMemo(() => {
    if (!activeSavingsMonth) return [];
    const monthContributions = monthlyCardContributions?.[activeSavingsMonth];
    if (!monthContributions || typeof monthContributions !== "object") return [];

    return Object.entries(monthContributions)
      .map(([cardName, rawValue]) => {
        if (rawValue && typeof rawValue === "object") {
          return {
            cardName,
            issuer: String(rawValue.issuer || ""),
            amount: toNumber(rawValue.amount),
          };
        }

        return {
          cardName,
          issuer: "",
          amount: toNumber(rawValue),
        };
      })
      .filter((entry) => entry.amount > 0)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 3);
  }, [activeSavingsMonth, monthlyCardContributions, toNumber]);

  // category data is retrieved for the selected month from storage-backed monthly category totals
  const selectedMonthCategoryTotals = useMemo(() => {
    if (!activeSavingsMonth) return {};

    const directMonthCategories =
      monthlyCategoryTotals?.[activeSavingsMonth] && typeof monthlyCategoryTotals[activeSavingsMonth] === "object"
        ? monthlyCategoryTotals[activeSavingsMonth]
        : {};

    const legacyMonthValue = monthlySavings?.[activeSavingsMonth];
    const legacyMonthCategories =
      legacyMonthValue && typeof legacyMonthValue === "object" && legacyMonthValue.categories && typeof legacyMonthValue.categories === "object"
        ? legacyMonthValue.categories
        : {};

    return { ...legacyMonthCategories, ...directMonthCategories };
  }, [activeSavingsMonth, monthlyCategoryTotals, monthlySavings]);

  // recommendation category naming is reused from saved monthly category keys without introducing a new category system
  const selectedMonthCategoryEntries = useMemo(() => {
    return Object.entries(selectedMonthCategoryTotals)
      .map(([categoryName, rawAmount]) => ({
        categoryName,
        amount: toNumber(rawAmount),
      }))
      .filter((entry) => entry.amount > 0)
      .sort((a, b) => b.amount - a.amount);
  }, [selectedMonthCategoryTotals, toNumber]);

  const selectedMonthCategoryTotalAmount = useMemo(() => {
    return selectedMonthCategoryEntries.reduce((sum, entry) => sum + entry.amount, 0);
  }, [selectedMonthCategoryEntries]);

  // donut chart data is constructed as conic-gradient segments from selected-month category totals
  const donutSegments = useMemo(() => {
    const palette = ["#2563eb", "#3b82f6", "#60a5fa", "#22d3ee", "#cbd5e1", "#94a3b8"];
    if (!selectedMonthCategoryEntries.length || selectedMonthCategoryTotalAmount <= 0) {
      return [];
    }

    let runningDegrees = 0;
    return selectedMonthCategoryEntries.map((entry, index) => {
      const span = (entry.amount / selectedMonthCategoryTotalAmount) * 360;
      const start = runningDegrees;
      const end = runningDegrees + span;
      runningDegrees = end;

      return {
        ...entry,
        color: palette[index % palette.length],
        start,
        end,
      };
    });
  }, [selectedMonthCategoryEntries, selectedMonthCategoryTotalAmount]);

  const donutBackground = useMemo(() => {
    if (!donutSegments.length) {
      return "conic-gradient(#cbd5e1 0deg 360deg)";
    }

    return `conic-gradient(${donutSegments
      .map((segment) => `${segment.color} ${segment.start.toFixed(2)}deg ${segment.end.toFixed(2)}deg`)
      .join(", ")})`;
  }, [donutSegments]);

  // Aggregate spending across all months for personalized card recommendations
  const allTimeCategorySpending = useMemo(() => {
    const totals = {};
    Object.values(monthlyCategoryTotals).forEach(monthData => {
      if (!monthData || typeof monthData !== 'object') return;
      Object.entries(monthData).forEach(([cat, amount]) => {
        totals[cat] = (totals[cat] || 0) + toNumber(amount);
      });
    });
    return totals;
  }, [monthlyCategoryTotals, toNumber]);

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
    if ((storedCards || []).length > 0) return;
    if (typeof chrome === "undefined" || !chrome.storage?.local) return;

    chrome.storage.local.get(["onboardingCardIds"], (data) => {
      const onboardingCardIds = Array.isArray(data?.onboardingCardIds)
        ? data.onboardingCardIds.filter((id) => id != null)
        : [];

      if (!onboardingCardIds.length) return;
      setStoredCards(onboardingCardIds);
    });
  }, [storedCards, setStoredCards]);

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
      const results = await Promise.allSettled(
        usedCards.map(async (c) => {
          const response = await fetch(apiUrl(`/api/cards/${c}`));
          if (!response.ok) throw new Error(`Card ${c} not found (${response.status})`);
          const data = await response.json();
          const newCard = {
            id: data._id,
            name: data.name,
            issuer: data.issuer,
            annualFee: data.annualFee,
            image_url: assetUrl(data.image_path),
            rewards: (data.attributes || [])
              .filter((a) => a.type !== "url")
              .map((a_1) => {
                if (a_1.type === "all") return { category: "all", rate: a_1.multiplier };
                return { category: a_1.category, rate: a_1.multiplier };
              }),
          };
          console.log("received card", newCard);
          return newCard;
        })
      );

      const validCards = [];
      const staleIds = [];
      results.forEach((result, i) => {
        if (result.status === "fulfilled") {
          validCards.push(result.value);
        } else {
          console.warn("Pruning stale card ID:", usedCards[i], result.reason?.message);
          staleIds.push(usedCards[i]);
        }
      });

      if (mounted) {
        if (staleIds.length > 0) {
          setStoredCards((prev) => (prev || []).filter((id) => !staleIds.includes(id)));
        }
        console.log("set user cards", validCards);
        setUserCards(validCards);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [storedCards]);

  // Fetch personalized card recommendations whenever spending history or owned cards change
  useEffect(() => {
    const hasSpending = Object.values(allTimeCategorySpending).some(v => v > 0);
    if (!hasSpending) {
      setPersonalizedRecs([]);
      return;
    }

    let mounted = true;
    setRecsLoading(true);

    (async () => {
      try {
        const response = await fetch(apiUrl('/api/recommendations/personalized'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cardIds: (storedCards || []).filter(c => c != null),
            categorySpending: allTimeCategorySpending,
          }),
        });
        if (!response.ok) throw new Error(`Personalized recs error: ${response.status}`);
        const data = await response.json();
        if (mounted) setPersonalizedRecs(data.recommendations || []);
      } catch (err) {
        console.error('Error fetching personalized recommendations:', err);
        if (mounted) setPersonalizedRecs([]);
      } finally {
        if (mounted) setRecsLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, [storedCards, allTimeCategorySpending]);

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

  const loadSyntheticSavingsData = useCallback(async () => {
    setSyntheticLoadStatus("Loading synthetic CSV...");

    try {
      const response = await fetch(`./synthetic_savings_jan_to_apr_2026.csv?ts=${Date.now()}`);
      if (!response.ok) {
        throw new Error(`Unable to load CSV (${response.status})`);
      }

      const csvText = await response.text();
      const lines = csvText
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

      if (lines.length < 2) {
        throw new Error("CSV is empty");
      }

      const header = lines[0].split(",").map((h) => h.trim());
      const idx = (name) => header.indexOf(name);

      const transactionTypeIdx = idx("transaction_type");
      const monthIdx = idx("month");
      const dateIdx = idx("date");
      const categoryIdx = idx("category");
      const amountIdx = idx("amount");

      if ([transactionTypeIdx, monthIdx, dateIdx, categoryIdx, amountIdx].some((i) => i < 0)) {
        throw new Error("CSV format mismatch");
      }

      const nextMonthlySavings = {};
      const nextMonthlyCardContributions = {};
      const nextMonthlyCategoryTotals = {};
      const nextMonthlySpendingTotals = {};
      const nextDailySpendingTotals = {};
      let transferCount = 0;
      let earliestDate = null;

      lines.slice(1).forEach((line) => {
        const cols = line.split(",");
        if (cols.length < header.length) return;

        const type = String(cols[transactionTypeIdx] || "").trim();
        const monthKey = String(cols[monthIdx] || "").trim();
        const dateKey = String(cols[dateIdx] || "").trim();
        const category = String(cols[categoryIdx] || "").trim() || "other";
        const amount = toNumber(cols[amountIdx]);
        if (!monthKey || !dateKey || amount <= 0) return;

        const parsedDate = new Date(dateKey);
        if (!Number.isNaN(parsedDate.getTime()) && (!earliestDate || parsedDate < earliestDate)) {
          earliestDate = parsedDate;
        }

        if (type === "transfer_to_savings") {
          nextMonthlySavings[monthKey] = toNumber(nextMonthlySavings[monthKey]) + amount;
          if (!nextMonthlyCardContributions[monthKey]) nextMonthlyCardContributions[monthKey] = {};
          nextMonthlyCardContributions[monthKey]["Synthetic Savings Plan"] = {
            issuer: "Synthetic",
            amount: toNumber(nextMonthlyCardContributions[monthKey]["Synthetic Savings Plan"]?.amount) + amount,
          };
          transferCount += 1;
        }

        if (type === "expense") {
          if (!nextMonthlyCategoryTotals[monthKey]) nextMonthlyCategoryTotals[monthKey] = {};
          nextMonthlyCategoryTotals[monthKey][category] = toNumber(nextMonthlyCategoryTotals[monthKey][category]) + amount;
          nextMonthlySpendingTotals[monthKey] = toNumber(nextMonthlySpendingTotals[monthKey]) + amount;
          nextDailySpendingTotals[dateKey] = toNumber(nextDailySpendingTotals[dateKey]) + amount;
        }
      });

      const allTimeTotal = Object.keys(nextMonthlySavings).reduce(
        (sum, monthKey) => sum + toNumber(nextMonthlySavings[monthKey]),
        0
      );

      const nextCardTransactionCounts = {
        "Synthetic Savings Plan": transferCount,
      };

      const months = Object.keys(nextMonthlySavings).sort((a, b) => b.localeCompare(a));
      const selectedMonth = months[0] || "";
      const createdAtMs = earliestDate ? earliestDate.getTime() : Date.now();

      if (typeof chrome !== "undefined" && chrome.storage?.local) {
        chrome.storage.local.get(["synthetic_savings_loaded", "synthetic_savings_backup", ...SYNTHETIC_STORAGE_KEYS], (existing) => {
          const hasBackup = Boolean(existing?.synthetic_savings_loaded && existing?.synthetic_savings_backup);
          const backupPayload = hasBackup
            ? existing.synthetic_savings_backup
            : SYNTHETIC_STORAGE_KEYS.reduce((acc, key) => {
                acc[key] = existing?.[key];
                return acc;
              }, {});

          chrome.storage.local.set({
            synthetic_savings_loaded: true,
            synthetic_savings_backup: backupPayload,
            savings_all_time_total: Number(allTimeTotal.toFixed(2)),
            accountCreatedAt: createdAtMs,
            savings_card_transaction_counts: nextCardTransactionCounts,
            savings_qualifying_transaction_total: transferCount,
            monthlySavings: nextMonthlySavings,
            savings_monthly_card_contributions: nextMonthlyCardContributions,
            savings_monthly_category_totals: nextMonthlyCategoryTotals,
            spending_monthly_totals: nextMonthlySpendingTotals,
            spending_daily_totals: nextDailySpendingTotals,
          });
        });
      }

      setAllTimeSavingsTotal(Number(allTimeTotal.toFixed(2)));
      setAccountCreatedAt(createdAtMs);
      setCardTransactionCounts(nextCardTransactionCounts);
      setQualifyingTransactionTotal(transferCount);
      setMonthlySavings(nextMonthlySavings);
      setMonthlyCardContributions(nextMonthlyCardContributions);
      setMonthlyCategoryTotals(nextMonthlyCategoryTotals);
      setMonthlySpendingTotals(nextMonthlySpendingTotals);
      setDailySpendingTotals(nextDailySpendingTotals);
      setSelectedSavingsMonth(selectedMonth);
      setCurrentView("savings");
      setSyntheticLoadStatus("Synthetic savings data loaded successfully.");
    } catch (error) {
      console.error("Failed loading synthetic savings data", error);
      setSyntheticLoadStatus("Failed to load synthetic CSV. Confirm docs/synthetic_savings_jan_to_apr_2026.csv exists.");
    }
  }, [toNumber]);

  const removeSyntheticSavingsData = useCallback(() => {
    if (typeof chrome === "undefined" || !chrome.storage?.local) {
      setAllTimeSavingsTotal(0);
      setCardTransactionCounts({});
      setQualifyingTransactionTotal(0);
      setMonthlySavings({});
      setMonthlyCardContributions({});
      setMonthlyCategoryTotals({});
      setMonthlySpendingTotals({});
      setDailySpendingTotals({});
      setAccountCreatedAt(Date.now());
      setSelectedSavingsMonth("");
      setSyntheticLoadStatus("Synthetic savings data removed.");
      return;
    }

    setSyntheticLoadStatus("Removing synthetic data...");

    chrome.storage.local.get(["synthetic_savings_loaded", "synthetic_savings_backup"], (data) => {
      const hadSynthetic = Boolean(data?.synthetic_savings_loaded);
      const backup = data?.synthetic_savings_backup && typeof data.synthetic_savings_backup === "object"
        ? data.synthetic_savings_backup
        : null;

      if (hadSynthetic && backup) {
        const restoredValues = SYNTHETIC_STORAGE_KEYS.reduce((acc, key) => {
          if (backup[key] !== undefined) {
            acc[key] = backup[key];
          }
          return acc;
        }, {});

        chrome.storage.local.set(restoredValues, () => {
          chrome.storage.local.remove(["synthetic_savings_loaded", "synthetic_savings_backup"]);
          setSyntheticLoadStatus("Synthetic savings data removed and previous data restored.");
        });
        return;
      }

      const now = Date.now();
      chrome.storage.local.remove([
        "monthlySavings",
        "savings_monthly_card_contributions",
        "savings_monthly_category_totals",
        "spending_monthly_totals",
        "spending_daily_totals",
        "synthetic_savings_loaded",
        "synthetic_savings_backup",
      ]);
      chrome.storage.local.set({
        savings_all_time_total: 0,
        savings_card_transaction_counts: {},
        savings_qualifying_transaction_total: 0,
        accountCreatedAt: now,
      });

      setAllTimeSavingsTotal(0);
      setCardTransactionCounts({});
      setQualifyingTransactionTotal(0);
      setMonthlySavings({});
      setMonthlyCardContributions({});
      setMonthlyCategoryTotals({});
      setMonthlySpendingTotals({});
      setDailySpendingTotals({});
      setAccountCreatedAt(now);
      setSelectedSavingsMonth("");
      setSyntheticLoadStatus("Synthetic savings data removed.");
    });
  }, []);

  useEffect(() => {
    if (!savingsMonthKeys.length) return;
    if (!selectedSavingsMonth || !savingsMonthKeys.includes(selectedSavingsMonth)) {
      setSelectedSavingsMonth(savingsMonthKeys[0]);
    }
  }, [savingsMonthKeys, selectedSavingsMonth]);

  useEffect(() => {
    if (typeof chrome === "undefined" || !chrome.storage?.local) return;
    const CONSISTENCY_TOLERANCE = 0.01;

    const refreshSavingsMetrics = () => {
      chrome.storage.local.get([
        "savings_all_time_total",
        "accountCreatedAt",
        "savings_card_transaction_counts",
        "savings_qualifying_transaction_total",
        "monthlySavings",
        "savings_monthly_card_contributions",
        "savings_monthly_category_totals",
        "spendingLimits",
        "spending_daily_totals",
        "spending_monthly_totals",
      ], (data) => {
        setAllTimeSavingsTotal(toNumber(data?.savings_all_time_total));

        const nextCardCounts =
          data?.savings_card_transaction_counts && typeof data.savings_card_transaction_counts === "object"
            ? data.savings_card_transaction_counts
            : {};
        setCardTransactionCounts(nextCardCounts);
        setQualifyingTransactionTotal(toNumber(data?.savings_qualifying_transaction_total));

        const nextMonthlySavings =
          data?.monthlySavings && typeof data.monthlySavings === "object"
            ? data.monthlySavings
            : {};
        setMonthlySavings(nextMonthlySavings);

        const nextMonthlyCardContributions =
          data?.savings_monthly_card_contributions && typeof data.savings_monthly_card_contributions === "object"
            ? data.savings_monthly_card_contributions
            : {};
        setMonthlyCardContributions(nextMonthlyCardContributions);

        const nextMonthlyCategoryTotals =
          data?.savings_monthly_category_totals && typeof data.savings_monthly_category_totals === "object"
            ? data.savings_monthly_category_totals
            : {};
        setMonthlyCategoryTotals(nextMonthlyCategoryTotals);

        setSpendingLimits(data?.spendingLimits && typeof data.spendingLimits === "object" ? data.spendingLimits : {});
        setDailySpendingTotals(data?.spending_daily_totals && typeof data.spending_daily_totals === "object" ? data.spending_daily_totals : {});
        setMonthlySpendingTotals(data?.spending_monthly_totals && typeof data.spending_monthly_totals === "object" ? data.spending_monthly_totals : {});

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

      if (changes?.monthlySavings) {
        const nextMonthlySavings = changes.monthlySavings.newValue;
        setMonthlySavings(nextMonthlySavings && typeof nextMonthlySavings === "object" ? nextMonthlySavings : {});
      }

      if (changes?.savings_monthly_card_contributions) {
        const nextMonthlyCardContributions = changes.savings_monthly_card_contributions.newValue;
        setMonthlyCardContributions(
          nextMonthlyCardContributions && typeof nextMonthlyCardContributions === "object"
            ? nextMonthlyCardContributions
            : {}
        );
      }

      if (changes?.savings_monthly_category_totals) {
        const nextMonthlyCategoryTotals = changes.savings_monthly_category_totals.newValue;
        setMonthlyCategoryTotals(
          nextMonthlyCategoryTotals && typeof nextMonthlyCategoryTotals === "object"
            ? nextMonthlyCategoryTotals
            : {}
        );
      }

      if (changes?.savings_all_time_total || changes?.monthlySavings) {
        verifySavingsConsistency();
      }

      if (changes?.spending_daily_totals) {
        const v = changes.spending_daily_totals.newValue;
        setDailySpendingTotals(v && typeof v === "object" ? v : {});
      }
      if (changes?.spending_monthly_totals) {
        const v = changes.spending_monthly_totals.newValue;
        setMonthlySpendingTotals(v && typeof v === "object" ? v : {});
      }
      if (changes?.spendingLimits) {
        const v = changes.spendingLimits.newValue;
        setSpendingLimits(v && typeof v === "object" ? v : {});
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, [toNumber]);

  return (
    <div className="dash-shell">
      <header className="dash-topbar">
        <div className="brand">
          <img
            src="./onpoint-logo.png"
            alt="OnPoint"
            className="brand-logo"
          />
          <div>
            <p className="brand-name">{translate("main.brand-name")}</p>
            <p className="brand-tag">{translate("main.brand-tag")}</p>
          </div>
        </div>
        <button
          className="theme-toggle-btn"
          onClick={toggleDarkMode}
          aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDarkMode ? '☀︎' : '⏾'}
        </button>
      </header>

      <nav className="dash-nav">
        {
          ["dashboard", "library", "savings", "profile"].map(page => (
            <button
              key={page}
              className={`nav-item ${currentView === page ? "is-active" : ""}`}
              onClick={() => setCurrentView(page)}>
                {page === "profile" ? "Settings" : translate("main.nav." + page)}
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
                          {(expandedCards[card.id] ? card.rewards : card.rewards.slice(0, 3)).map((r, i) => (
                            <li key={i}>
                              {translate("category." + r.category)}: {r.rate}%
                            </li>
                          ))}
                        </ul>
                        {card.rewards.length > 3 && (
                          <button
                            className="expand-rewards-btn"
                            onClick={() => setExpandedCards(prev => ({
                              ...prev,
                              [card.id]: !prev[card.id]
                            }))}
                          >
                            {expandedCards[card.id]
                              ? translate('dashboard.card-expand.show-less')
                              : `▼ +${card.rewards.length - 3} more`}
                          </button>
                        )}
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

          <section className="rec-section">
            <header className="cards-header">
              <div>
                <p className="panel-title">{translate('dashboard.recs.title')}</p>
                <p className="rec-subtitle">{translate('dashboard.recs.subtitle')}</p>
              </div>
            </header>

            {recsLoading ? (
              <div className="rec-loading">{translate('dashboard.recs.loading')}</div>
            ) : personalizedRecs.length === 0 ? (
              <div className="empty-state">

                <p className="empty-title">{translate('dashboard.recs.empty-title')}</p>
                <p className="empty-text">
                  {translate('dashboard.recs.empty-text')}
                </p>
              </div>
            ) : (
              <div className="rec-grid">
                {personalizedRecs.map((rec) => (
                  <div key={String(rec.cardId)} className="rec-card">
                    <div className="rec-card-image">
                      <img src={rec.image_url} alt={rec.name} />
                    </div>
                    <div className="rec-card-body">
                      <p className="rec-card-name">{rec.name}</p>
                      <p className="rec-card-issuer">{rec.issuer}</p>

                      {rec.rotatingLabel && (
                        <p className="rec-rotating-badge">Q{new Date().getMonth() < 3 ? 1 : new Date().getMonth() < 6 ? 2 : new Date().getMonth() < 9 ? 3 : 4} Bonus: {rec.rotatingLabel}</p>
                      )}

                      {rec.topCategories.length > 0 && (
                        <ul className="rec-top-cats">
                          {rec.topCategories.map((tc) => (
                            <li key={tc.category}>
                              <span className="rec-cat-name">{tc.category}</span>
                              <span className="rec-cat-rate">{tc.rate}%</span>
                            </li>
                          ))}
                        </ul>
                      )}

                      <div className="rec-card-footer">
                        <span className={`rec-fee ${rec.annualFee === 0 ? "free" : ""}`}>
                          {rec.annualFee === 0 ? translate('dashboard.recs.no-annual-fee') : `$${rec.annualFee}/yr`}
                        </span>
                        <button
                          className="rec-add-btn"
                          onClick={() => {
                            setStoredCards((prev) => [
                              ...(prev || []).filter((c) => c != null),
                              String(rec.cardId),
                            ]);
                            setPersonalizedRecs((prev) =>
                              prev.filter((r) => String(r.cardId) !== String(rec.cardId))
                            );
                          }}
                        >
                          {translate('dashboard.recs.add-to-wallet')}
                        </button>
                      </div>
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
              <div className="savings-import-controls">
                <button
                  type="button"
                  className="savings-import-btn"
                  onClick={loadSyntheticSavingsData}
                >
                  Load Synthetic Savings Data
                </button>
                <button
                  type="button"
                  className="savings-import-btn savings-import-btn-danger"
                  onClick={removeSyntheticSavingsData}
                >
                  Remove Synthetic Data
                </button>
                {syntheticLoadStatus ? <p className="savings-import-status">{syntheticLoadStatus}</p> : null}
              </div>
            </header>

            <div className="savings-overview-grid stats-grid" data-section="cashback-overview">
              <div className="stat-card savings-stat-card" data-card="total-rewards">
                <div className="savings-stat-head">
                  <h3 className="stat-label">{translate('dashboard.savings.total-rewards')}</h3>

                </div>
                <p
                  className="stat-value"
                  id="totalCashbackValue"
                  data-metric="total-cashback"
                >
                  ${allTimeSavingsTotal.toFixed(2)}
                </p>
                <p className="savings-helper-text">{translate('dashboard.savings.all-time-helper')}</p>
              </div>

              <div className="stat-card savings-stat-card" data-card="monthly-average">
                <div className="savings-stat-head">
                  <h3 className="stat-label">{translate('dashboard.savings.monthly-average')}</h3>

                </div>
                <p
                  className="stat-value"
                  id="monthlyAverageValue"
                  data-metric="monthly-average"
                >
                  ${monthlyAverage.toFixed(2)}
                </p>
                <p className="savings-helper-text">
                  {translate('dashboard.savings.average-helper-prefix')} {monthlyAverageMonthsUsed} {monthlyAverageMonthsUsed === 1 ? translate('dashboard.savings.average-helper-month') : translate('dashboard.savings.average-helper-months')}
                </p>
              </div>

              <div className="stat-card savings-stat-card" data-card="top-card">
                <div className="savings-stat-head">
                  <h3 className="stat-label">{translate('dashboard.savings.top-card')}</h3>

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
                <h2 className="savings-title">{translate('dashboard.savings.monthly-analysis-title')}</h2>
                <p className="savings-subtitle">{translate('dashboard.savings.monthly-analysis-subtitle')}</p>
              </div>

              <select
                id="selectedSavingsMonth"
                className="savings-month-select"
                value={activeSavingsMonth}
                onChange={(event) => {
                  // selected month is read here from the existing dropdown
                  setSelectedSavingsMonth(event.target.value);
                }}
              >
                {savingsMonthKeys.map((monthKey) => (
                  <option key={monthKey} value={monthKey}>
                    {getMonthKeyLabel(monthKey)}
                  </option>
                ))}
              </select>
            </header>

            <div className="savings-monthly-content">
              <section className="savings-total-banner" aria-label="total-monthly-savings">
                <div>
                  <p className="savings-total-label">{translate('dashboard.savings.total-savings-for')} {getMonthKeyLabel(activeSavingsMonth).toUpperCase()}</p>
                  <p className="savings-total-value" id="monthlySavingsValue">
                    ${selectedMonthTotalSavings.toFixed(2)}
                  </p>
                </div>


              </section>

              <div className="savings-two-col-layout">
                <section className="savings-col-card">
                  <p className="savings-col-title">{translate('dashboard.savings.card-contributions')}</p>

                  <div id="contributionList" className="savings-contribution-list">
                    {/* Card contributions UI is rendered dynamically for the selected month */}
                    {selectedMonthTopContributors.length === 0 ? (
                      <p className="savings-helper-text">{translate('dashboard.savings.no-contributions')}</p>
                    ) : (
                      selectedMonthTopContributors.map((contributor) => (
                        <article key={contributor.cardName} className="savings-contribution-item">
                          <div className="savings-contribution-left">
                            <div className="savings-item-icon" aria-hidden="true">
                              💳
                            </div>
                            <div>
                              <p className="savings-item-title">{contributor.cardName}</p>
                              <p className="savings-item-subtitle">{contributor.issuer || " "}</p>
                            </div>
                          </div>

                          <div className="savings-contribution-right">
                            <p className="savings-item-amount">+${contributor.amount.toFixed(2)}</p>
                            <p className="savings-item-earned">{translate('dashboard.savings.earned')}</p>
                          </div>
                        </article>
                      ))
                    )}
                  </div>
                </section>

                <section className="savings-col-card">
                  <p className="savings-col-title">{translate('dashboard.savings.category-breakdown')}</p>

                  <div id="categoryBreakdownChart" className="savings-donut-placeholder" aria-label="donut-chart-placeholder">
                    <div className="savings-donut-ring" style={{ background: donutBackground }} />
                  </div>

                  <div id="categoryLegendList" className="savings-legend-list">
                    {/* Legend is rendered dynamically from selected-month category totals */}
                    {donutSegments.length === 0 ? (
                      <div className="savings-legend-item">
                        <span className="savings-legend-left">{translate('dashboard.savings.no-data')}</span>
                        <span>$0.00</span>
                      </div>
                    ) : (
                      donutSegments.map((segment) => (
                        <div key={segment.categoryName} className="savings-legend-item">
                          <span className="savings-legend-left">
                            <span
                              className="savings-dot"
                              style={{ backgroundColor: segment.color }}
                            />
                            {segment.categoryName}
                          </span>
                          <span>${segment.amount.toFixed(2)}</span>
                        </div>
                      ))
                    )}
                  </div>
                </section>
              </div>
            </div>
          {(spendingLimits.dailyEnabled || spendingLimits.monthlyEnabled) && (() => {
            const now = new Date();
            const pad = n => String(n).padStart(2, '0');
            const dateKey = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
            const currentMonthKey = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
            const monthlyLimitMonthKey = activeSavingsMonth || currentMonthKey;
            const todaySpent = toNumber(dailySpendingTotals[dateKey]);
            const monthSpent = toNumber(monthlySpendingTotals[monthlyLimitMonthKey]);
            const dailyLimit = Number(spendingLimits.daily) || 0;
            const monthlyLimit = Number(spendingLimits.monthly) || 0;

            return (
              <section className="savings-limits-panel">
                <header className="cards-header">
                  <h2 className="savings-title">{translate('dashboard.savings.limits-title')}</h2>
                  <p className="savings-subtitle">{translate('dashboard.savings.limits-subtitle')}</p>
                </header>
                <div className="savings-limits-grid">
                  {spendingLimits.dailyEnabled && dailyLimit > 0 && (
                    <div className={`savings-limit-card ${todaySpent >= dailyLimit ? 'limit-exceeded' : todaySpent >= dailyLimit * 0.8 ? 'limit-warning' : ''}`}>
                      <div className="limit-card-header">
                        <span className="limit-card-label">{translate('dashboard.savings.daily')}</span>
                        <span className="limit-card-values">${todaySpent.toFixed(2)} / ${dailyLimit.toFixed(2)}</span>
                      </div>
                      <div className="limit-bar-track">
                        <div
                          className="limit-bar-fill"
                          style={{ width: `${Math.min((todaySpent / dailyLimit) * 100, 100).toFixed(1)}%` }}
                        />
                      </div>
                      {todaySpent >= dailyLimit && <p className="limit-card-alert">{translate('dashboard.savings.daily-exceeded')}</p>}
                      {todaySpent < dailyLimit && todaySpent >= dailyLimit * 0.8 && (
                        <p className="limit-card-alert">{translate('dashboard.savings.daily-approaching')}</p>
                      )}
                    </div>
                  )}
                  {spendingLimits.monthlyEnabled && monthlyLimit > 0 && (
                    <div className={`savings-limit-card ${monthSpent >= monthlyLimit ? 'limit-exceeded' : monthSpent >= monthlyLimit * 0.8 ? 'limit-warning' : ''}`}>
                      <div className="limit-card-header">
                        <span className="limit-card-label">{translate('dashboard.savings.monthly')} ({getMonthKeyLabel(monthlyLimitMonthKey)})</span>
                        <span className="limit-card-values">${monthSpent.toFixed(2)} / ${monthlyLimit.toFixed(2)}</span>
                      </div>
                      <div className="limit-bar-track">
                        <div
                          className="limit-bar-fill"
                          style={{ width: `${Math.min((monthSpent / monthlyLimit) * 100, 100).toFixed(1)}%` }}
                        />
                      </div>
                      {monthSpent >= monthlyLimit && <p className="limit-card-alert">{translate('dashboard.savings.monthly-exceeded')}</p>}
                      {monthSpent < monthlyLimit && monthSpent >= monthlyLimit * 0.8 && (
                        <p className="limit-card-alert">{translate('dashboard.savings.monthly-approaching')}</p>
                      )}
                    </div>
                  )}
                </div>
              </section>
            );
          })()}
          </section>
        </main>
      )}

      {currentView === "profile" && <UserProfile onSignOut={onSignOut} />}
    </div>
  );
}
