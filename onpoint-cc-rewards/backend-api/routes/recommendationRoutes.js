/* get best card recommendation */

const express = require('express');
const router = express.Router();
const recommendationService = require('../services/recommendationService');
const auth = require('../middleware/auth');

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
        const merchant = await Merchant.findOne({ url_keywords: { $in: [req.body.url] } });
        if(merchant && Array.isArray(merchant.tags)) {
            merchantTags = merchant.tags;
        }
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
        const { totalValueUSD, breakdown } = recommendationService.computeCardRewardValue(card, purchase);
        return {
            cardId: card._id,
            name: card.name,
            issuer: card.issuer,
            attributes: card.attributes || card.rewards || {},
            annualFee: card.annualFee || 0,
            totalValueUSD,
            breakdown,
            tags: merchantTags
        };
    });

    // pick best: highest totalValueUSD, tie-breaker lower annual fee
    candidates.sort((a, b) => {
        if (b.totalValueUSD !== a.totalValueUSD) return b.totalValueUSD - a.totalValueUSD;
        return a.annualFee - b.annualFee;
    });

    const best = candidates[0] || null;
    return res.json({ card: best, alternatives: candidates.slice(1,4) });
});

module.exports = router;

