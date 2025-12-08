/* get best card recommendation */

const express = require('express');
const router = express.Router();
const recommendationController = require('../controllers/recommendationController');
const auth = require('../middleware/auth');

// POST /api/recommendations  { merchantDomain, merchantName, category, amount }
router.post('/', auth.authenticate, recommendationController.getRecommendations);

// GET /api/recommendations?category=Dining&top=3 (protected)
router.get('/', auth.authenticate, recommendationController.getRecommendations);

// GET /api/recommendations/category/:category (protected)
router.get('/category/:category', auth.authenticate, recommendationController.getByCategory);

module.exports = router;

