// card save/ fetch

const express = require('express');
const router = express.Router();
<<<<<<< HEAD
const Card = require('../models/Card');
=======
const cardController = require('../controllers/cardController');
const auth = require('../middleware/auth');
>>>>>>> cd94c93 (refactor: move authentication middleware to separate file and protect routes)

// GET all cards
router.get('/', async (req, res) => {
  try {
    const cards = await Card.find();
    res.json(cards);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

<<<<<<< HEAD
// POST add new card
router.post('/', async (req, res) => {
  try {
    const card = new Card(req.body);
    const newCard = await card.save();
    res.status(201).json(newCard);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});
=======
// POST add new card (protected)
router.post('/', auth.authenticate, cardController.createCard);

// Routes for single card
router.get('/:id', cardController.loadCard, cardController.getCardById);
router.patch('/:id', auth.authenticate, cardController.loadCard, cardController.updateCard);
router.delete('/:id', auth.authenticate, cardController.loadCard, cardController.deleteCard);
>>>>>>> cd94c93 (refactor: move authentication middleware to separate file and protect routes)

module.exports = router;
