const mongoose = require("mongoose");

const knowledgeArticleSchema = new mongoose.Schema(
  {
    articleId: {
      type: String,
      unique: true,
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    problemDescription: {
      type: String,
      required: true,
      trim: true,
    },

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "KnowledgeCategory",
      required: true,
    },

    troubleshootingSteps: {
      type: [String],
      required: true,
    },

    solution: {
      type: String,
      required: true,
      trim: true,
    },

    applicableProduct: {
      type: String,
      trim: true,
    },

    status: {
      type: String,
      enum: ["Draft", "Approved", "Published", "Retired"],
      default: "Draft",
    },

    createdBy: {
      type: String,
      required: true,
    },

    updatedBy: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("KnowledgeArticle", knowledgeArticleSchema);
