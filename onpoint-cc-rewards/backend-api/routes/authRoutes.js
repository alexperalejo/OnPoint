// signup, login, logout

const express = require('express');
const router = express.Router();

// Example signup route
router.post('/signup', (req, res) => {
  const { name, email } = req.body;
  res.json({ message: `Welcome, ${name}!`, email });
});

// Example test route
router.get('/', (req, res) => {
  res.json({ route: 'users' });
});

module.exports = router;
