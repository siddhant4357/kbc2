const User = require('../models/User');
const jwt = require('jsonwebtoken');

const loginOrRegister = async (req, res) => {
  const { username, passcode } = req.body;
  
  try {
    let user = await User.findOne({ username });
    
    if (!user) {
      // Create new user - regular user
      user = new User({
        username,
        passcode,
        isAdmin: false,
        adminPasscode: null
      });
      await user.save();
    } else {
      // Verify passcode
      if (user.passcode !== passcode) {
        return res.status(401).json({ message: 'Invalid passcode' });
      }
    }

    // Don't send adminPasscode in response
    const userResponse = {
      username: user.username,
      isAdmin: user.isAdmin
    };

    const token = jwt.sign(
      userResponse,
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({ user: userResponse, token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Add new controller to create admin
const createAdmin = async (req, res) => {
  try {
    const { username, passcode, adminPasscode } = req.body;
    
    // Check if requester is an admin
    const requesterToken = req.headers.authorization?.split(' ')[1];
    if (!requesterToken) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const decoded = jwt.verify(requesterToken, process.env.JWT_SECRET);
    const requester = await User.findOne({ username: decoded.username });
    
    if (!requester?.isAdmin) {
      return res.status(403).json({ message: 'Only admins can create other admins' });
    }

    // Create new admin user
    const newAdmin = new User({
      username,
      passcode,
      isAdmin: true,
      adminPasscode
    });

    await newAdmin.save();

    res.status(201).json({ message: 'Admin created successfully' });
  } catch (error) {
    console.error('Create admin error:', error);
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
  createAdmin,
  getAllUsers,
  deleteAllUsers
};
