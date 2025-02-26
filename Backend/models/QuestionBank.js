const mongoose = require('mongoose');

const questionBankSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  passcode: {
    type: String,
    required: true,
    length: 4
  },
  questions: [{
    question: String,
    options: [String],
    correctAnswer: String
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

module.exports = mongoose.model('QuestionBank', questionBankSchema);