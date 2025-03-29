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
    origin: ['https://kbc-frontend-beige.vercel.app/'],
    credentials: true
  },
  socket: {
    pingTimeout: 60000,
    pingInterval: 25000,
    upgradeTimeout: 30000,
    transports: ['websocket', 'polling']
  },
  cors: {
    origin: process.env.CLIENT_URL?.split(',') || [],
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true
  }
};
