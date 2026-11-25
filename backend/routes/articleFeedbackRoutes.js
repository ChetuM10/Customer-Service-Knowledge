const express = require("express");
const router = express.Router();

const {
  createFeedback,
  getAllFeedback,
  getFeedbackByArticleId,
  getFeedbackByTicketId,
  deleteFeedback,
} = require("../controllers/articleFeedbackController");

// Submit feedback
router.post("/", createFeedback);

// Get all feedback
router.get("/", getAllFeedback);

// Get feedback by article ID
router.get("/article/:articleId", getFeedbackByArticleId);

// Get feedback by ticket ID
router.get("/ticket/:ticketId", getFeedbackByTicketId);

// Delete feedback
router.delete("/:feedbackId", deleteFeedback);

module.exports = router;
