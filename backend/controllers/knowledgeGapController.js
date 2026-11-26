const KnowledgeGap = require("../models/KnowledgeGap");
const SupportRequest = require("../models/supportRequest");
const { createAuditLog } = require("../services/auditService");

// Helper to record audit history without interrupting the main operation
const recordAudit = async (auditData) => {
  try {
    await createAuditLog(auditData);
  } catch (error) {
    console.error("Knowledge Gap audit recording failed:", error.message);
  }
};

// 1. Create knowledge gap using an existing support ticket
exports.createKnowledgeGap = async (req, res) => {
  try {
    const { ticketId, reason, priority } = req.body;

    const supportRequest = await SupportRequest.findOne({
      ticketId: Number(ticketId),
    });

    if (!supportRequest) {
      return res.status(404).json({
        message: "Support ticket not found",
      });
    }

    // Check whether a gap already exists for this ticket
    const existingGap = await KnowledgeGap.findOne({
      ticketId: Number(ticketId),
      status: { $ne: "Closed" },
    });

    if (existingGap) {
      return res.status(409).json({
        message: "An active knowledge gap already exists for this ticket",
        knowledgeGap: existingGap,
      });
    }

    const knowledgeGap = new KnowledgeGap({
      ticketId: supportRequest.ticketId,
      issueDescription: supportRequest.description,
      category: supportRequest.category,
      reason,
      priority: priority || "Medium",
    });

    await knowledgeGap.save();

    // Record audit history
    await recordAudit({
      action: "Created",
      entityType: "KnowledgeGap",
      entityId: knowledgeGap.gapId,
      ticketId: knowledgeGap.ticketId,
      performedBy: req.body.performedBy || "System",
      description: `Knowledge gap ${knowledgeGap.gapId} created for ticket ${knowledgeGap.ticketId}`,
      newData: {
        gapId: knowledgeGap.gapId,
        ticketId: knowledgeGap.ticketId,
        issueDescription: knowledgeGap.issueDescription,
        category: knowledgeGap.category,
        reason: knowledgeGap.reason,
        priority: knowledgeGap.priority,
        status: knowledgeGap.status,
      },
    });

    return res.status(201).json({
      message: "Knowledge gap created successfully",
      knowledgeGap,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to create knowledge gap",
      error: error.message,
    });
  }
};

// 2. Get all knowledge gaps
exports.getAllKnowledgeGaps = async (req, res) => {
  try {
    const knowledgeGaps = await KnowledgeGap.find().sort({
      createdAt: -1,
    });

    return res.status(200).json({
      count: knowledgeGaps.length,
      knowledgeGaps,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to retrieve knowledge gaps",
      error: error.message,
    });
  }
};

// 3. Get knowledge gap by custom gap ID
exports.getKnowledgeGapById = async (req, res) => {
  try {
    const knowledgeGap = await KnowledgeGap.findOne({
      gapId: req.params.gapId,
    });

    if (!knowledgeGap) {
      return res.status(404).json({
        message: "Knowledge gap not found",
      });
    }

    return res.status(200).json({
      knowledgeGap,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to retrieve knowledge gap",
      error: error.message,
    });
  }
};

// 4. Update knowledge gap
exports.updateKnowledgeGap = async (req, res) => {
  try {
    const { reason, priority, status } = req.body;

    const knowledgeGap = await KnowledgeGap.findOne({
      gapId: req.params.gapId,
    });

    if (!knowledgeGap) {
      return res.status(404).json({
        message: "Knowledge gap not found",
      });
    }

    const allowedStatuses = [
      "Open",
      "Under Review",
      "Article Required",
      "Resolved",
      "Closed",
    ];

    const allowedPriorities = ["Low", "Medium", "High", "Critical"];

    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid knowledge gap status",
        allowedStatuses,
      });
    }

    if (priority && !allowedPriorities.includes(priority)) {
      return res.status(400).json({
        message: "Invalid priority",
        allowedPriorities,
      });
    }

    // Capture previous values before updating
    const previousData = {
      gapId: knowledgeGap.gapId,
      ticketId: knowledgeGap.ticketId,
      issueDescription: knowledgeGap.issueDescription,
      category: knowledgeGap.category,
      reason: knowledgeGap.reason,
      priority: knowledgeGap.priority,
      status: knowledgeGap.status,
      resolvedAt: knowledgeGap.resolvedAt,
    };

    if (reason !== undefined) {
      knowledgeGap.reason = reason;
    }

    if (priority) {
      knowledgeGap.priority = priority;
    }

    if (status) {
      knowledgeGap.status = status;

      if (status === "Resolved" || status === "Closed") {
        knowledgeGap.resolvedAt = new Date();
      } else {
        knowledgeGap.resolvedAt = null;
      }
    }

    await knowledgeGap.save();

    // Capture updated values
    const newData = {
      gapId: knowledgeGap.gapId,
      ticketId: knowledgeGap.ticketId,
      issueDescription: knowledgeGap.issueDescription,
      category: knowledgeGap.category,
      reason: knowledgeGap.reason,
      priority: knowledgeGap.priority,
      status: knowledgeGap.status,
      resolvedAt: knowledgeGap.resolvedAt,
    };

    const statusChanged = previousData.status !== newData.status;

    // Record audit history
    await recordAudit({
      action: statusChanged ? "Status Changed" : "Updated",
      entityType: "KnowledgeGap",
      entityId: knowledgeGap.gapId,
      ticketId: knowledgeGap.ticketId,
      performedBy: req.body.performedBy || "System",
      description: statusChanged
        ? `Knowledge gap ${knowledgeGap.gapId} status changed from ${previousData.status} to ${newData.status}`
        : `Knowledge gap ${knowledgeGap.gapId} updated`,
      previousData,
      newData,
    });

    return res.status(200).json({
      message: "Knowledge gap updated successfully",
      knowledgeGap,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to update knowledge gap",
      error: error.message,
    });
  }
};

// 5. Delete knowledge gap
exports.deleteKnowledgeGap = async (req, res) => {
  try {
    const knowledgeGap = await KnowledgeGap.findOne({
      gapId: req.params.gapId,
    });

    if (!knowledgeGap) {
      return res.status(404).json({
        message: "Knowledge gap not found",
      });
    }

    // Delete the knowledge gap
    await KnowledgeGap.findOneAndDelete({
      gapId: req.params.gapId,
    });

    // Record audit history
    await recordAudit({
      action: "Deleted",
      entityType: "KnowledgeGap",
      entityId: knowledgeGap.gapId,
      ticketId: knowledgeGap.ticketId,
      performedBy: req.body.performedBy || "System",
      description: `Knowledge gap ${knowledgeGap.gapId} deleted`,
      previousData: {
        gapId: knowledgeGap.gapId,
        ticketId: knowledgeGap.ticketId,
        issueDescription: knowledgeGap.issueDescription,
        category: knowledgeGap.category,
        reason: knowledgeGap.reason,
        priority: knowledgeGap.priority,
        status: knowledgeGap.status,
      },
    });

    return res.status(200).json({
      message: "Knowledge gap deleted successfully",
      gapId: knowledgeGap.gapId,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to delete knowledge gap",
      error: error.message,
    });
  }
};
