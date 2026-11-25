const mongoose = require("mongoose");

const resolutionSchema = new mongoose.Schema(
  {
    resolutionId: {
      type: String,
      unique: true,
    },

    ticketId: {
      type: Number,
      required: true,
    },

    generatedResolution: {
      type: String,
      default: null,
    },

    troubleshootingSteps: {
      type: [String],
      default: [],
    },

    agentResponse: {
      type: String,
      default: null,
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
      ],
      default: "Generated",
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

    resolvedBy: {
      type: String,
      default: null,
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

resolutionSchema.pre("validate", async function () {
  if (!this.resolutionId) {
    const lastResolution = await mongoose
      .model("Resolution")
      .findOne({}, { resolutionId: 1 })
      .sort({ createdAt: -1 });

    const lastNumber = lastResolution
      ? parseInt(lastResolution.resolutionId.replace("RES-", ""), 10)
      : 1000;

    this.resolutionId = `RES-${lastNumber + 1}`;
  }
});

module.exports = mongoose.model("Resolution", resolutionSchema);
