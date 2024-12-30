const mongoose = require('mongoose');

const restaurantSchema = new mongoose.Schema({
  name: String,
  location: String,
  dish: String,
  rating: Number,
  date: Date
});

module.exports = mongoose.model('Restaurant', restaurantSchema);