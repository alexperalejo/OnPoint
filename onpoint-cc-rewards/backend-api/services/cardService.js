const Card = require('../models/Card.js');

/**
 * Get all cards in the database.
 * @returns {Promise<Array>} Array of card documents
 */
async function getAllCards(){
    try {
        //return await Card.find({}).lean();
        return await Card.find({}).select("name issuer attributes annualFee pointValue image_path cardType rotatingSchedule").lean();
    } catch (err) {
        console.error('Error fetching cards:', err);
        throw err;
    }
}

/**
 * Get a single card by ID
 * @param {string} id - MongoDB ObjectId of card
 * @returns {Promise<Object|null>} Card document or null if not found
 */

async function getCardById(id){
    try{
        //return await Card.findById(id).lean();
        return await Card.findById(id).lean();
    } catch (err) {
        console.error(`error fetching card with ID ${id}:`, err);
        throw err;
    }
}

module.exports = {
    getAllCards:getAllCards, 
    getCardById:getCardById
}