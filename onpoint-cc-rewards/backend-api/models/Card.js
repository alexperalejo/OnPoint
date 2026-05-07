// MongoDB schema for cards

const mongoose = require('mongoose');

const attributeSchema = new mongoose.Schema({
  type: {
      type: String,
      required: true
    },  // ex: "reward"
  category: String,    // ex: "dining"
  multiplier: {
      type: Number,
      required: true
    }   // ex: 3
}, { _id: false });

const cardSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  issuer: String,
  cardType: { 
    type: String,
    enum: ['cashback', 'points'],
          default: 'cashback'
  },
  attributes: [attributeSchema],  // ex: [{ type: "reward", category: "dining", multiplier: 3 }]
  notes: String,
  benefit_title: String,
  benefit_description: String,
  annualFee: Number,
  pointValue: { type: Number, default: null }, // dollar value per point/mile (e.g. 0.0125 = 1.25¢). null for cashback cards.
  image_path: { type: String }, // renamed from imageKey, stores relative path
  rotatingSchedule: [{
    quarter: { type: Number, enum: [1, 2, 3, 4] },
    categories: [{ type: String }],
    label: { type: String }
  }]
});

module.exports = mongoose.model("Card", cardSchema);


/* This model stores reward categories, issuers, types, and reward info — perfect for dynamic recommendation logic later. */