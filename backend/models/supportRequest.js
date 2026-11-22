const mongoose = require("mongoose");

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

    // ML classification fields
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
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("SupportRequest", supportRequestSchema);
