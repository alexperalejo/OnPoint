// card save/ fetch

const express = require('express');
const router = express.Router();
const cardController = require('../controllers/cardController');

// GET all cards (supports simple query params)
router.get('/', cardController.getAllCards);

// POST add new card
router.post('/', cardController.createCard);

// Routes for single card
router.get('/:id', cardController.loadCard, cardController.getCardById);
router.patch('/:id', cardController.loadCard, cardController.updateCard);
router.delete('/:id', cardController.loadCard, cardController.deleteCard);

module.exports = router;
