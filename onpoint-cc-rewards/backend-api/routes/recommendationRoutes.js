/* get best card recommendation */

const express = require('express');
const router = express.Router();
const recommendationController = require('../controllers/recommendationController');
const auth = require('../middleware/auth');

// POST /api/recommendations
router.post('/', async function(req, res) {
    if(!Array.isArray(req.body.cards) )
    {
        res.status(400).json({message: "Must send available card ids in request body"})
        return;
    }
    if(req.body.cards.length == 0)
    {
        res.status(400).json({message: "cards must have at least one element"})
        return;
    }
    res.json({ card: req.body.cards[0]});
});

module.exports = router;

