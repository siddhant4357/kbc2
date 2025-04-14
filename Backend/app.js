const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');
const multer = require('multer');
const config = require('./config/config');
const authController = require('./controllers/authController');
const questionBankController = require('./controllers/questionBankController');
const QuestionBank = require('./models/QuestionBank');
const GameState = require('./models/GameState');
const UserPoints = require('./models/UserPoints');
const FastestFinger = require('./models/FastestFinger');
const rateLimit = require('express-rate-limit');
const fs = require('fs');


// Add multer storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'uploads/questions');
    if (!fs.existsSync(uploadDir)){
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `fastest-finger-${uniqueSuffix}${ext}`);
  }
});

// Create multer upload middleware
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Not an image file'));
    }
  }
});

const app = express();

// Add this line before other middleware
app.set('trust proxy', 1);

// Security middlewares
app.use(helmet());
app.use(compression());

const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? [
        'https://kbc-frontend-beige.vercel.app',
        'https://kbc-frontend-1-git-main-siddhants-projects-bf927e7a.vercel.app'
      ]
    : ['http://localhost:5173'], // Add your local frontend URL
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  exposedHeaders: ['Cross-Origin-Resource-Policy']
};

// Update CORS middleware
app.use(cors(corsOptions));

// Add OPTIONS handling for preflight requests
app.options('*', cors(corsOptions));

// Update helmet configuration for better CORS handling
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "blob:", "https:", "http:"],
      connectSrc: ["'self'", "https:", "http:", "wss:"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      fontSrc: ["'self'", "https:", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'", "https:", "http:"],
      frameSrc: ["'self'"],
    }
  }
}));

// Add this after your CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin);
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Existing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));



// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads/questions');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve static files with caching headers
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: '100d',
  etag: true,
  lastModified: true,
  setHeaders: (res, path) => {
    // Enable CORS for images
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=86400');
  }
}));

// Ensure the uploads directory exists
const uploadDir = path.join(__dirname, 'uploads', 'questions');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Update static file serving configuration
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res) => {
    res.set({
      'Access-Control-Allow-Origin': '*',
      'Cross-Origin-Resource-Policy': 'cross-origin',
      'Cache-Control': 'public, max-age=86400',
      'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept'
    });
  }
}));

// Add rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use('/api/', limiter);

// Add this before your routes
app.use((err, req, res, next) => {
  if (err.code === 'ENOENT') {
    console.error('File not found:', err);
    return res.status(404).json({ message: 'Image not found' });
  }
  next(err);
});

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
  try {
    const { currentQuestion, showOptions, showAnswer, timerStartedAt, timerDuration } = req.body;
    
    const gameState = await GameState.findOneAndUpdate(
      { questionBankId: req.params.id },
      { 
        currentQuestion,
        showOptions,
        showAnswer,
        timerStartedAt,
        timerDuration,
        $set: {
          'players.$[].lockedAnswer': null  // Reset locked answers for all players
        }
      },
      { new: true }
    );

    if (!gameState) {
      return res.status(404).json({ message: 'Game state not found' });
    }

    res.json(gameState);
  } catch (error) {
    console.error('Error updating game state:', error);
    res.status(500).json({ message: 'Error updating game state' });
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

app.post('/api/game/:id/leave', async (req, res) => {
  try {
    const { username } = req.body;
    const { id } = req.params;
    
    // Update game state if needed
    await GameState.findOneAndUpdate(
      { questionBankId: id },
      { $pull: { players: { username } } }
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error handling player leave:', error);
    res.status(500).json({ message: 'Error processing leave request' });
  }
});

// Add next question route
app.post('/api/game/:id/nextQuestion', async (req, res) => {
  try {
    const gameState = await GameState.findOneAndUpdate(
      { questionBankId: req.params.id },
      { 
        currentQuestion: req.body.currentQuestion,
        showOptions: false,
        showAnswer: false,
        timerStartedAt: null,
        'players.$[].lockedAnswer': null  // Reset all players' locked answers
      },
      { new: true }
    );

    res.json(gameState);
  } catch (error) {
    console.error('Error updating game state:', error);
    res.status(500).json({ message: 'Error updating game state' });
  }
});

// Fastest Finger routes
app.post('/api/fastest-finger/create', async (req, res) => {
  try {
    // Get user from cookies instead of req.user
    const userStr = req.cookies.user;
    if (!userStr) {
      return res.status(401).json({ message: 'Unauthorized - No user found in cookies' });
    }
    
    const user = JSON.parse(userStr);
    if (!user.isAdmin) {
      return res.status(401).json({ message: 'Unauthorized - Admin access required' });
    }

    const { name, passcode, question } = req.body;

    // Validate input
    if (!name || !passcode || !question.text || !question.options || !question.correctSequence) {
      return res.status(400).json({ 
        message: 'Missing required fields',
        received: { name, passcode, question }
      });
    }

    // Create new game
    const fastestFinger = new FastestFinger({
      name,
      passcode,
      question,
      createdBy: user._id || 'admin' // Fallback if _id is not available
    });

    // Save to database
    await fastestFinger.save();
    console.log('Fastest finger game created:', fastestFinger);

    res.status(201).json(fastestFinger);
  } catch (error) {
    console.error('Error creating fastest finger game:', error);
    res.status(500).json({ 
      message: 'Error creating game', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Get all Fastest Finger games
app.get('/api/fastest-finger', async (req, res) => {
  try {
    const games = await FastestFinger.find();
    res.json(games);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching fastest finger games' });
  }
});

// Get specific Fastest Finger game
app.get('/api/fastest-finger/:id', async (req, res) => {
  try {
    const game = await FastestFinger.findById(req.params.id);
    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }
    res.json(game);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching game' });
  }
});

// Validate fastest finger passcode
app.post('/api/fastest-finger/validate', async (req, res) => {
  try {
    const { bankId, passcode } = req.body;
    const game = await FastestFinger.findById(bankId);
    
    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }

    if (game.passcode !== passcode) {
      return res.status(401).json({ message: 'Invalid passcode' });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Error validating game' });
  }
});

app.post('/api/fastest-finger/submit', async (req, res) => {
  try {
    const { bankId, sequence, isCorrect } = req.body;
    
    // You can store the submission in your database here if needed
    // For now, just sending back success response
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Error submitting sequence' });
  }
});

// Create Fastest Finger Game
app.post('/api/fastest-finger/create', async (req, res) => {
  try {
    // Get user from request
    const userStr = req.cookies.user;
    if (!userStr) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const user = JSON.parse(userStr);

    const { name, passcode, question } = req.body;

    // Validate input
    if (!name || !passcode || !question.text || !question.options || !question.correctSequence) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Create new game
    const fastestFinger = new FastestFinger({
      name,
      passcode,
      question,
      createdBy: user._id
    });

    // Save to database
    await fastestFinger.save();

    res.status(201).json(fastestFinger);
  } catch (error) {
    console.error('Error creating fastest finger game:', error);
    res.status(500).json({ message: 'Error creating game', error: error.message });
  }
});

// Get all Fastest Finger games
app.get('/api/fastest-finger', async (req, res) => {
  try {
    const games = await FastestFinger.find()
      .select('-question.correctSequence') // Don't send correct sequence to client
      .sort({ createdAt: -1 });
    res.json(games);
  } catch (error) {
    console.error('Error fetching fastest finger games:', error);
    res.status(500).json({ message: 'Error fetching games' });
  }
});

// Image upload for fastest finger
app.post('/api/upload/fastest-finger-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }

    const filename = req.file.filename;
    const imageUrl = `/uploads/questions/${filename}`;

    // Log the file details for debugging
    console.log('Image upload:', {
      filename,
      path: req.file.path,
      url: imageUrl
    });

    res.json({ 
      imageUrl,
      fullUrl: `${process.env.API_URL}${imageUrl}`
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({ message: 'Error uploading image' });
  }
});

// Leaderboard routes
app.post('/api/leaderboard/update', async (req, res) => {
  try {
    const { username, points, isCorrect } = req.body;

    let userPoints = await UserPoints.findOne({ username });

    if (!userPoints) {
      userPoints = new UserPoints({
        username,
        points: 0,
        correctAnswers: 0,
        totalAttempts: 0
      });
    }

    userPoints.points += points;
    if (isCorrect) {
      userPoints.correctAnswers += 1;
    }
    userPoints.totalAttempts += 1;
    userPoints.lastUpdated = Date.now();

    await userPoints.save();

    res.json({ 
      success: true, 
      points: userPoints.points, 
      correctAnswers: userPoints.correctAnswers 
    });
  } catch (error) {
    console.error('Error updating leaderboard:', error);
    res.status(500).json({ message: 'Error updating leaderboard' });
  }
});

app.get('/api/leaderboard', async (req, res) => {
  try {
    const leaderboard = await UserPoints.find()
      .sort({ points: -1, correctAnswers: -1 })
      .select('username points correctAnswers totalAttempts')
      .limit(100);
    
    res.json(leaderboard);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ message: 'Error fetching leaderboard' });
  }
});

app.delete('/api/leaderboard', async (req, res) => {
  try {
    await UserPoints.deleteMany({});
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
    console.error('CORS Origin:', req.headers.origin);
    return res.status(403).json({
      message: 'CORS origin not allowed',
      origin: req.headers.origin,
      allowedOrigins: config.CLIENT_URLS
    });
  }
  res.status(500).json({ message: 'Internal server error' });
});

module.exports = app;
