const Resolution = require("../models/Resolution");
const SupportRequest = require("../models/supportRequest");
const { createAuditLog } = require("../services/auditService");

// Helper to record audit logs without interrupting the main operation
const recordAudit = async (auditData) => {
  try {
    await createAuditLog(auditData);
  } catch (error) {
    console.error("Resolution audit recording failed:", error.message);
  }
};

// 1. Create resolution from an existing LLM-generated ticket resolution
exports.createResolution = async (req, res) => {
  try {
    const ticketId = Number(req.params.ticketId);

    if (!Number.isInteger(ticketId) || ticketId <= 0) {
      return res.status(400).json({
        message: "Invalid ticket ID",
      });
    }

    const supportRequest = await SupportRequest.findOne({ ticketId });

    if (!supportRequest) {
      return res.status(404).json({
        message: "Support ticket not found",
      });
    }

    if (
      !supportRequest.resolution ||
      !supportRequest.resolution.generatedResolution
    ) {
      return res.status(400).json({
        message: "No generated resolution found for this ticket",
      });
    }

    const existingResolution = await Resolution.findOne({ ticketId });

    if (existingResolution) {
      return res.status(200).json({
        message: "Resolution already exists for this ticket",
        resolution: existingResolution,
      });
    }

    const resolution = new Resolution({
      ticketId,
      generatedResolution: supportRequest.resolution.generatedResolution,
      troubleshootingSteps: supportRequest.resolution.troubleshootingSteps,
      resolutionStatus: supportRequest.resolution.resolutionStatus,
      requiresAgent: supportRequest.resolution.requiresAgent,
      escalationReason: supportRequest.resolution.escalationReason,
      retrievedArticleIds: supportRequest.resolution.retrievedArticleIds,

      // Copy exact article versions used by the LLM
      retrievedArticleVersions:
        supportRequest.resolution.retrievedArticleVersions || [],
    });

    await resolution.save();

    await recordAudit({
      action: "Created",
      entityType: "Resolution",
      entityId: resolution.resolutionId,
      ticketId,
      description: `Resolution ${resolution.resolutionId} created for ticket ${ticketId}`,
      newData: {
        resolutionId: resolution.resolutionId,
        resolutionStatus: resolution.resolutionStatus,
        requiresAgent: resolution.requiresAgent,
        retrievedArticleIds: resolution.retrievedArticleIds,
        retrievedArticleVersions: resolution.retrievedArticleVersions,
      },
    });

    return res.status(201).json({
      message: "Resolution created successfully",
      resolution,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to create resolution",
      error: error.message,
    });
  }
};

// 2. Get all resolutions
exports.getAllResolutions = async (req, res) => {
  try {
    const resolutions = await Resolution.find().sort({
      createdAt: -1,
    });

    return res.status(200).json({
      count: resolutions.length,
      resolutions,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to retrieve resolutions",
      error: error.message,
    });
  }
};

// 3. Get resolution using ticket ID
exports.getResolutionByTicketId = async (req, res) => {
  try {
    const ticketId = Number(req.params.ticketId);

    if (!Number.isInteger(ticketId) || ticketId <= 0) {
      return res.status(400).json({
        message: "Invalid ticket ID",
      });
    }

    const resolution = await Resolution.findOne({ ticketId });

    if (!resolution) {
      return res.status(404).json({
        message: "Resolution not found for this ticket",
      });
    }

    return res.status(200).json({
      resolution,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to retrieve resolution",
      error: error.message,
    });
  }
};

// 4. Update resolution and synchronize support ticket status
exports.updateResolution = async (req, res) => {
  try {
    const { agentResponse, resolutionStatus, resolvedBy } = req.body;

    const resolution = await Resolution.findOne({
      resolutionId: req.params.resolutionId,
    });

    if (!resolution) {
      return res.status(404).json({
        message: "Resolution not found",
      });
    }

    const allowedStatuses = [
      "Generated",
      "NeedsClarification",
      "Escalated",
      "In Progress",
      "Resolved",
      "Rejected",
    ];

    if (resolutionStatus && !allowedStatuses.includes(resolutionStatus)) {
      return res.status(400).json({
        message: "Invalid resolution status",
        allowedStatuses,
      });
    }

    const supportRequest = await SupportRequest.findOne({
      ticketId: resolution.ticketId,
    });

    if (!supportRequest) {
      return res.status(404).json({
        message: "Related support ticket not found",
      });
    }

    const previousData = {
      agentResponse: resolution.agentResponse,
      resolutionStatus: resolution.resolutionStatus,
      resolvedBy: resolution.resolvedBy,
      requiresAgent: resolution.requiresAgent,
      resolvedAt: resolution.resolvedAt,
      supportTicketStatus: supportRequest.status,
    };

    const previousStatus = resolution.resolutionStatus;

    if (agentResponse !== undefined) {
      resolution.agentResponse = agentResponse;
    }

    if (resolutionStatus) {
      resolution.resolutionStatus = resolutionStatus;
    }

    if (resolvedBy !== undefined) {
      resolution.resolvedBy = resolvedBy;
    }

    if (resolutionStatus === "Resolved") {
      resolution.resolvedAt = new Date();
      resolution.requiresAgent = false;
    }

    if (
      resolutionStatus === "In Progress" ||
      resolutionStatus === "Escalated"
    ) {
      resolution.requiresAgent = true;
      resolution.resolvedAt = null;
    }

    await resolution.save();

    // Synchronize embedded resolution details
    supportRequest.resolution.resolutionStatus = resolution.resolutionStatus;
    supportRequest.resolution.requiresAgent = resolution.requiresAgent;

    // Synchronize overall support ticket status
    if (resolutionStatus === "In Progress") {
      supportRequest.status = "In Progress";
    }

    if (resolutionStatus === "Resolved") {
      supportRequest.status = "Resolved";
    }

    if (resolutionStatus === "Rejected") {
      supportRequest.status = "Open";
    }

    await supportRequest.save();

    const newData = {
      agentResponse: resolution.agentResponse,
      resolutionStatus: resolution.resolutionStatus,
      resolvedBy: resolution.resolvedBy,
      requiresAgent: resolution.requiresAgent,
      resolvedAt: resolution.resolvedAt,
      supportTicketStatus: supportRequest.status,
    };

    const statusChanged = previousStatus !== resolution.resolutionStatus;

    await recordAudit({
      action: statusChanged ? "Status Changed" : "Updated",
      entityType: "Resolution",
      entityId: resolution.resolutionId,
      ticketId: resolution.ticketId,
      description: statusChanged
        ? `Resolution ${resolution.resolutionId} status changed from ${previousStatus} to ${resolution.resolutionStatus}`
        : `Resolution ${resolution.resolutionId} updated`,
      previousData,
      newData,
    });

    return res.status(200).json({
      message: "Resolution updated successfully",
      resolution,
      supportTicketStatus: supportRequest.status,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to update resolution",
      error: error.message,
    });
  }
};
