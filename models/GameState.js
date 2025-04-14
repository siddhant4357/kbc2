const mongoose = require('mongoose');

const gameStateSchema = new mongoose.Schema({
  questionBankId: String,
  isActive: { type: Boolean, default: false },
  currentQuestion: {
    id: String,
    question: String,
    options: [String],
    correctAnswer: String,
    questionIndex: Number,
    imageUrl: String
  },
  showOptions: { type: Boolean, default: false },
  showAnswer: { type: Boolean, default: false },
  timerStartedAt: Date,
  timerDuration: { type: Number, default: 15 },
  currentQuestionIndex: { type: Number, default: 0 },
  gameToken: String,
  playerAnswers: [{
    username: String,
    answer: String,
    isCorrect: Boolean,
    points: Number,
    timestamp: Date
  }],
  connectedPlayers: [{
    username: String,
    joinedAt: Date,
    leftAt: Date
  }]
});

module.exports = mongoose.model('GameState', gameStateSchema);