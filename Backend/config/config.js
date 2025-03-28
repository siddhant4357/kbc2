require('dotenv').config();

const config = {
  // Server config
  PORT: process.env.PORT || 4000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Database
  MONGODB_URI: process.env.MONGODB_URI,
  
  // URLs
  API_URL: process.env.API_URL,
  CLIENT_URL: process.env.CLIENT_URL,
  SOCKET_URL: process.env.SOCKET_URL,
  
  // File upload
  UPLOAD_PATH: process.env.UPLOAD_PATH || 'uploads',
  
  // Security
  JWT_SECRET: process.env.JWT_SECRET,
  
  // Rate limiting
  rateLimiting: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX) || 100
  },
  
  // Cache
  cacheDuration: process.env.CACHE_DURATION || '1d'
};

module.exports = config;