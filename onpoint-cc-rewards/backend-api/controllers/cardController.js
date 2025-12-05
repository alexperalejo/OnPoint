const Card = require('../models/Card');

exports.getAllCards = async (req, res) => {
  try {
    const query = {};

    Object.keys(req.query).forEach(k => {
      query[k] = req.query[k];
    });
    const cards = await Card.find(query);
    res.json(cards);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createCard = async (req, res) => {
  try {
    const card = new Card(req.body);
    const newCard = await card.save();
    res.status(201).json(newCard);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.loadCard = async (req, res, next) => {
  try {
    const card = await Card.findById(req.params.id);
    if (!card) return res.status(404).json({ message: 'Card not found' });
    req.card = card;
    next();
  } catch (err) {
    return res.status(400).json({ message: 'Invalid card id' });
  }
};

exports.getCardById = (req, res) => {
  res.json(req.card);
};

exports.updateCard = async (req, res) => {
  try {
    const card = req.card;
    Object.assign(card, req.body);
    card.updatedAt = Date.now();
    const saved = await card.save();
    res.json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.deleteCard = async (req, res) => {
  try {
    await req.card.remove();
    res.json({ message: 'Card deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
