require('dotenv').config();
const connectDB = require('../db/db');
const QuestionBank = require('../models/QuestionBank');
const User = require('../models/User');

const initializeDb = async () => {
  try {
    await connectDB();
    
    // Create admin user
    const admin = new User({
      username: 'admin',
      passcode: '1234',
      isAdmin: true
    });
    await admin.save();

    // Create sample question bank
    const sampleBank = new QuestionBank({
      name: 'Sample Questions',
      passcode: '0000',
      questions: [
        {
          question: 'What is the capital of India?',
          options: ['Mumbai', 'New Delhi', 'Kolkata', 'Chennai'],
          correctAnswer: 'New Delhi'
        }
      ],
      createdBy: admin._id
    });
    await sampleBank.save();

    console.log('Database initialized successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
};

initializeDb();