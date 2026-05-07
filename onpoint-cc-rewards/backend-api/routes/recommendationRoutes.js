/* get best card recommendation */

function getCurrentQuarter() {
  const month = new Date().getMonth();
  if (month < 3) return 1;
  if (month < 6) return 2;
  if (month < 9) return 3;
  return 4;
}

const express = require('express');
const router = express.Router();
const recommendationService = require('../services/recommendationService');
const auth = require('../middleware/auth');

//URL resolver for card images - converts stored relative path to full URL
function resolveImageUrl(req, relativePath) {
    if (!relativePath) return null;
    return `${req.protocol}://${req.get('host')}/${relativePath}`;
}

/**
 * @typedef {object} Body
 * @property {string[]} cards
 * @property {string} url
 * @property {string[]?} tags 
 */
/**
 * {
 *      cards: ["chase"],
 *      url: "amazon.com"
 * }
 */
//router.get('/recognizedUrl')

const Merchant = require('../models/Merchant');
const Card = require('../models/Card');


// POST /api/recommendations
router.post('/', async function(req, res) {
    if(!Array.isArray(req.body.cards)) {
        return res.status(400).json({message: "Must send available card ids in request body"});
    }
    if(req.body.cards.length === 0) {
        return res.status(400).json({message: "cards must have at least one element"});
    }
    if(!req.body.url) {
        return res.status(400).json({message: "Must send url in request body"});
    }
    // Query Merchant model for tags using the url
    let merchantTags = [];
    try {
        // Find merchant whose url_keywords match the url
        const hostname = (() => {
            try { return new URL(req.body.url).hostname.replace('www.', ''); }
            catch { return req.body.url; }
        })();
        const merchant = await Merchant.findOne({ 
            url_keywords: { $in: [hostname] }
        }).lean();
        

        if(merchant && Array.isArray(merchant.tags)) {
            merchantTags = merchant.tags;
        }
        console.log("Looking for url:", req.body.url);
        console.log("Merchant found:", merchant);
        console.log("Tags:", merchantTags);
    } catch (err) {
        console.error('Error querying Merchant:', err);
    }

    // Fetch card documents from DB
    let cardDocs = [];
    try {
        
        cardDocs = await Card.find({ _id: { $in: req.body.cards } }).lean();
    } catch (err) {
        console.error('Error fetching cards:', err);
        return res.status(500).json({ message: 'Error fetching cards' });
    }

    if (!cardDocs || cardDocs.length === 0) {
        return res.status(404).json({ message: 'No cards found for provided ids' });
    }

    // Build clean array of card objects with attributes, compute score using existing service
    const purchase = { url: req.body.url, tags: merchantTags, amount: Number(req.body.amount) || 1 };

    const currentQuarter = getCurrentQuarter();
    const candidates = cardDocs.map(card => {
        const expandedAttributes = card.attributes.flatMap(attr => {
          if (attr.type === 'tag' && attr.category === 'rotating' && card.rotatingSchedule?.length) {
            const schedule = card.rotatingSchedule.find(s => s.quarter === currentQuarter);
            if (schedule) {
              return schedule.categories.map(cat => ({
                type: 'tag',
                category: cat,
                multiplier: attr.multiplier
              }));
            }
          }
          return attr;
        });
        const rewards = recommendationService.getCardRewards(purchase, {
          id: card._id,
          attributes: expandedAttributes.map(a => ({ points: a.multiplier, type: a.type, value: a.category }))
        });
        return {
            results: {
                cardId: card._id,
                rewardPoints: rewards.points,
                breakdown: rewards.breakdown,
            },
            additionalInfo: {
                annualFee: card.annualFee || 0
            }
        };
    });

    // pick best: highest points
    const results = candidates.sort((a, b) => {
        if(a.results.rewardPoints != b.results.rewardPoints) 
            return b.results.rewardPoints - a.results.rewardPoints; 
        return a.additionalInfo.annualFee - b.additionalInfo.annualFee; // tiebreaker: lower annual fee wins
    }).map(a => {return a.results});


/**
 * Builds a human-readable string explaining why a particular card is the best recommendation
 * @param {Object} best - The best card recommendation
 * @param {Object[]} cardDocs - Array of card documents
 * @returns {String} A human-readable string explaining why the card is the best recommendation
 */
    function buildReason(best, cardDocs) {
    if (!best || best.rewardPoints === 0) return "No special rewards for this purchase.";
    const card = cardDocs.find(c => String(c._id) === String(best.cardId));
    const name = card?.name || "This card";
    const parts = best.breakdown.map(b => {
        const pct = Math.round(b.contribution * 100);
        if (b.from === 'cashback') return `${pct}% base cashback`;
        return `${pct}% from ${b.from} bonus`;
    });
    return `${name} earns ${best.rewardPoints} pts here: ${parts.join(', ')}.`;
    }
    
    const best = results[0] || null;
    const bestCardDoc = cardDocs.find(c => String(c._id) === String(best.cardId));

    return res.json({
    card: {
        ...best,
        name: bestCardDoc?.name || null,
        issuer: bestCardDoc?.issuer || null,
        annualFee: bestCardDoc?.annualFee ?? 0,
        image_path: bestCardDoc?.image_path || null,
        image_url: resolveImageUrl(req, bestCardDoc?.image_path)
    },
        // example:"https://your-server.com/assets/cards/chase-freedom-flex.png"
    reason: buildReason(best, cardDocs),  // added reason field to explain why this card is the best recommendation
    alternatives: results.slice(1, 4) 
    });
});

// POST /api/recommendations/personalized
// Body: { cardIds: string[], categorySpending: { [category]: number } }
// Scores every card the user doesn't own against their historical category spending
// and returns the top 3 by projected reward value.
router.post('/personalized', async function(req, res) {
    if (!Array.isArray(req.body.cardIds)) {
        return res.status(400).json({ message: "Must send cardIds array in request body" });
    }
    if (!req.body.categorySpending || typeof req.body.categorySpending !== 'object') {
        return res.status(400).json({ message: "Must send categorySpending object in request body" });
    }

    const ownedIds = new Set(req.body.cardIds.map(String));
    const categorySpending = req.body.categorySpending; // { dining: 500, groceries: 200, … }

    // Need a non-empty spending profile to produce meaningful scores
    const totalSpending = Object.values(categorySpending).reduce((s, v) => s + (Number(v) || 0), 0);
    if (totalSpending <= 0) {
        return res.json({ recommendations: [] });
    }

    let allCards;
    try {
        allCards = await Card.find({})
            .select("name issuer attributes annualFee image_path cardType rotatingSchedule")
            .lean();
    } catch (err) {
        console.error('Error fetching cards for personalized recs:', err);
        return res.status(500).json({ message: 'Error fetching cards' });
    }

    const currentQuarter = getCurrentQuarter();
    const candidates = allCards.filter(card => !ownedIds.has(String(card._id)));

    if (candidates.length === 0) {
        return res.json({ recommendations: [] });
    }

    const scored = candidates.map(card => {
        // Expand rotating attributes for the current quarter
        const expandedAttrs = card.attributes.flatMap(attr => {
            if (attr.type === 'tag' && attr.category === 'rotating' && card.rotatingSchedule?.length) {
                const schedule = card.rotatingSchedule.find(s => s.quarter === currentQuarter);
                if (schedule) {
                    return schedule.categories.map(cat => ({
                        type: 'tag',
                        category: cat,
                        multiplier: attr.multiplier
                    }));
                }
            }
            return attr;
        });

        // Build per-category tag multiplier map and base multiplier
        // (matching recommendationService: tag + all are additive for a purchase)
        const tagMultipliers = {}; // category -> sum of matching tag multipliers
        let baseMultiplier = 0;
        for (const attr of expandedAttrs) {
            if (attr.type === 'tag') {
                const cat = attr.category.toLowerCase();
                tagMultipliers[cat] = (tagMultipliers[cat] || 0) + attr.multiplier;
            } else if (attr.type === 'all') {
                baseMultiplier += attr.multiplier;
            }
        }

        // Score = sum over spending categories of:
        //   spending[cat] * (tagMultiplier[cat] + baseMultiplier)
        // For unmatched categories, only baseMultiplier applies.
        let score = 0;
        const categoryContributions = [];

        for (const [cat, rawAmount] of Object.entries(categorySpending)) {
            const spending = Number(rawAmount) || 0;
            if (spending <= 0) continue;
            const catLower = cat.toLowerCase();
            const tagRate = tagMultipliers[catLower] || 0;
            const effectiveRate = tagRate + baseMultiplier;
            score += spending * effectiveRate;

            if (tagRate > 0) {
                categoryContributions.push({
                    category: cat,
                    rate: effectiveRate,
                    projectedReward: Math.round(spending * effectiveRate) / 100
                });
            }
        }

        // Top 2 bonus categories by projected reward value
        categoryContributions.sort((a, b) => b.projectedReward - a.projectedReward);
        const topCategories = categoryContributions.slice(0, 2);

        const rotatingLabel = card.rotatingSchedule?.find(s => s.quarter === currentQuarter)?.label || null;

        return {
            cardId: card._id,
            name: card.name,
            issuer: card.issuer,
            annualFee: card.annualFee || 0,
            image_url: resolveImageUrl(req, card.image_path),
            score,
            topCategories,
            rotatingLabel
        };
    });

    // Best card = highest score; tiebreak = lowest annual fee
    scored.sort((a, b) => b.score !== a.score ? b.score - a.score : a.annualFee - b.annualFee);

    return res.json({ recommendations: scored.slice(0, 3) });
});

module.exports = router;

