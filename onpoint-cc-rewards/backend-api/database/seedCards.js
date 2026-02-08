const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// load .env
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// load model
const Card = require('../models/Card.js');
console.log("Card model file:", require.resolve("../models/Card.js"));
console.log("Schema paths:", Object.keys(Card.schema.paths));


async function seedCards() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    //  ADD THESE TWO LINES RIGHT HERE:
    const cardsPath = path.resolve(__dirname, 'cards.json');
    console.log("Reading from:", cardsPath);

    const cards = JSON.parse(fs.readFileSync(cardsPath, 'utf8'));
    console.log("First card imageKey:", cards?.[0]?.imageKey);

    // Clear old data
    await Card.deleteMany({});
    console.log("Old card data cleared.");

    // Insert new data
    await Card.insertMany(cards);
    
    const one = await Card.findOne({ name: "Chase Freedom Unlimited" }).lean();
    console.log("FROM DB AFTER INSERT:", one);

    console.log("Cards seeded successfully!");

    mongoose.connection.close();
  } catch (error) {
    console.error("Error seeding cards:", error);
    mongoose.connection.close();
  }
}

seedCards();
