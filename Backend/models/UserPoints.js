const mongoose = require('mongoose');

const userPointsSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  points: {
    type: Number,
    default: 0
  },
  correctAnswers: {
    type: Number,
    default: 0
  },
  totalAttempts: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

module.exports = mongoose.model('UserPoints', userPointsSchema);