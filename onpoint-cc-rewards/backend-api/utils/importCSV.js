console.log("RUNNING FROM:", process.cwd());

console.log("DEBUG ENV MONGODB_URI =", process.env.MONGODB_URI);

require("dotenv").config();
const fs = require("fs");
const csv = require("csv-parser");
const mongoose = require("mongoose");
const Card = require("../models/Card");

// ------------------------------
// CONNECT TO DATABASE
// ------------------------------
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");
    console.log("Connected to DB name:", mongoose.connection.name); // <--- MUST show "onpoint"
  } catch (err) {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  }
}

// ------------------------------
// IMPORT CSV FUNCTION
// ------------------------------
async function importCSV() {
  await connectDB(); // <--- only connect ONCE

  const cardsMap = {};

  fs.createReadStream("database/cards.csv")
    .pipe(csv())
    .on("data", (row) => {
      const key = `${row.name}-${row.issuer}`;

      if (!cardsMap[key]) {
        cardsMap[key] = {
          name: row.name,
          issuer: row.issuer,
          type: row.type,
          rewardCategories: [],
          benefits: [],
          annualFee: Number(row.annualFee) || 0
        };
      }

      if (row.category && row.multiplier) {
        cardsMap[key].rewardCategories.push({
          category: row.category,
          multiplier: Number(row.multiplier),
          notes: row.notes || ""
        });
      }

      if (row.benefit_title) {
        cardsMap[key].benefits.push({
          title: row.benefit_title,
          description: row.benefit_description || ""
        });
      }
    })
    .on("end", async () => {
      await Card.deleteMany();
      await Card.insertMany(Object.values(cardsMap));

      console.log("CSV import completed successfully!");
      process.exit(0);
    });
}

importCSV();
