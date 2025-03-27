require('dotenv').config();

const config = {
  // Server config
  PORT: process.env.PORT || 4000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Database
  MONGODB_URI: process.env.MONGODB_URI || process.env.DB_CONNECT || 'mongodb://localhost:27017/kbc',
  
  // URLs
  API_URL: process.env.API_URL || 'http://localhost:4000',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  SOCKET_URL: process.env.SOCKET_URL || 'http://localhost:4000',
  
  // File upload
  UPLOAD_PATH: process.env.UPLOAD_PATH || 'uploads',
  
  // Optional: Add JWT secret if implementing JWT auth
  JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key'
};

module.exports = config;