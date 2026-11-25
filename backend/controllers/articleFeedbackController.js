const ArticleFeedback = require("../models/ArticleFeedback");
const KnowledgeArticle = require("../models/knowledgeArticle");

// 1. Submit article feedback
exports.createFeedback = async (req, res) => {
  try {
    const { articleId, ticketId, rating, isHelpful, comments, submittedBy } =
      req.body;

    // Check whether article exists
    const article = await KnowledgeArticle.findOne({ articleId });

    if (!article) {
      return res.status(404).json({
        message: "Knowledge article not found",
      });
    }

    // Create feedback
    const feedback = new ArticleFeedback({
      articleId,
      ticketId,
      rating,
      isHelpful,
      comments,
      submittedBy,
    });

    await feedback.save();

    return res.status(201).json({
      message: "Article feedback submitted successfully",
      feedback,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to submit article feedback",
      error: error.message,
    });
  }
};

// 2. Get all feedback
exports.getAllFeedback = async (req, res) => {
  try {
    const feedback = await ArticleFeedback.find().sort({
      createdAt: -1,
    });

    return res.status(200).json({
      count: feedback.length,
      feedback,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to retrieve feedback",
      error: error.message,
    });
  }
};

// 3. Get feedback by article ID
exports.getFeedbackByArticleId = async (req, res) => {
  try {
    const feedback = await ArticleFeedback.find({
      articleId: req.params.articleId,
    }).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      articleId: req.params.articleId,
      count: feedback.length,
      feedback,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to retrieve article feedback",
      error: error.message,
    });
  }
};

// 4. Get feedback by ticket ID
exports.getFeedbackByTicketId = async (req, res) => {
  try {
    const ticketId = Number(req.params.ticketId);

    const feedback = await ArticleFeedback.find({
      ticketId,
    }).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      ticketId,
      count: feedback.length,
      feedback,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to retrieve ticket feedback",
      error: error.message,
    });
  }
};

// 5. Delete feedback
exports.deleteFeedback = async (req, res) => {
  try {
    const feedback = await ArticleFeedback.findByIdAndDelete(
      req.params.feedbackId,
    );

    if (!feedback) {
      return res.status(404).json({
        message: "Article feedback not found",
      });
    }

    return res.status(200).json({
      message: "Article feedback deleted successfully",
      feedbackId: feedback._id,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to delete article feedback",
      error: error.message,
    });
  }
};
