require('dotenv').config();

const config = {
  PORT: process.env.PORT || 4000,
  MONGODB_URI: process.env.MONGODB_URI,
  CLIENT_URLS: process.env.NODE_ENV === 'production'
    ? [
        'https://kbc-frontend-beige.vercel.app',
        'https://kbc-frontend-1-git-main-siddhants-projects-bf927e7a.vercel.app',
        'https://*.firebaseapp.com',
        'https://*.firebasedatabase.app'
      ]
    : ['http://localhost:5173'],
  JWT_SECRET: process.env.JWT_SECRET,
  uploadPath: 'uploads'
};

module.exports = config;
