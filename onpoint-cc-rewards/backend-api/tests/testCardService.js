const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });

const cardService = require('../services/cardService');

async function runTests() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI);

    console.log("✔ Connected!");

    console.log("\n--- Testing getAllCards() ---");
    const allCards = await cardService.getAllCards();
    console.log("Total cards found:", allCards.length);
    console.log(allCards);

    if (allCards.length > 0) {
      const testId = allCards[0]._id.toString();

      console.log(`\n--- Testing getCardById(${testId}) ---`);
      const singleCard = await cardService.getCardById(testId);
      console.log(singleCard);
    }

    mongoose.connection.close();
  } catch (err) {
    console.error(err);
    mongoose.connection.close();
  }
}

runTests();
