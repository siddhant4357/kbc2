const crypto = require('crypto');

// In-memory storage for game states (in production, use Redis or a database)
const gameStates = new Map();

const generateGameToken = () => {
  return crypto.randomBytes(16).toString('hex');
};

const getGameState = (gameId, token) => {
  const key = `${gameId}_${token}`;
  return gameStates.get(key);
};

const saveGameState = (gameId, token, state) => {
  const key = `${gameId}_${token}`;
  gameStates.set(key, state);
};

const saveLockedAnswer = (gameId, answer, token) => {
  const key = `${gameId}_${token}`;
  const state = gameStates.get(key) || {};
  state.lockedAnswer = answer;
  gameStates.set(key, state);
};

const clearGameState = (gameId, token) => {
  const key = `${gameId}_${token}`;
  gameStates.delete(key);
};

module.exports = {
  generateGameToken,
  getGameState,
  saveGameState,
  saveLockedAnswer,
  clearGameState
};