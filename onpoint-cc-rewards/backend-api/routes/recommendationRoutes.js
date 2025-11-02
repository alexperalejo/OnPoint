/* get best card recommendation */

const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ route: 'recommendations' });
});

module.exports = router;

