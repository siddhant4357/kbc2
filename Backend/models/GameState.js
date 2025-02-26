const mongoose = require('mongoose');

const gameStateSchema = new mongoose.Schema({
  questionBankId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'QuestionBank',
    required: true
  },
  currentQuestion: {
    question: String,
    options: [String],
    correctAnswer: String
  },
  currentQuestionIndex: {
    type: Number,
    default: 0
  },
  showOptions: {
    type: Boolean,
    default: false
  },
  showAnswer: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: false
  },
  timerStartedAt: {
    type: Date,
    default: null
  },
  timerDuration: {
    type: Number,
    default: 15 // Default 15 seconds
  }
}, { timestamps: true });

module.exports = mongoose.model('GameState', gameStateSchema);