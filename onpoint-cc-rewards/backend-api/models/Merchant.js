const mongoose = require('mongoose');

const merchantSchema = new mongoose.Schema({
  merchant_name: { type: String, required: true },
  url_keywords: { type: [String], required: true },
  tags: { type: [String], required: true }
});

module.exports = mongoose.model('Merchant', merchantSchema);
