/* get best card recommendation */

const express = require('express');
const router = express.Router();
<<<<<<< HEAD

router.get('/', (req, res) => {
  res.json({ route: 'recommendations' });
});
=======
const recommendationController = require('../controllers/recommendationController');
const auth = require('../middleware/auth');

// GET /api/recommendations?category=Dining&top=3 (protected)
router.get('/', auth.authenticate, recommendationController.getRecommendations);

// GET /api/recommendations/category/:category (protected)
router.get('/category/:category', auth.authenticate, recommendationController.getByCategory);
>>>>>>> cd94c93 (refactor: move authentication middleware to separate file and protect routes)

module.exports = router;

