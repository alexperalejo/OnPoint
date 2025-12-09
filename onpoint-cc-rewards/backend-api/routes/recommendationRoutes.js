/* get best card recommendation */

const express = require('express');
const router = express.Router();
const recommendationService = require('../services/recommendationService');
const auth = require('../middleware/auth');

/**
 * @typedef {object} Body
 * @property {string[]} cards
 * @property {string} url
 * @property {string[]?} tags 
 */
/**
 * {
 *      cards: ["chase"],
 *      url: "amazon.com"
 * }
 */
//router.get('/recognizedUrl')
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

    //use url to get url tags

    const paymentInfo = {url: req.body.url, tags: []}
    //get card attributes for each card
    
    const cards = []

    res.json({ card: recommendationService.reccomendCard(paymentInfo, cards)});
    
    res.json({ card: req.body.cards[0]});
});

module.exports = router;

