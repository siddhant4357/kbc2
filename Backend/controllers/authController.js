const User = require('../models/User');
const jwt = require('jsonwebtoken');

const loginOrRegister = async (req, res) => {
  const { username, passcode } = req.body;
  
  try {
    let user = await User.findOne({ username });
    
    if (!user) {
      // Create new user
      user = new User({
        username,
        passcode,
        isAdmin: username === 'admin' && passcode === '1234' // hardcoded admin credentials
      });
      await user.save();
    } else {
      // Verify passcode
      if (user.passcode !== passcode) {
        return res.status(401).json({ message: 'Invalid passcode' });
      }
    }

    // Generate JWT token
    const token = jwt.sign(
      { username: user.username, isAdmin: user.isAdmin },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({ 
      user: {
        username: user.username,
        isAdmin: user.isAdmin
      },
      token
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({ isAdmin: false });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users' });
  }
};

const deleteAllUsers = async (req, res) => {
  try {
    await User.deleteMany({ isAdmin: false });
    res.json({ message: 'All users deleted successfully' });
  } catch (error) {
    console.error('Detailed error:', error); // Add detailed error logging
    res.status(500).json({ 
      message: 'Error deleting users',
      error: error.message  // Include error message in response
    });
  }
};

module.exports = { 
  loginOrRegister,
  getAllUsers,
  deleteAllUsers
};
