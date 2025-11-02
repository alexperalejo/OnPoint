// card save/ fetch

const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ route: 'cards' });
});

module.exports = router;
