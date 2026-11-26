const mongoose = require("mongoose");

const articleFeedbackSchema = new mongoose.Schema(
  {
    articleId: {
      type: String,
      required: true,
      trim: true,
    },

    ticketId: {
      type: Number,
      default: null,
    },

    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },

    isHelpful: {
      type: Boolean,
      required: true,
    },

    comments: {
      type: String,
      trim: true,
      default: "",
    },

    submittedBy: {
      type: String,
      enum: ["Customer", "Agent"],
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

module.exports =
  mongoose.models.ArticleFeedback ||
  mongoose.model("ArticleFeedback", articleFeedbackSchema);
