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
  rewards: {
    category: String,  // e.g. "Dining"
    vale: String,      // either Url, Tag, or All
    rate: Number,      // for "1.5%" store as 1.5"
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