// card save/ fetch

const express = require('express');
const router = express.Router();
const cardController = require('../controllers/cardController');
const auth = require('../middleware/auth');

// GET all cards (supports simple query params)
router.get('/', cardController.getAllCards);

// POST add new card (protected)
router.post('/', auth.authenticate, cardController.createCard);

// Routes for single card
router.get('/:id', cardController.loadCard, cardController.getCardById);
router.patch('/:id', auth.authenticate, cardController.loadCard, cardController.updateCard);
router.delete('/:id', auth.authenticate, cardController.loadCard, cardController.deleteCard);

module.exports = router;
