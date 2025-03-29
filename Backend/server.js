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
  let currentRoom = null;
  let currentUser = null;

  socket.on('joinGame', async ({ questionBankId, username, isAdmin }) => {
    try {
      currentRoom = questionBankId;
      currentUser = username;
      socket.join(questionBankId);
      
      // Update connected players
      await GameState.findOneAndUpdate(
        { questionBankId },
        { 
          $push: { 
            connectedPlayers: {
              username,
              joinedAt: new Date()
            }
          }
        }
      );

      // Send current game state to joining user
      const gameState = await GameState.findOne({ questionBankId });
      if (gameState) {
        socket.emit('gameStateUpdate', gameState);
      }

      // Notify admin about new player
      if (!isAdmin) {
        socket.to(questionBankId).emit('playerJoined', { username });
      }
    } catch (error) {
      console.error('Error on join:', error);
      socket.emit('error', 'Failed to join game');
    }
  });

  socket.on('adminAction', async (data) => {
    try {
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

        case 'stopGame':
          // Calculate final scores and update leaderboard
          const gameState = await GameState.findOne({ questionBankId: currentRoom });
          if (gameState) {
            const playerScores = calculatePlayerScores(gameState.playerAnswers);
            await updateLeaderboard(playerScores);
            
            await GameState.findOneAndUpdate(
              { questionBankId: currentRoom },
              { isActive: false }
            );
            
            io.to(currentRoom).emit('gameEnd', { playerScores });
            io.to(currentRoom).emit('redirect', '/dashboard');
          }
          break;

        // ... other cases remain the same
      }
    } catch (error) {
      console.error('Error processing admin action:', error);
    }
  });

  socket.on('disconnect', async () => {
    if (currentRoom && currentUser) {
      // Update player's left timestamp
      await GameState.findOneAndUpdate(
        { 
          questionBankId: currentRoom,
          'connectedPlayers.username': currentUser
        },
        { 
          $set: { 
            'connectedPlayers.$.leftAt': new Date()
          }
        }
      );
      
      socket.to(currentRoom).emit('playerLeft', { username: currentUser });
    }
  });
});

// Helper function to calculate scores
function calculatePlayerScores(playerAnswers) {
  const scores = {};
  playerAnswers.forEach(answer => {
    if (!scores[answer.username]) {
      scores[answer.username] = {
        points: 0,
        correctAnswers: 0,
        totalAttempts: 0
      };
    }
    scores[answer.username].totalAttempts++;
    if (answer.isCorrect) {
      scores[answer.username].points += answer.points;
      scores[answer.username].correctAnswers++;
    }
  });
  return scores;
}

// Helper function to update leaderboard
async function updateLeaderboard(playerScores) {
  try {
    const updates = Object.entries(playerScores).map(([username, score]) => ({
      updateOne: {
        filter: { username },
        update: {
          $inc: {
            points: score.points,
            correctAnswers: score.correctAnswers,
            totalAttempts: score.totalAttempts
          }
        },
        upsert: true
      }
    }));

    await UserPoints.bulkWrite(updates);
  } catch (error) {
    console.error('Error updating leaderboard:', error);
  }
}

// Make io accessible to other modules
app.set('io', io);

// Connect to MongoDB
connectDB();

// Start server
const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

