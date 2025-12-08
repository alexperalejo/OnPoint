const User = require('../models/User');
const Card = require('../models/Card');
const recommendationService = require('../services/recommendationService');

async function getRecommendations(req, res) {
  try {
    // auth middleware should attach req.user as a user document or at least id
    const userId = req.user && (req.user._id || req.user.id);
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const body = req.method === 'GET' ? req.query : req.body;
    const { merchantName, merchantDomain, category, amount, currency } = body;
    if (!amount) return res.status(400).json({ message: 'amount is required' });

    // fetch user and populate cards
    const user = await User.findById(userId).populate('cards').exec();
    if (!user) return res.status(404).json({ message: 'User not found' });

    const purchase = { merchantName, merchantDomain, category, amount: Number(amount), currency: currency || 'USD' };

    const ranked = await recommendationService.rankCardsForPurchase(user, purchase);

    return res.json({ recommendation: ranked[0] || null, alternatives: ranked.slice(1, 4) });
  } catch (err) {
    console.error('recommendationController.getRecommendations error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function getByCategory(req, res) {
  try {
    const category = req.params.category;
    if (!category) return res.status(400).json({ message: 'category required' });

    const cards = await Card.find({ 'rewards.category': new RegExp(`^${category}$`, 'i') }).lean();
    const purchase = { category, amount: 100 };
    const results = cards.map(c => {
      const r = recommendationService.computeCardRewardValue(c, purchase);
      return { cardId: c._id, name: c.name, issuer: c.issuer, score: r.totalValueUSD, breakdown: r.breakdown };
    }).sort((a, b) => b.score - a.score);

    return res.json({ category, top: results.slice(0, 10) });
  } catch (err) {
    console.error('recommendationController.getByCategory error', err);
    res.status(500).json({ message: 'Internal server error' });
  }
}

module.exports = { getRecommendations, getByCategory };
//controller for recommendation routes