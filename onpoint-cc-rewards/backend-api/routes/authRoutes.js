const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Register
router.post('/signup', authController.register);

// Login
router.post('/login', authController.login);

// Logout (stateless)
router.post('/logout', authController.logout);

// Test route
router.get('/', (req, res) => res.json({ route: 'users' }));

module.exports = router;
