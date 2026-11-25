const Resolution = require("../models/Resolution");
const SupportRequest = require("../models/supportRequest");

// 1. Create resolution from an existing LLM-generated ticket resolution
exports.createResolution = async (req, res) => {
  try {
    const ticketId = Number(req.params.ticketId);

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
    });

    await resolution.save();

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

    // Find resolution using custom resolution ID
    const resolution = await Resolution.findOne({
      resolutionId: req.params.resolutionId,
    });

    if (!resolution) {
      return res.status(404).json({
        message: "Resolution not found",
      });
    }

    // Allowed resolution statuses
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

    // Find related support ticket
    const supportRequest = await SupportRequest.findOne({
      ticketId: resolution.ticketId,
    });

    if (!supportRequest) {
      return res.status(404).json({
        message: "Related support ticket not found",
      });
    }

    // Update agent response
    if (agentResponse !== undefined) {
      resolution.agentResponse = agentResponse;
    }

    // Update resolution status
    if (resolutionStatus) {
      resolution.resolutionStatus = resolutionStatus;
    }

    // Update agent information
    if (resolvedBy !== undefined) {
      resolution.resolvedBy = resolvedBy;
    }

    // Handle resolved status
    if (resolutionStatus === "Resolved") {
      resolution.resolvedAt = new Date();
      resolution.requiresAgent = false;
    }

    // Handle statuses requiring agent intervention
    if (
      resolutionStatus === "In Progress" ||
      resolutionStatus === "Escalated"
    ) {
      resolution.requiresAgent = true;
      resolution.resolvedAt = null;
    }

    // Save Resolution document
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

    // Save SupportRequest document
    await supportRequest.save();

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
