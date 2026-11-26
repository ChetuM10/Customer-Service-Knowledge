const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    auditId: {
      type: String,
      unique: true,
    },

    action: {
      type: String,
      required: true,
      enum: [
        "Created",
        "Updated",
        "Deleted",
        "Classified",
        "Resolution Generated",
        "Status Changed",
        "Article Published",
        "Article Retired",
        "Feedback Submitted",
        "Knowledge Gap Created",
      ],
    },

    entityType: {
      type: String,
      required: true,
      enum: [
        "Customer",
        "SupportRequest",
        "KnowledgeCategory",
        "KnowledgeArticle",
        "Resolution",
        "ArticleFeedback",
        "KnowledgeGap",
      ],
    },

    entityId: {
      type: String,
      required: true,
    },

    ticketId: {
      type: Number,
      default: null,
    },

    performedBy: {
      type: String,
      default: "System",
    },

    description: {
      type: String,
      required: true,
    },

    previousData: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    newData: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// Generate custom Audit ID
auditLogSchema.pre("validate", async function () {
  if (!this.auditId) {
    const lastAudit = await mongoose
      .model("AuditLog")
      .findOne({ auditId: { $ne: null } })
      .sort({ createdAt: -1 });

    const lastNumber = lastAudit
      ? parseInt(lastAudit.auditId.split("-")[1], 10)
      : 1000;

    this.auditId = `AUD-${lastNumber + 1}`;
  }
});

module.exports =
  mongoose.models.AuditLog || mongoose.model("AuditLog", auditLogSchema);
