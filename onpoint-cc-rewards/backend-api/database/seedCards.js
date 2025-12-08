const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// load .env
require('dotenv').config({ path: __dirname + '/../.env' });

// load model
const Card = require('../models/Card.js');

async function seedCards() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    //  ADD THESE TWO LINES RIGHT HERE:
    const cardsPath = path.join(__dirname, 'cards.json');
    console.log("Reading from:", cardsPath);

    const cards = JSON.parse(fs.readFileSync(cardsPath, 'utf8'));

    // Clear old data
    await Card.deleteMany({});
    console.log("Old card data cleared.");

    // Insert new data
    await Card.insertMany(cards);
    console.log("Cards seeded successfully!");

    mongoose.connection.close();
  } catch (error) {
    console.error("Error seeding cards:", error);
    mongoose.connection.close();
  }
}

seedCards();
