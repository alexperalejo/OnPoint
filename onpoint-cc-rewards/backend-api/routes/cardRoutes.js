// card save/ fetch

const express = require('express');
const router = express.Router();
const Card = require('../models/Card');
const cardController = require('../controllers/cardController');
const auth = require('../middleware/auth');

// GET all cards
router.get('/', async (req, res) => {
  try {
    const cards = await Card.find();
    res.json(cards);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST add new card (protected)
router.post('/', auth.authenticate, cardController.createCard);

// Routes for single card
router.get('/:id', cardController.loadCard, cardController.getCardById);
router.patch('/:id', auth.authenticate, cardController.loadCard, cardController.updateCard);
router.delete('/:id', auth.authenticate, cardController.loadCard, cardController.deleteCard);

module.exports = router;
