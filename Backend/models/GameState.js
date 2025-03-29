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
  },
  playerAnswers: [{
    username: String,
    answer: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  activeUsers: [{
    username: String,
    socketId: String,
    lastSeen: Date
  }],
  reconnectionToken: String
}, { timestamps: true });

gameStateSchema.methods.handleReconnection = async function(username, socketId) {
  const user = this.activeUsers.find(u => u.username === username);
  if (user) {
    user.socketId = socketId;
    user.lastSeen = new Date();
  } else {
    this.activeUsers.push({
      username,
      socketId,
      lastSeen: new Date()
    });
  }
  await this.save();
  return this;
};

module.exports = mongoose.model('GameState', gameStateSchema);
