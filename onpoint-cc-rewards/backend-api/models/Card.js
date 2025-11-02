// MongoDB schema for cards

const mongoose = require('mongoose');

const creditCardSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  issuer: {
    type: String,
  },
  type: {
    type: String, // e.g. Cashback, Travel, Gas, Dining, etc.
  },
  rewards: {
    category: String,  // e.g. "Dining"
    rate: String,      // e.g. "3x points"
    description: String
  },
  annualFee: {
    type: Number,
    default: 0,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  }
});

module.exports = mongoose.model('Card', creditCardSchema);

/* This model stores reward categories, issuers, types, and reward info — perfect for dynamic recommendation logic later. */