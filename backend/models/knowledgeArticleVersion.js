const mongoose = require("mongoose");

const knowledgeArticleVersionSchema = new mongoose.Schema(
  {
    articleId: {
      type: String,
      required: true,
    },

    versionNumber: {
      type: Number,
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
      required: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    modifiedBy: {
      type: String,
      required: true,
    },

    changeDescription: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

// Prevent duplicate versions for the same article
knowledgeArticleVersionSchema.index(
  { articleId: 1, versionNumber: 1 },
  { unique: true },
);

module.exports = mongoose.model(
  "KnowledgeArticleVersion",
  knowledgeArticleVersionSchema,
);
