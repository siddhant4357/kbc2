const QuestionBank = require('../models/QuestionBank');
const multer = require('multer');
const { storage } = require('../config/cloudinary');
const upload = multer({ storage: storage });

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

    // Use consistent path format
    // Cloudinary returns the full URL in `path`
    const imageUrl = req.file.path;

    // Log the file details
    console.log('Image upload:', {
      filename: req.file.filename,
      url: imageUrl
    });

    res.json({
      imageUrl,
      fullUrl: imageUrl
    });
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
