module.exports = {
  maxReconnectionAttempts: 5,
  socketTimeout: 20000,
  cacheDuration: '1d',
  maxUploadSize: '5mb',
  rateLimiting: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
  },
  corsOptions: {
    origin: ['https://your-frontend-domain.com'],
    credentials: true
  }
};