/* Main express server*/

const express = require('express');
const connectDB = require('./database/connect');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Import routes
const cardRoutes = require('./routes/cardRoutes');
const userRoutes = require('./routes/authRoutes');
const recommendationRoutes = require('./routes/recommendationRoutes');

// Connect DB
connectDB();

// Use routes
app.use('/api/cards', cardRoutes);
app.use('/api/users', userRoutes);
app.use('/api/recommendations', recommendationRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
