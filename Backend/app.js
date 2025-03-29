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

// Add this line before other middleware
app.set('trust proxy', 1);

// Security middlewares
app.use(helmet());
app.use(compression());

// Update the CORS configuration
app.use(cors({
  origin: function(origin, callback) {
    if (!origin || config.CLIENT_URLS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Content-Length', 'X-Requested-With']
}));

// Add headers for WebSocket support
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Credentials', true);
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

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
// Update the game join route to handle game tokens
app.post('/api/game/join', async (req, res) => {
  const { questionBankId, passcode } = req.body;
  
  try {
    const questionBank = await QuestionBank.findById(questionBankId);
    
    if (!questionBank) {
      return res.status(404).json({ message: 'Question bank not found' });
    }

    // Verify passcode
    if (questionBank.passcode !== passcode) {
      return res.status(401).json({ message: 'Invalid passcode' });
    }

    // Generate unique game token
    const gameToken = require('crypto').randomBytes(16).toString('hex');

    // Create or update game state
    const gameState = await GameState.findOneAndUpdate(
      { questionBankId },
      { 
        $setOnInsert: {
          questionBankId,
          isActive: false,
          gameToken
        }
      },
      { upsert: true, new: true }
    );

    // Store token in response
    res.json({
      message: 'Successfully joined game',
      status: gameState.isActive ? 'active' : 'waiting',
      gameToken,
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

// Add this route to your existing routes
app.get('/api/game/:id/state', async (req, res) => {
  try {
    const gameState = await GameState.findOne({ 
      questionBankId: req.params.id 
    });
    
    if (!gameState) {
      return res.status(404).json({ 
        message: 'Game state not found' 
      });
    }

    res.json({
      isActive: gameState.isActive,
      currentQuestion: gameState.currentQuestion,
      showOptions: gameState.showOptions,
      showAnswer: gameState.showAnswer,
      currentQuestionIndex: gameState.currentQuestionIndex,
      timerStartedAt: gameState.timerStartedAt,
      timerDuration: gameState.timerDuration
    });
  } catch (error) {
    console.error('Error fetching game state:', error);
    res.status(500).json({ 
      message: 'Error fetching game state' 
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

// Game state management routes
app.post('/api/game/:id/showOptions', async (req, res) => {
  try {
    const { timerDuration } = req.body;
    await GameState.findOneAndUpdate(
      { questionBankId: req.params.id },
      { 
        showOptions: true,
        timerStartedAt: new Date(),
        timerDuration: timerDuration || 15
      }
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Error updating game state' });
  }
});

app.post('/api/game/:id/showAnswer', async (req, res) => {
  try {
    await GameState.findOneAndUpdate(
      { questionBankId: req.params.id },
      { showAnswer: true }
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Error updating game state' });
  }
});

// Add specific answer submission endpoint
app.post('/api/game/:id/answer', async (req, res) => {
  const { answer, username, gameToken } = req.body;
  
  try {
    // Validate game token
    const gameState = await GameState.findOne({ 
      questionBankId: req.params.id,
      gameToken,
      isActive: true 
    });

    if (!gameState) {
      return res.status(404).json({ message: 'Game session not found' });
    }

    // Save answer
    await GameState.findOneAndUpdate(
      { questionBankId: req.params.id, gameToken },
      { $push: { playerAnswers: { username, answer } } }
    );

    res.json({ success: true });

  } catch (error) {
    console.error('Error submitting answer:', error);
    res.status(500).json({ message: 'Error submitting answer' });
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

// Add this after all your routes
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      message: 'CORS origin not allowed',
      allowedOrigins: config.CLIENT_URLS
    });
  }
  res.status(500).json({ message: 'Internal server error' });
});

module.exports = app;
