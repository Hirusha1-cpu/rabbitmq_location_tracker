// models/Location.js
const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  latitude: {
    type: Number,
    required: true
  },
  longitude: {
    type: Number,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true // Adds createdAt and updatedAt fields
});

// Index for faster queries
locationSchema.index({ timestamp: -1 });

module.exports = mongoose.model('Location', locationSchema);