
const jwt = require('jsonwebtoken');
const User = require('../models/User');


async function authenticate(req, res, next) {
	try {
		const authHeader = req.headers.authorization || req.headers.Authorization;
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return res.status(401).json({ message: 'Unauthorized: No token provided' });
		}

		const token = authHeader.split(' ')[1];
		const secret = process.env.JWT_SECRET || 'change_this_secret';

		let payload;
		try {
			payload = jwt.verify(token, secret);
		} catch (err) {
			return res.status(401).json({ message: 'Unauthorized: Invalid token' });
		}

		const userId = payload.id || payload.userId || payload.sub;

		if (!userId) {
			req.user = payload;
			return next();
		}

		try {
			const user = await User.findById(userId).select('-__v');
			if (!user) return res.status(401).json({ message: 'Unauthorized: User not found' });
			req.user = user;
			return next();
		} catch (err) {
			console.error('Error loading user in auth middleware', err);
			return res.status(500).json({ message: 'Internal server error' });
		}
	} catch (err) {
		console.error('Auth middleware error', err);
		res.status(500).json({ message: 'Internal server error' });
	}
}

module.exports = { authenticate };
