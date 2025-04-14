const mongoose = require('mongoose');

const fastestFingerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  passcode: {
    type: String,
    required: true,
    minlength: 4,
    maxlength: 4
  },
  question: {
    text: {
      type: String,
      required: true
    },
    options: [{
      type: String,
      required: true
    }],
    correctSequence: [{
      type: Number,
      required: true
    }],
    imageUrl: {
      type: String
    }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('FastestFinger', fastestFingerSchema);
