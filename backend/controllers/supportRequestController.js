const SupportRequest = require("../models/supportRequest");
const Customer = require("../models/customer");
const Counter = require("../models/counter");

const { classifyIssue } = require("../services/classificationEngine.cjs");

const KnowledgeArticleVersion = require("../models/knowledgeArticleVersion");
const KnowledgeGap = require("../models/KnowledgeGap");

const { generateResolution } = require("../services/resolutionEngine.cjs");
const { createAuditLog } = require("../services/auditService");

// Safely record audit history without interrupting the main operation
const recordAudit = async (auditData) => {
  try {
    await createAuditLog(auditData);
  } catch (error) {
    console.error("Audit recording failed:", error.message);
  }
};

// Create a support ticket with automatic Gemini classification
const createSupportRequest = async (req, res) => {
  try {
    const { customerId, subject, description, priority, channel } = req.body;

    if (!customerId || !subject || !description) {
      return res.status(400).json({
        message: "Customer ID, subject and description are required",
      });
    }

    if (!Number.isInteger(Number(customerId)) || Number(customerId) <= 0) {
      return res.status(400).json({
        message: "Invalid customer ID",
      });
    }

    const customer = await Customer.findOne({
      customerId: Number(customerId),
    });

    if (!customer) {
      return res.status(404).json({
        message: "Customer not found",
      });
    }

    const counter = await Counter.findByIdAndUpdate(
      "ticketId",
      { $inc: { seq: 1 } },
      { returnDocument: "after" },
    );

    if (!counter) {
      return res.status(500).json({
        message: "Ticket counter not configured",
      });
    }

    let classification = {
      category: "Needs agent review",
      modelCategory: null,
      confidence: 0,
      categoryProbabilities: {},
    };

    let classificationReason = null;

    try {
      const classificationResult = await classifyIssue(subject, description);

      if (
        classificationResult.status === "success" &&
        typeof classificationResult.confidence === "number" &&
        classificationResult.confidence >= 0 &&
        classificationResult.confidence <= 1 &&
        typeof classificationResult.model_category === "string" &&
        typeof classificationResult.predicted_category === "string"
      ) {
        classification = {
          category: classificationResult.predicted_category,
          modelCategory: classificationResult.model_category,
          confidence: classificationResult.confidence,
          categoryProbabilities:
            classificationResult.category_probabilities || {},
        };

        classificationReason = classificationResult.reason || null;
      } else {
        console.error("Invalid Gemini response. Manual review required.");
      }
    } catch (classificationError) {
      console.error(
        "Gemini classification failed:",
        classificationError.message,
      );
    }

    const supportRequest = await SupportRequest.create({
      ticketId: counter.seq,
      customer: customer._id,
      subject,
      description,
      priority,
      channel,
      ...classification,
    });

    await recordAudit({
      action: "Created",
      entityType: "SupportRequest",
      entityId: supportRequest.ticketId,
      ticketId: supportRequest.ticketId,
      description: `Support ticket ${supportRequest.ticketId} created`,
      newData: {
        subject: supportRequest.subject,
        description: supportRequest.description,
        category: supportRequest.category,
        priority: supportRequest.priority,
        channel: supportRequest.channel,
      },
    });

    await recordAudit({
      action: "Classified",
      entityType: "SupportRequest",
      entityId: supportRequest.ticketId,
      ticketId: supportRequest.ticketId,
      description:
        classification.category === "Needs agent review"
          ? "Gemini classification confidence was below the required threshold or classification was unavailable. Manual review required."
          : `Ticket classified as ${classification.category} by Gemini`,
      newData: {
        category: classification.category,
        modelCategory: classification.modelCategory,
        confidence: classification.confidence,
        categoryProbabilities: classification.categoryProbabilities,
        reason: classificationReason,
      },
    });

    return res.status(201).json({
      message: "Support ticket created successfully",
      classificationStatus:
        classification.category === "Needs agent review"
          ? "Manual review required"
          : "Classification completed",
      supportRequest,
    });
  } catch (error) {
    console.error("Create Support Request Error:", error.message);

    return res.status(500).json({
      message: error.message,
    });
  }
};

// Get all support tickets
const getSupportRequests = async (req, res) => {
  try {
    const supportRequests = await SupportRequest.find()
      .populate("customer", "customerId fullName email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      count: supportRequests.length,
      supportRequests,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// Get a support ticket by ticket ID
const getSupportRequestById = async (req, res) => {
  try {
    const ticketId = Number(req.params.ticketId);

    if (!Number.isInteger(ticketId) || ticketId <= 0) {
      return res.status(400).json({
        message: "Invalid ticket ID",
      });
    }

    const supportRequest = await SupportRequest.findOne({
      ticketId,
    }).populate("customer", "customerId fullName email");

    if (!supportRequest) {
      return res.status(404).json({
        message: "Support ticket not found",
      });
    }

    res.status(200).json(supportRequest);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// Update support ticket
const updateSupportRequest = async (req, res) => {
  try {
    const ticketId = Number(req.params.ticketId);

    if (!Number.isInteger(ticketId) || ticketId <= 0) {
      return res.status(400).json({
        message: "Invalid ticket ID",
      });
    }

    const allowedFields = [
      "subject",
      "description",
      "priority",
      "status",
      "channel",
    ];

    const updateData = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        message: "No valid fields provided for update",
      });
    }

    const previousRequest = await SupportRequest.findOne({ ticketId });

    if (!previousRequest) {
      return res.status(404).json({
        message: "Support ticket not found",
      });
    }

    const previousData = {
      subject: previousRequest.subject,
      description: previousRequest.description,
      priority: previousRequest.priority,
      status: previousRequest.status,
      channel: previousRequest.channel,
    };

    const supportRequest = await SupportRequest.findOneAndUpdate(
      { ticketId },
      updateData,
      {
        returnDocument: "after",
        runValidators: true,
      },
    ).populate("customer", "customerId fullName email");

    const newData = {
      subject: supportRequest.subject,
      description: supportRequest.description,
      priority: supportRequest.priority,
      status: supportRequest.status,
      channel: supportRequest.channel,
    };

    const statusChanged = previousData.status !== newData.status;

    await recordAudit({
      action: statusChanged ? "Status Changed" : "Updated",
      entityType: "SupportRequest",
      entityId: ticketId,
      ticketId,
      description: statusChanged
        ? `Ticket status changed from ${previousData.status} to ${newData.status}`
        : `Support ticket ${ticketId} updated`,
      previousData,
      newData,
    });

    res.status(200).json({
      message: "Support ticket updated successfully",
      supportRequest,
    });
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
};

// Delete support ticket
const deleteSupportRequest = async (req, res) => {
  try {
    const ticketId = Number(req.params.ticketId);

    if (!Number.isInteger(ticketId) || ticketId <= 0) {
      return res.status(400).json({
        message: "Invalid ticket ID",
      });
    }

    const supportRequest = await SupportRequest.findOneAndDelete({
      ticketId,
    });

    if (!supportRequest) {
      return res.status(404).json({
        message: "Support ticket not found",
      });
    }

    await recordAudit({
      action: "Deleted",
      entityType: "SupportRequest",
      entityId: ticketId,
      ticketId,
      description: `Support ticket ${ticketId} deleted`,
      previousData: {
        subject: supportRequest.subject,
        description: supportRequest.description,
        category: supportRequest.category,
        priority: supportRequest.priority,
        status: supportRequest.status,
      },
    });

    res.status(200).json({
      message: "Support ticket deleted successfully",
      ticketId: supportRequest.ticketId,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// Retrieve the latest Published version of every knowledge article
const getPublishedKnowledgeArticles = async () => {
  const publishedVersions = await KnowledgeArticleVersion.find({
    status: "Published",
  })
    .populate("category", "categoryName")
    .sort({
      articleId: 1,
      versionNumber: -1,
    })
    .lean();

  const latestPublishedVersions = new Map();

  for (const version of publishedVersions) {
    if (!latestPublishedVersions.has(version.articleId)) {
      latestPublishedVersions.set(version.articleId, version);
    }
  }

  return Array.from(latestPublishedVersions.values());
};

// Generate and save an AI-based resolution for a support ticket
// Automatically create a Knowledge Gap if no relevant article is retrieved
const generateTicketResolution = async (req, res) => {
  try {
    const ticketId = Number(req.params.ticketId);

    if (!Number.isInteger(ticketId) || ticketId <= 0) {
      return res.status(400).json({
        message: "Invalid ticket ID",
      });
    }

    const supportRequest = await SupportRequest.findOne({
      ticketId,
    });

    if (!supportRequest) {
      return res.status(404).json({
        message: "Support ticket not found",
      });
    }

    const previousResolution = supportRequest.resolution
      ? supportRequest.resolution.toObject
        ? supportRequest.resolution.toObject()
        : { ...supportRequest.resolution }
      : null;

    // Retrieve the latest Published version of each knowledge article
    const knowledgeArticles = await getPublishedKnowledgeArticles();

    // Generate resolution using the retrieved published versions
    const result = await generateResolution(
      supportRequest.toObject(),
      knowledgeArticles,
    );

    const retrievedArticleIds = Array.isArray(result._retrievedArticleIds)
      ? result._retrievedArticleIds
      : [];

    // Store the exact article versions used by the resolution engine
    const retrievedArticleVersions = Array.isArray(
      result._retrievedArticleVersions,
    )
      ? result._retrievedArticleVersions
          .filter(
            (item) =>
              item &&
              typeof item.articleId === "string" &&
              Number.isInteger(item.versionNumber) &&
              item.versionNumber >= 1,
          )
          .map((item) => ({
            articleId: item.articleId,
            versionNumber: item.versionNumber,
          }))
      : [];

    supportRequest.resolution = {
      generatedResolution: result.generatedResolution,
      troubleshootingSteps: result.troubleshootingSteps,
      resolutionStatus: result.resolutionStatus,
      requiresAgent: result.requiresAgent,
      escalationReason: result.escalationReason,
      retrievedArticleIds,
      retrievedArticleVersions,
      generatedAt: new Date(),
    };

    await supportRequest.save();

    await recordAudit({
      action: "Resolution Generated",
      entityType: "SupportRequest",
      entityId: ticketId,
      ticketId,
      description: `AI resolution generated for support ticket ${ticketId}`,
      previousData: previousResolution,
      newData: {
        generatedResolution: result.generatedResolution,
        troubleshootingSteps: result.troubleshootingSteps,
        resolutionStatus: result.resolutionStatus,
        requiresAgent: result.requiresAgent,
        escalationReason: result.escalationReason,
        retrievedArticleIds,
        retrievedArticleVersions,
      },
    });

    let knowledgeGap = null;

    if (retrievedArticleIds.length === 0) {
      knowledgeGap = await KnowledgeGap.findOne({
        ticketId,
        status: { $nin: ["Resolved", "Closed"] },
      });

      if (!knowledgeGap) {
        knowledgeGap = await KnowledgeGap.create({
          ticketId: supportRequest.ticketId,
          issueDescription: supportRequest.description,
          category: supportRequest.modelCategory || supportRequest.category,
          reason:
            result.escalationReason ||
            "No relevant published knowledge article was found for this issue.",
          priority: supportRequest.priority || "Medium",
        });

        await recordAudit({
          action: "Knowledge Gap Created",
          entityType: "KnowledgeGap",
          entityId: knowledgeGap.gapId,
          ticketId,
          description: `Knowledge gap ${knowledgeGap.gapId} automatically created for ticket ${ticketId}`,
          newData: {
            gapId: knowledgeGap.gapId,
            issueDescription: knowledgeGap.issueDescription,
            category: knowledgeGap.category,
            reason: knowledgeGap.reason,
            priority: knowledgeGap.priority,
            status: knowledgeGap.status,
          },
        });
      }
    }

    return res.status(200).json({
      message: "Resolution generated and saved successfully",
      ticketId: supportRequest.ticketId,
      resolution: supportRequest.resolution,
      knowledgeGap,
    });
  } catch (error) {
    console.error("Generate Resolution Error:", error.message);

    return res.status(500).json({
      message: "Failed to generate ticket resolution",
      error: error.message,
    });
  }
};

module.exports = {
  createSupportRequest,
  getSupportRequests,
  getSupportRequestById,
  updateSupportRequest,
  deleteSupportRequest,
  generateTicketResolution,
};
