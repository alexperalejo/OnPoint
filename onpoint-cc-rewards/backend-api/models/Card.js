// MongoDB schema for cards

import mongoose from "mongoose";

const cardSchema = new mongoose.Schema({
  name: String,
  issuer: String,
  type: String,
  category: String,
  multiplier: Number,
  notes: String,
  benefit_title: String,
  benefit_description: String,
  annualFee: Number
});

export default mongoose.model("Card", cardSchema);


/* This model stores reward categories, issuers, types, and reward info — perfect for dynamic recommendation logic later. */