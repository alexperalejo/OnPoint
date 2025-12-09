const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// load .env from backend-api/.env
require('dotenv').config({ path: '../.env' });

// load Merchant model
const Merchant = require('../models/Merchant.js');
console.log("Merchant model loaded:", Merchant);
async function seedMerchants() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    // Load merchants.json
    const merchantsPath = path.join(__dirname, 'merchants.json');
    console.log("Loading merchant JSON from:", merchantsPath);

    const merchants = JSON.parse(fs.readFileSync(merchantsPath, 'utf8'));
    console.log("Loading from:", merchantsPath);
    //console.log("Merchant JSON content:", merchants);

    // Clear old data
    await Merchant.deleteMany({});
    console.log("Old merchant data cleared.");

    // Insert new merchants
    await Merchant.insertMany(merchants);
    console.log("Merchants seeded successfully!");

    mongoose.connection.close();
  } catch (error) {
    console.error("Error seeding merchants:", error);
    mongoose.connection.close();
  }
}

seedMerchants();

