// MongoDB schema for users

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  // Optional: store user's selected or owned cards
  cards: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CreditCard',
  }]
});

module.exports = mongoose.model('User', userSchema);


/* This defines a simple user with name, email, timestamp, and references to saved credit cards. */