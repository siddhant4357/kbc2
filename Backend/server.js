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
  // Store user info
  let currentUser = null;

  socket.on('identify', (data) => {
    currentUser = {
      username: data.username,
      isAdmin: data.isAdmin,
      room: data.questionBankId
    };
    socket.join(data.questionBankId);

    // Notify admin about new player
    if (!data.isAdmin) {
      socket.to(data.questionBankId).emit('playerJoined', {
        username: data.username
      });
    }
  });

  socket.on('adminAction', async (data) => {
    if (!currentUser?.isAdmin) return;

    try {
      switch (data.action) {
        case 'showOptions':
          await GameState.findOneAndUpdate(
            { questionBankId: currentUser.room },
            { 
              showOptions: true,
              timerStartedAt: new Date(),
              timerDuration: data.timerDuration || 15
            }
          );
          io.to(currentUser.room).emit('showOptions', {
            timerStartedAt: new Date(),
            timerDuration: data.timerDuration || 15
          });
          break;

        case 'showAnswer':
          await GameState.findOneAndUpdate(
            { questionBankId: currentUser.room },
            { showAnswer: true }
          );
          io.to(currentUser.room).emit('showAnswer');
          break;

        case 'stopGame':
          await GameState.findOneAndUpdate(
            { questionBankId: currentUser.room },
            { 
              isActive: false,
              currentQuestion: null,
              showOptions: false,
              showAnswer: false
            }
          );
          io.to(currentUser.room).emit('gameStop');
          break;
      }
    } catch (error) {
      console.error('Error processing admin action:', error);
      socket.emit('error', 'Failed to process admin action');
    }
  });

  socket.on('playerAnswer', (data) => {
    if (!currentUser || currentUser.isAdmin) return;

    // Send answer to admin
    socket.to(currentUser.room).emit('playerAnswer', {
      username: currentUser.username,
      answer: data.answer
    });
  });

  socket.on('joinGame', async ({ id }) => {
    socket.join(id);
    
    try {
      // Get current game state
      let gameState = await GameState.findOne({ questionBankId: id });
      
      // Send current state to joining user
      if (gameState && gameState.isActive) {
        socket.emit('gameState', {
          currentQuestion: gameState.currentQuestion,
          showOptions: gameState.showOptions,
          showAnswer: gameState.showAnswer,
          isActive: true
        });
      } else {
        // Always emit waiting state if game is not active
        socket.emit('gameState', { 
          isActive: false,
          currentQuestion: null,
          showOptions: false,
          showAnswer: false
        });
      }
    } catch (error) {
      console.error('Error joining game:', error);
    }
  });

  socket.on('startGame', async (data) => {
    try {
      let gameState = await GameState.findOneAndUpdate(
        { questionBankId: data.questionBankId },
        {
          questionBankId: data.questionBankId,
          currentQuestion: {
            ...data.question,
            questionIndex: 0 // Ensure this is set
          },
          currentQuestionIndex: 0,
          showOptions: false,
          showAnswer: false,
          isActive: true
        },
        { upsert: true, new: true }
      );

      io.to(data.questionBankId).emit('gameState', {
        currentQuestion: gameState.currentQuestion,
        showOptions: false,
        showAnswer: false,
        isActive: true
      });
    } catch (error) {
      console.error('Error starting game:', error);
    }
  });

  socket.on('questionUpdate', async (data) => {
    try {
      await GameState.findOneAndUpdate(
        { questionBankId: data.questionBankId, isActive: true },
        {
          currentQuestion: {
            ...data.question,
            questionIndex: data.questionIndex,
            question: data.question.question,
            options: data.question.options,
            correctAnswer: data.question.correctAnswer
          },
          currentQuestionIndex: data.questionIndex,
          showOptions: false,
          showAnswer: false
        }
      );

      // Send both question data and index
      io.to(data.questionBankId).emit('questionUpdate', {
        question: data.question.question,
        options: data.question.options,
        correctAnswer: data.question.correctAnswer,
        questionIndex: data.questionIndex  // Ensure this is included
      });
    } catch (error) {
      console.error('Error updating question:', error);
    }
  });

  socket.on('showOptions', async (data) => {
    try {
      await GameState.findOneAndUpdate(
        { questionBankId: data.questionBankId, isActive: true },
        { 
          showOptions: true,
          timerStartedAt: new Date(),
          timerDuration: data.timerDuration || 15 // Use provided duration or default
        }
      );

      io.to(data.questionBankId).emit('showOptions', {
        timerStartedAt: new Date(),
        timerDuration: data.timerDuration || 15
      });
    } catch (error) {
      console.error('Error showing options:', error);
    }
  });

  socket.on('showAnswer', async (data) => {
    try {
      await GameState.findOneAndUpdate(
        { questionBankId: data.questionBankId, isActive: true },
        { showAnswer: true }
      );

      io.to(data.questionBankId).emit('showAnswer');
    } catch (error) {
      console.error('Error showing answer:', error);
    }
  });

  socket.on('answerLocked', async ({ questionBankId, answer, username }) => {
    try {
      const gameState = await GameState.findOne({ 
        questionBankId, 
        isActive: true 
      });

      if (gameState && gameState.currentQuestion) {
        const isCorrect = answer === gameState.currentQuestion.correctAnswer;
        
        // Update user points
        if (isCorrect) {
          await UserPoints.findOneAndUpdate(
            { username },
            { 
              $inc: { 
                points: 10,
                correctAnswers: 1,
                totalAttempts: 1
              } 
            },
            { upsert: true, new: true }
          );
        } else {
          await UserPoints.findOneAndUpdate(
            { username },
            { $inc: { totalAttempts: 1 } },
            { upsert: true }
          );
        }

        // Only emit correctness to user, not points
        socket.emit('pointsUpdate', { isCorrect });
      }
    } catch (error) {
      console.error('Error processing answer:', error);
    }
  });

  socket.on('gameStop', async ({ questionBankId }) => {
    try {
      await GameState.findOneAndUpdate(
        { questionBankId },
        { 
          isActive: false,
          currentQuestion: null,
          showOptions: false,
          showAnswer: false,
          currentQuestionIndex: 0
        }
      );

      // Emit stop event to all connected clients
      io.to(questionBankId).emit('gameStop');
    } catch (error) {
      console.error('Error stopping game:', error);
    }
  });

  socket.on('disconnect', () => {
    if (currentUser && !currentUser.isAdmin) {
      socket.to(currentUser.room).emit('playerLeft', {
        username: currentUser.username
      });
    }

    try {
      // Cleanup any user-specific game states
      const user = socket.user;
      if (user) {
        // Handle user disconnect logic
      }
    } catch (error) {
      console.error('Error handling disconnect:', error);
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

