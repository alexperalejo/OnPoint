const Card = require('../models/Card');

/**
 * Parse a card's rewards.rate string into numeric value
 * Supports examples: "3x points", "3x", "1.5%", "2% cashback"
 */
function parseRate(rateStr) {
  if (!rateStr) return { type: 'none' };
  const s = String(rateStr).toLowerCase();
  const xMatch = s.match(/([0-9]*\.?[0-9]+)x/);
  if (xMatch) return { type: 'multiplier', multiplier: parseFloat(xMatch[1]) };
  const pctMatch = s.match(/([0-9]*\.?[0-9]+)\s*%/);
  if (pctMatch) return { type: 'percent', percent: parseFloat(pctMatch[1]) };
  return { type: 'unknown' };
}

/**
 * Compute USD value for a given card and purchase.
 * - purchase.amount is in dollars (Number)
 * - card.rewards in current schema is a single object { category, rate }
 */
function computeCardRewardValue(card, purchase) {
  const amount = Number(purchase.amount || 0);
  if (!amount || amount <= 0) return { totalValueUSD: 0, breakdown: [] };

  const rewards = card.rewards ? [card.rewards] : [];
  let total = 0;
  const breakdown = [];

  for (const r of rewards) {
    if (!r) continue;
    // match category if provided
    if (r.category && purchase.category) {
      if (r.category.toLowerCase() !== purchase.category.toLowerCase()) continue;
    }
    // if merchant provided and reward description contains merchant, you could match here

    const parsed = parseRate(r.rate);
    let valueUSD = 0;
    if (parsed.type === 'percent') {
      valueUSD = (parsed.percent / 100) * amount;
    } else if (parsed.type === 'multiplier') {
      // assume multiplier refers to points multiplier on base 1 point per $ and default point value
      const basePointsPerDollar = 1;
      const points = parsed.multiplier * basePointsPerDollar * amount;
      const pointValueUSD = card.pointValueUSD || 0.01;
      valueUSD = points * pointValueUSD;
    }

    if (valueUSD > 0) {
      breakdown.push({ rule: r, valueUSD: Number(valueUSD.toFixed(4)) });
      total += valueUSD;
    }
  }

  // fallback: if no matching reward found, try base percent in rewards.rate if kind 'all'
  if (breakdown.length === 0 && card.rewards && card.rewards.category === 'All') {
    const parsed = parseRate(card.rewards.rate);
    if (parsed.type === 'percent') total = (parsed.percent / 100) * amount;
  }

  return { totalValueUSD: Number(total.toFixed(4)), breakdown };
}

/**
 * Rank user's cards (user.cards is array of ObjectId refs or populated docs)
 * Ensure caller populates user's cards or load them here.
 */
async function rankCardsForPurchase(user, purchase) {
  // normalize user.cards into card docs
  const cardDocs = [];
  if (!user) return [];
  for (const c of user.cards || []) {
    if (c && c._id) cardDocs.push(c); // already populated
    else if (c && c.card) cardDocs.push(c.card);
    else if (typeof c === 'string' || c instanceof require('mongoose').Types.ObjectId) {
      const found = await Card.findById(c).lean();
      if (found) cardDocs.push(found);
    }
  }

  const results = [];
  for (const card of cardDocs) {
    const { totalValueUSD, breakdown } = computeCardRewardValue(card, purchase);
    results.push({ cardId: card._id, name: card.name, issuer: card.issuer, annualFee: card.annualFee || 0, totalValueUSD, breakdown });
  }

  results.sort((a, b) => {
    if (b.totalValueUSD !== a.totalValueUSD) return b.totalValueUSD - a.totalValueUSD;
    return a.annualFee - b.annualFee;
  });

  return results;
}

module.exports = { parseRate, computeCardRewardValue, rankCardsForPurchase };
