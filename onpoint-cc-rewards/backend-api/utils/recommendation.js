// basic logic - match category to best card

const express = require('express');
const router = express.Router();
const Card = require('../models/Card');

router.get('/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const cards = await Card.find({ 'rewards.category': { $regex: new RegExp(category, 'i') } });
    res.json(cards);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
