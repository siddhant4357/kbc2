const QuestionBank = require('../models/QuestionBank');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Ensure uploads directory exists
    const uploadDir = path.join(__dirname, '../uploads/questions');
    if (!fs.existsSync(uploadDir)){
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    cb(null, `question-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images are allowed'));
    }
  }
});

const getAllQuestionBanks = async (req, res) => {
  try {
    const questionBanks = await QuestionBank.find();
    res.json(questionBanks);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching question banks' });
  }
};

const createQuestionBank = async (req, res) => {
  try {
    const questionBank = new QuestionBank(req.body);
    await questionBank.save();
    res.status(201).json(questionBank);
  } catch (error) {
    res.status(500).json({ message: 'Error creating question bank' });
  }
};

const getQuestionBankById = async (req, res) => {
  try {
    const questionBank = await QuestionBank.findById(req.params.id);
    if (!questionBank) {
      return res.status(404).json({ message: 'Question bank not found' });
    }
    res.json(questionBank);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching question bank' });
  }
};

const updateQuestionBank = async (req, res) => {
  try {
    const questionBank = await QuestionBank.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!questionBank) {
      return res.status(404).json({ message: 'Question bank not found' });
    }
    res.json(questionBank);
  } catch (error) {
    res.status(500).json({ message: 'Error updating question bank' });
  }
};

const deleteQuestionBank = async (req, res) => {
  try {
    const questionBank = await QuestionBank.findByIdAndDelete(req.params.id);
    if (!questionBank) {
      return res.status(404).json({ message: 'Question bank not found' });
    }
    res.json({ message: 'Question bank deleted successfully' });
  } catch (error) {
    console.error('Error deleting question bank:', error);
    res.status(500).json({ message: 'Error deleting question bank' });
  }
};

const uploadQuestionImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }

    const imageUrl = `/uploads/questions/${req.file.filename}`;
    console.log('Image saved at:', path.join(__dirname, '..', imageUrl)); // Debug log
    
    res.json({ imageUrl });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({ message: 'Error uploading image' });
  }
};

module.exports = {
  getAllQuestionBanks,
  createQuestionBank,
  getQuestionBankById,
  updateQuestionBank,
  deleteQuestionBank,
  uploadQuestionImage,
  upload
};
