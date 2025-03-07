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
require('dotenv').config();

const httpServer = createServer(app);

// Socket.IO setup
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Socket connection handler
io.on('connection', (socket) => {

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

