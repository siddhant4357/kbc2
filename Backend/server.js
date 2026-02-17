//net start MongoDB for connecting backend in cmd 

const express = require('express');
const { createServer } = require('http');
const connectDB = require('./db/db');
const app = require('./app');
const config = require('./config/config');
require('dotenv').config();
const os = require('os');

const httpServer = createServer(app);

// Connect to MongoDB
connectDB();

// Start server
const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);

  // Initialize keep-alive mechanism
  if (process.env.NODE_ENV === 'production') {
    const keepAlive = require('./utils/keepAlive');
    const websiteUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
    keepAlive(websiteUrl);
  }
});

