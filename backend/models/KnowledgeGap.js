const mongoose = require("mongoose");

const knowledgeGapSchema = new mongoose.Schema(
  {
    gapId: {
      type: String,
      unique: true,
    },

    ticketId: {
      type: Number,
      required: true,
    },

    issueDescription: {
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
      required: true,
    },

    reason: {
      type: String,
      required: true,
      trim: true,
    },

    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Critical"],
      default: "Medium",
    },

    status: {
      type: String,
      enum: ["Open", "Under Review", "Article Required", "Resolved", "Closed"],
      default: "Open",
    },

    identifiedAt: {
      type: Date,
      default: Date.now,
    },

    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// Generate unique Knowledge Gap ID
knowledgeGapSchema.pre("validate", async function () {
  if (this.gapId) {
    return;
  }

  const lastGap = await mongoose
    .model("KnowledgeGap")
    .findOne({ gapId: { $exists: true } })
    .sort({ createdAt: -1 });

  if (!lastGap || !lastGap.gapId) {
    this.gapId = "GAP-1001";
  } else {
    const lastNumber = parseInt(lastGap.gapId.split("-")[1], 10);

    this.gapId = `GAP-${lastNumber + 1}`;
  }
});

module.exports =
  mongoose.models.KnowledgeGap ||
  mongoose.model("KnowledgeGap", knowledgeGapSchema);
