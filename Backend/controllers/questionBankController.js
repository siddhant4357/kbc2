const QuestionBank = require('../models/QuestionBank');

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

module.exports = {
  getAllQuestionBanks,
  createQuestionBank,
  getQuestionBankById,
  updateQuestionBank
};