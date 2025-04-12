require('dotenv').config();
const connectDB = require('../db/db');
const User = require('../models/User');

const initializeDb = async () => {
  try {
    await connectDB();
    
    // Create admin users
    const adminUsers = [
      {
        username: 'admin',
        passcode: '4321',
        isAdmin: true,
        adminPasscode: '4321'  // Main admin
      },
      {
        username: 'superadmin',
        passcode: '5678',
        isAdmin: true,
        adminPasscode: '5678'  // Another admin
      }
      // Add more admin users as needed
    ];

    // Create or update admin users
    for (const adminData of adminUsers) {
      await User.findOneAndUpdate(
        { username: adminData.username },
        adminData,
        { upsert: true, new: true }
      );
    }

    console.log('Admin users initialized successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
};

initializeDb();
