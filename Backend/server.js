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
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ["GET", "POST"],
    credentials: true
  },
  path: '/socket.io'
});

const socketErrorHandler = (socket, next) => {
  socket.on('error', (error) => {
    console.error('Socket error:', error);
    socket.emit('error', 'An error occurred');
  });
  next();
};

io.use(socketErrorHandler);

// Add error handling
io.on('connect_error', (error) => {
  console.error('Socket connection error:', error);
});

io.on('connect_timeout', (timeout) => {
  console.error('Socket connection timeout:', timeout);
});

// Add reconnection handling
io.on('connection', (socket) => {
  let currentRoom = null;

  // Join game room
  socket.on('joinGame', async ({ questionBankId, username, isAdmin }) => {
    currentRoom = questionBankId;
    socket.join(questionBankId);
    
    console.log(`${username} joined game ${questionBankId}`);
    
    try {
      const gameState = await GameState.findOne({ questionBankId });
      if (gameState) {
        socket.emit('gameStateUpdate', gameState);
      }
    } catch (error) {
      console.error('Error on join:', error);
    }
  });

  // Admin actions
  socket.on('adminAction', async (data) => {
    try {
      const gameState = await GameState.findOne({ 
        questionBankId: currentRoom,
      });

      if (!gameState) return;

      switch (data.action) {
        case 'startGame':
          await GameState.findOneAndUpdate(
            { questionBankId: currentRoom },
            {
              isActive: true,
              currentQuestion: data.question,
              showOptions: false,
              showAnswer: false,
              currentQuestionIndex: 0
            }
          );
          io.to(currentRoom).emit('gameStateUpdate', {
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
            { questionBankId: currentRoom },
            {
              showOptions: true,
              timerStartedAt: now,
              timerDuration: data.timerDuration
            }
          );
          io.to(currentRoom).emit('gameStateUpdate', {
            showOptions: true,
            timerStartedAt: now,
            timerDuration: data.timerDuration
          });
          break;

        case 'showAnswer':
          await GameState.findOneAndUpdate(
            { questionBankId: currentRoom },
            { showAnswer: true }
          );
          io.to(currentRoom).emit('gameStateUpdate', { showAnswer: true });
          break;

        case 'nextQuestion':
          await GameState.findOneAndUpdate(
            { questionBankId: currentRoom },
            {
              currentQuestion: data.question,
              currentQuestionIndex: data.questionIndex,
              showOptions: false,
              showAnswer: false,
              timerStartedAt: null
            }
          );
          io.to(currentRoom).emit('gameStateUpdate', {
            currentQuestion: data.question,
            currentQuestionIndex: data.questionIndex,
            showOptions: false,
            showAnswer: false,
            timerStartedAt: null
          });
          break;

        case 'stopGame':
          await GameState.findOneAndUpdate(
            { questionBankId: currentRoom },
            {
              isActive: false,
              showOptions: false,
              showAnswer: false
            }
          );
          io.to(currentRoom).emit('gameStateUpdate', { isActive: false });
          break;
      }
    } catch (error) {
      console.error('Error processing admin action:', error);
    }
  });

  socket.on('disconnect', () => {
    if (currentRoom) {
      socket.leave(currentRoom);
    }
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

