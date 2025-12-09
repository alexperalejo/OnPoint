// MongoDB schema for cards

const mongoose = require('mongoose');

const attributeSchema = new mongoose.Schema({
  type: String,        // ex: "reward"
  category: String,    // ex: "dining"
  multiplier: Number   // ex: 3
}, { _id: false });

const cardSchema = new mongoose.Schema({
  name: String,
  issuer: String,
  attributes: [attributeSchema],  // ex: [{ type: "reward", category: "dining", multiplier: 3 }]
  notes: String,
  benefit_title: String,
  benefit_description: String,
  annualFee: Number
});

module.exports = mongoose.model("Card", cardSchema);


/* This model stores reward categories, issuers, types, and reward info — perfect for dynamic recommendation logic later. */