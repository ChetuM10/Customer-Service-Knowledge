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
