const express = require('express');
const cors = require('cors');
const authController = require('./controllers/authController');
const questionBankController = require('./controllers/questionBankController');
const QuestionBank = require('./models/QuestionBank');
const GameState = require('./models/GameState'); // Add this import
const UserPoints = require('./models/UserPoints');

const app = express();

// Middleware
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Auth routes
app.post('/api/auth/login', authController.loginOrRegister);
app.get('/api/users', authController.getAllUsers);
app.delete('/api/users', authController.deleteAllUsers);

// Question Bank routes
app.get('/api/questionbanks', questionBankController.getAllQuestionBanks);
app.post('/api/questionbanks', questionBankController.createQuestionBank);
app.get('/api/questionbanks/:id', questionBankController.getQuestionBankById);
app.put('/api/questionbanks/:id', questionBankController.updateQuestionBank);

// Game routes
app.post('/api/game/join', async (req, res) => {
  const { questionBankId, passcode } = req.body;
  
  try {
    // Find the question bank
    const questionBank = await QuestionBank.findById(questionBankId);
    
    if (!questionBank) {
      return res.status(404).json({ message: 'Question bank not found' });
    }

    // Verify passcode
    if (questionBank.passcode !== passcode) {
      return res.status(401).json({ message: 'Invalid passcode' });
    }

    // Check if game is active
    const gameState = await GameState.findOne({ questionBankId });
    if (!gameState || !gameState.isActive) {
      return res.json({
        message: 'Waiting for admin to start the game',
        status: 'waiting',
        questionBank: {
          id: questionBank._id,
          name: questionBank.name
        }
      });
    }

    // Return success with minimal game state
    res.json({
      message: 'Successfully joined game',
      status: 'active',
      questionBank: {
        id: questionBank._id,
        name: questionBank.name,
        questionsCount: questionBank.questions.length
      }
    });

  } catch (error) {
    console.error('Error joining game:', error);
    res.status(500).json({ message: 'Error joining game' });
  }
});

app.post('/api/game/:id/stop', async (req, res) => {
  try {
    // Update game state to inactive and reset all fields
    await GameState.findOneAndUpdate(
      { questionBankId: req.params.id },
      { 
        isActive: false,
        currentQuestion: null,
        showOptions: false,
        showAnswer: false,
        currentQuestionIndex: 0
      },
      { new: true }
    );
    
    // Get io instance and emit game stop event
    const io = req.app.get('io');
    io.to(req.params.id).emit('gameStop');
    
    res.json({
      message: 'Game stopped successfully'
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error stopping game' 
    });
  }
});

app.post('/api/game/:id/state', async (req, res) => {
  const { gameToken } = req.body;
  
  try {
    // Validate game token and return current game state
    const gameState = await GameState.findOne({ 
      gameToken,
      questionBankId: req.params.id 
    });
    
    if (!gameState) {
      return res.status(404).json({ message: 'Game session not found' });
    }
    
    res.json(gameState);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching game state' });
  }
});

// Game state routes
app.get('/api/game/:id/status', async (req, res) => {
  try {
    const questionBank = await QuestionBank.findById(req.params.id);
    if (!questionBank) {
      return res.status(404).json({ 
        message: 'Game not found' 
      });
    }
    
    // Return game status
    res.json({
      isActive: true,
      questionBank: {
        id: questionBank._id,
        name: questionBank.name,
        questionsCount: questionBank.questions.length
      }
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error fetching game status' 
    });
  }
});

// Answer submission route
app.post('/api/game/:id/answer', async (req, res) => {
  const { questionIndex, answer } = req.body;
  
  try {
    const questionBank = await QuestionBank.findById(req.params.id);
    if (!questionBank) {
      return res.status(404).json({ 
        message: 'Game not found' 
      });
    }

    const question = questionBank.questions[questionIndex];
    if (!question) {
      return res.status(404).json({ 
        message: 'Question not found' 
      });
    }

    // Check if answer is correct
    const isCorrect = answer === question.correctAnswer;

    res.json({
      isCorrect,
      correctAnswer: question.correctAnswer
    });

  } catch (error) {
    res.status(500).json({ 
      message: 'Error submitting answer' 
    });
  }
});

// Leaderboard routes
app.get('/api/leaderboard', async (req, res) => {
  try {
    const leaderboard = await UserPoints.find()
      .sort({ points: -1, correctAnswers: -1 })
      .select('username points correctAnswers totalAttempts');
    
    res.json(leaderboard);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ message: 'Error fetching leaderboard' });
  }
});

app.delete('/api/leaderboard', async (req, res) => {
  try {
    await UserPoints.deleteMany({});
    const io = req.app.get('io');
    io.emit('leaderboardReset');
    res.json({ message: 'Leaderboard cleared successfully' });
  } catch (error) {
    console.error('Error clearing leaderboard:', error);
    res.status(500).json({ message: 'Error clearing leaderboard' });
  }
});

// Base route
app.get('/', (req, res) => {
  res.send('KBC API is running');
});

module.exports = app;