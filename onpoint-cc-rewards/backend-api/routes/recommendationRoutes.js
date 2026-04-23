/* get best card recommendation */

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

    const candidates = cardDocs.map(card => {
        const rewards = recommendationService.getCardRewards(purchase, { id: card._id, attributes: card.attributes.map(a => {return {points: a.multiplier, type: a.type, value: a.category}})});
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
        image_url: resolveImageUrl(req, bestCardDoc?.image_path)
    },
        // example:"https://your-server.com/assets/cards/chase-freedom-flex.png"
    reason: buildReason(best, cardDocs),  // added reason field to explain why this card is the best recommendation
    alternatives: results.slice(1, 4) 
    });
});

module.exports = router;

