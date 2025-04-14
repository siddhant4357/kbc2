const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  passcode: {
    type: String,
    required: true,
    length: 4
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  adminPasscode: {  // Add this field
    type: String,
    default: null
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);