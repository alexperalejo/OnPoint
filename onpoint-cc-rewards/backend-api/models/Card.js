// MongoDB schema for cards

const mongoose = require('mongoose');

const cardSchema = new mongoose.Schema({
  name: String,
  issuer: String,
  attributes: [
    {
      type: String,       // ex: "dining", "travel", "grocery"
      category: String,   // category name
      multiplier: Number  // numeric reward multiplier
    }
  ],
  notes: String,
  benefit_title: String,
  benefit_description: String,
  annualFee: Number
});

module.exports = mongoose.model("Card", cardSchema);


/* This model stores reward categories, issuers, types, and reward info — perfect for dynamic recommendation logic later. */