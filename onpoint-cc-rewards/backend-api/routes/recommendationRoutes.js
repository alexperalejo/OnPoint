/* get best card recommendation */

const express = require('express');
const router = express.Router();
const recommendationController = require('../controllers/recommendationController');

// GET /api/recommendations?category=Dining&top=3
router.get('/', recommendationController.getRecommendations);

// GET /api/recommendations/category/:category
router.get('/category/:category', recommendationController.getByCategory);

module.exports = router;

