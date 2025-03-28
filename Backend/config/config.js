require('dotenv').config();

const config = {
  PORT: process.env.PORT || 4000,
  MONGODB_URI: process.env.MONGODB_URI,
  CLIENT_URL: process.env.NODE_ENV === 'production' 
    ? process.env.CLIENT_URL 
    : 'http://localhost:5173',
  JWT_SECRET: process.env.JWT_SECRET,
  uploadPath: 'uploads'
};

module.exports = config;