//net start MongoDB for connecting backend in cmd 

const express = require('express');
const cors = require('cors');
const { createServer } = require('http');
const { Server } = require('socket.io');
const connectDB = require('./db/db');
const app = require('./app');
const { 
  generateGameToken, 
  getGameState, 
  saveGameState, 
  saveLockedAnswer,
  clearGameState 
} = require('./utils/gameUtils');
const GameState = require('./models/GameState');
const UserPoints = require('./models/UserPoints');
const config = require('./config/config');
require('dotenv').config();
const os = require('os');

const httpServer = createServer(app);

// Socket.IO setup with environment-based config
const io = new Server(httpServer, {
  cors: {
    origin: config.CLIENT_URLS,
    methods: ["GET", "POST", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"]
  },
  path: '/socket.io',
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
  upgradeTimeout: 30000,
  allowUpgrades: true,
  cookie: false
});

// Enhance error handling and logging
io.engine.on("connection_error", (err) => {
  console.log('Connection error:', err);
});

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });

  socket.on('joinGame', async ({ questionBankId, username, isAdmin }) => {
    try {
      const room = questionBankId;
      await socket.join(room);
      console.log(`${username} joined game ${room}`);

      // Notify admin about new player
      if (!isAdmin) {
        socket.to(room).emit('playerJoined', { username });
      }

      // Send current game state
      const gameState = await GameState.findOne({ questionBankId: room });
      if (gameState) {
        socket.emit('gameStateUpdate', gameState);
      }
    } catch (error) {
      console.error('Error on join:', error);
      socket.emit('error', 'Failed to join game');
    }
  });

  // Admin actions
  socket.on('adminAction', async (data) => {
    try {
      const gameState = await GameState.findOne({ 
        questionBankId: questionBankId,
      });

      if (!gameState) return;

      switch (data.action) {
        case 'startGame':
          await GameState.findOneAndUpdate(
            { questionBankId: questionBankId },
            {
              isActive: true,
              currentQuestion: data.question,
              showOptions: false,
              showAnswer: false,
              currentQuestionIndex: 0
            }
          );
          io.to(questionBankId).emit('gameStateUpdate', {
            isActive: true,
            currentQuestion: data.question,
            showOptions: false,
            showAnswer: false,
            currentQuestionIndex: 0
          });
          break;

        case 'showOptions':
          const now = new Date();
          await GameState.findOneAndUpdate(
            { questionBankId: questionBankId },
            {
              showOptions: true,
              timerStartedAt: now,
              timerDuration: data.timerDuration
            }
          );
          io.to(questionBankId).emit('gameStateUpdate', {
            showOptions: true,
            timerStartedAt: now,
            timerDuration: data.timerDuration
          });
          break;

        case 'showAnswer':
          await GameState.findOneAndUpdate(
            { questionBankId: questionBankId },
            { showAnswer: true }
          );
          io.to(questionBankId).emit('gameStateUpdate', { showAnswer: true });
          break;

        case 'nextQuestion':
          await GameState.findOneAndUpdate(
            { questionBankId: questionBankId },
            {
              currentQuestion: data.question,
              currentQuestionIndex: data.questionIndex,
              showOptions: false,
              showAnswer: false,
              timerStartedAt: null
            }
          );
          io.to(questionBankId).emit('gameStateUpdate', {
            currentQuestion: data.question,
            currentQuestionIndex: data.questionIndex,
            showOptions: false,
            showAnswer: false,
            timerStartedAt: null
          });
          break;

        case 'stopGame':
          await GameState.findOneAndUpdate(
            { questionBankId: questionBankId },
            {
              isActive: false,
              showOptions: false,
              showAnswer: false
            }
          );
          io.to(questionBankId).emit('gameStateUpdate', { isActive: false });
          break;
      }
    } catch (error) {
      console.error('Error processing admin action:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Make io accessible to other modules
app.set('io', io);

// Connect to MongoDB
connectDB();

// Start server
const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

