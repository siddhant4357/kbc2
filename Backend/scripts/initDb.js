require('dotenv').config();
const connectDB = require('../db/db');
const User = require('../models/User');

const initializeDb = async () => {
  try {
    await connectDB();
    
    // Create single admin user
    const adminUser = {
      username: 'admin',
      passcode: '1234',
      isAdmin: true
    };

    // Create or update admin user
    await User.findOneAndUpdate(
      { username: adminUser.username },
      adminUser,
      { upsert: true, new: true }
    );

    console.log('Admin user initialized successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
};

initializeDb();
