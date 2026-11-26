const mongoose = require("mongoose");

// Stores the exact knowledge article version used by the AI.
const retrievedArticleVersionSchema = new mongoose.Schema(
  {
    articleId: {
      type: String,
      required: true,
    },

    versionNumber: {
      type: Number,
      required: true,
      min: 1,
    },
  },
  {
    _id: false,
  },
);

const supportRequestSchema = new mongoose.Schema(
  {
    ticketId: {
      type: Number,
      unique: true,
      required: true,
    },

    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },

    subject: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    category: {
      type: String,
      enum: [
        "Account",
        "Billing",
        "Fraud",
        "General Inquiry",
        "Technical",
        "Needs agent review",
      ],
      default: "Needs agent review",
    },

    modelCategory: {
      type: String,
      enum: [
        "Account",
        "Billing",
        "Fraud",
        "General Inquiry",
        "Technical",
        null,
      ],
      default: null,
    },

    confidence: {
      type: Number,
      min: 0,
      max: 1,
      default: 0,
    },

    categoryProbabilities: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({}),
    },

    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Critical"],
      default: "Medium",
    },

    status: {
      type: String,
      enum: ["Open", "In Progress", "Resolved", "Closed"],
      default: "Open",
    },

    channel: {
      type: String,
      enum: ["Web", "Email", "Phone"],
      default: "Web",
    },

    // AI-generated resolution
    resolution: {
      generatedResolution: {
        type: String,
        default: null,
      },

      troubleshootingSteps: {
        type: [String],
        default: [],
      },

      resolutionStatus: {
        type: String,
        enum: [
          "Generated",
          "NeedsClarification",
          "Escalated",
          "In Progress",
          "Resolved",
          "Rejected",
          null,
        ],
        default: null,
      },

      requiresAgent: {
        type: Boolean,
        default: false,
      },

      escalationReason: {
        type: String,
        default: null,
      },

      retrievedArticleIds: {
        type: [String],
        default: [],
      },

      // Exact article versions used for resolution generation.
      retrievedArticleVersions: {
        type: [retrievedArticleVersionSchema],
        default: [],
      },

      generatedAt: {
        type: Date,
        default: null,
      },
    },
  },
  {
    timestamps: true,
  },
);

module.exports =
  mongoose.models.SupportRequest ||
  mongoose.model("SupportRequest", supportRequestSchema);
