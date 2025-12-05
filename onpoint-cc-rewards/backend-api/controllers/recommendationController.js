const Card = require('../models/Card');


function parseRate(rateStr) {
  if (!rateStr) return 0;
  const m = rateStr.match(/([0-9]+(\.[0-9]+)?)/);
  if (!m) return 0;
  return parseFloat(m[1]);
}


exports.getRecommendations = async (req, res) => {
  try {
    const { category, top } = req.query;
    const limit = parseInt(top, 10) || 5;

    let cards;
    if (category) {
      cards = await Card.find({ 'rewards.category': { $regex: new RegExp(category, 'i') } });
    } else {
      cards = await Card.find();
    }

    
    const scored = cards.map(c => ({
      card: c,
      score: parseRate(c.rewards && c.rewards.rate)
    }));

    scored.sort((a, b) => b.score - a.score);

    const result = scored.slice(0, limit).map(s => s.card);
    res.json(result);
  } catch (err) {
    console.error('Recommendation error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};


exports.getByCategory = async (req, res) => {
  req.query.category = req.params.category;
  return exports.getRecommendations(req, res);
};
