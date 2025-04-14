const mongoose = require('mongoose');

const fastestFingerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  passcode: {
    type: String,
    required: true,
    length: 4
  },
  question: {
    text: String,
    options: [String],
    correctSequence: [Number],
    imageUrl: String
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('FastestFinger', fastestFingerSchema);
