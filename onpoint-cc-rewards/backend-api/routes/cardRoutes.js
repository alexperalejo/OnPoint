// card save/ fetch

const express = require('express');
const router = express.Router();
const cardService = require('../services/cardService');

// GET all cards
router.get('/', async (req, res) => {
  try {
    res.json(cardService.getAllCards());
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get card
router.get('/:id', async (req, res) => {
  try{
    res.json(cardService.getCardById(req.params.id))
  } catch(err){
    res.status(500).json({message: err})
  }
});

module.exports = router;
