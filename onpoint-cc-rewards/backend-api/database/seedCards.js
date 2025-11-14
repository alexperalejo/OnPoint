// initial card list load (first credit cards dataset)
/* Seed MongoDB with sample credit cards for OnPoint */

const mongoose = require('mongoose');
require('dotenv').config();
const Card = require('./models/Card');

const seedCards = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const sampleCards = [
      {
        name: 'Chase Sapphire Preferred',
        issuer: 'Chase',
        type: 'Travel',
        rewards: {
          category: 'Dining & Travel',
          rate: '3x points',
          description: 'Earn 3x points on dining and travel purchases.'
        },
        annualFee: 95
      },
      {
        name: 'American Express Gold',
        issuer: 'American Express',
        type: 'Dining',
        rewards: {
          category: 'Dining & Groceries',
          rate: '4x points',
          description: 'Earn 4x at restaurants and supermarkets.'
        },
        annualFee: 250
      },
      {
        name: 'Citi Double Cash',
        issuer: 'Citi',
        type: 'Cashback',
        rewards: {
          category: 'All Purchases',
          rate: '2% cash back',
          description: '1% when you buy, 1% when you pay.'
        },
        annualFee: 0
      },
      {
        name: 'Discover It Cashback',
        issuer: 'Discover',
        type: 'Cashback',
        rewards: {
          category: 'Rotating',
          rate: '5% rotating categories',
          description: '5% cashback on rotating quarterly categories.'
        },
        annualFee: 0
      },
      {
        name: 'Wells Fargo Autograph',
        issuer: 'Wells Fargo',
        type: 'Everyday',
        rewards: {
          category: 'Gas, Dining, Travel',
          rate: '3x points',
          description: 'Earn 3x points on popular everyday categories.'
        },
        annualFee: 0
      },
      {
        name: 'Capital One Venture Rewards',
        issuer: 'Capital One',
        type: 'Travel',
        rewards: {
          category: 'All Travel',
          rate: '2x miles',
          description: 'Earn 2x miles on every purchase, every day.'
        },
        annualFee: 95
      }
    ];

    await Card.deleteMany({});
    await Card.insertMany(sampleCards);

    console.log('Seeded sample credit cards successfully!');
    mongoose.connection.close();
  } catch (err) {
    console.error('Error seeding data:', err);
    mongoose.connection.close();
  }
};

seedCards();
