/* Main express server*/

const express = require('express');
const connectDB = require('./database/connect');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

connectDB();

// Diagnostic test
try {
  const cardRoutes = require('./routes/cardRoutes');
  const authRoutes = require('./routes/authRoutes');
  const recommendationRoutes = require('./routes/recommendationRoutes');
  console.log('Routes loaded:', {
    cardRoutes,
    authRoutes,
    recommendationRoutes
  });

  app.use('/api/cards', cardRoutes);
  app.use('/api/users', authRoutes);
  app.use('/api/recommendations', recommendationRoutes);
} catch (err) {
  console.error('Route load error:', err);
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
