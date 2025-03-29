const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');
const config = require('./config/config');
const authController = require('./controllers/authController');
const questionBankController = require('./controllers/questionBankController');
const QuestionBank = require('./models/QuestionBank');
const GameState = require('./models/GameState');
const UserPoints = require('./models/UserPoints');
const rateLimit = require('express-rate-limit');

const app = express();

// Security middlewares
app.use(helmet());
app.use(compression());

// CORS configuration using environment variables
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Existing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files with caching
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: '1d',
  etag: true
}));

// Add rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use('/api/', limiter);

// Add to app.js at the top
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", "wss:", "ws:", "your-frontend-domain.com"],
      imgSrc: ["'self'", "data:", "blob:"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"]
    }
  }
}));

// Auth routes
app.post('/api/auth/login', authController.loginOrRegister);
app.get('/api/users', authController.getAllUsers);
app.delete('/api/users', authController.deleteAllUsers);

// Question Bank routes
app.get('/api/questionbanks', questionBankController.getAllQuestionBanks);
app.post('/api/questionbanks', questionBankController.createQuestionBank);
app.get('/api/questionbanks/:id', questionBankController.getQuestionBankById);
app.put('/api/questionbanks/:id', questionBankController.updateQuestionBank);
app.delete('/api/questionbanks/:id', questionBankController.deleteQuestionBank);

// Add image upload route
app.post('/api/upload/question-image', 
  questionBankController.upload.single('image'), 
  questionBankController.uploadQuestionImage
);

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
    let gameState = await GameState.findOne({ 
      gameToken,
      questionBankId: req.params.id 
    });
    
    if (!gameState) {
      // Create default game state if none exists
      gameState = {
        isActive: false,
        currentQuestion: null,
        showOptions: false,
        showAnswer: false,
        currentQuestionIndex: 0
      };
    }
    
    res.json(gameState);
  } catch (error) {
    console.error('Error fetching game state:', error);
    res.status(500).json({ 
      message: 'Error fetching game state',
      fallback: {
        isActive: false,
        currentQuestion: null,
        showOptions: false,
        showAnswer: false
      }
    });
  }
});

// Game state routes
app.get('/api/game/:id/status', async (req, res) => {
  try {
    const gameState = await GameState.findOne({ 
      questionBankId: req.params.id 
    });

    res.json({
      isActive: gameState?.isActive || false,
      currentQuestion: gameState?.currentQuestion || null,
      showOptions: gameState?.showOptions || false,
      showAnswer: gameState?.showAnswer || false
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error fetching game status',
      error: error.message 
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

// Test route in app.js
app.get('/api/test-db', async (req, res) => {
  try {
    const questionBanks = await QuestionBank.find();
    const users = await User.find();
    res.json({
      questionBanksCount: questionBanks.length,
      usersCount: users.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Base route
app.get('/', (req, res) => {
  res.send('KBC API is running');
});

// Health check route
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date(),
    uptime: process.uptime()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something broke!' });
});

module.exports = app;
