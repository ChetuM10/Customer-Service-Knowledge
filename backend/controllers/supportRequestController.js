const SupportRequest = require("../models/supportRequest");
const Customer = require("../models/customer");
const Counter = require("../models/counter");
const { classifyIssue } = require("../services/mlService");

// Create a support ticket with automatic ML classification
const createSupportRequest = async (req, res) => {
  try {
    const { customerId, subject, description, priority, channel } = req.body;

    // Check required fields
    if (!customerId || !subject || !description) {
      return res.status(400).json({
        message: "Customer ID, subject and description are required",
      });
    }

    // Validate customer ID
    if (!Number.isInteger(Number(customerId)) || Number(customerId) <= 0) {
      return res.status(400).json({
        message: "Invalid customer ID",
      });
    }

    // Find customer using custom customer ID
    const customer = await Customer.findOne({
      customerId: Number(customerId),
    });

    if (!customer) {
      return res.status(404).json({
        message: "Customer not found",
      });
    }

    // Generate unique ticket ID
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

    // Default classification if ML service is unavailable
    let classification = {
      category: "Needs agent review",
      modelCategory: null,
      confidence: 0,
      categoryProbabilities: {},
    };

    // Call Python Flask ML service
    try {
      const mlResult = await classifyIssue(subject, description);

      if (
        mlResult.status === "success" &&
        typeof mlResult.confidence === "number" &&
        mlResult.confidence >= 0 &&
        mlResult.confidence <= 1 &&
        typeof mlResult.model_category === "string" &&
        typeof mlResult.predicted_category === "string"
      ) {
        classification = {
          category: mlResult.predicted_category,
          modelCategory: mlResult.model_category,
          confidence: mlResult.confidence,
          categoryProbabilities: mlResult.category_probabilities || {},
        };
      } else {
        console.error("Invalid ML response. Manual review required.");
      }
    } catch (mlError) {
      console.error("ML classification failed:", mlError.message);
    }

    // Create support ticket with classification results
    const supportRequest = await SupportRequest.create({
      ticketId: counter.seq,
      customer: customer._id,
      subject,
      description,
      priority,
      channel,
      ...classification,
    });

    return res.status(201).json({
      message: "Support ticket created successfully",
      classificationStatus:
        classification.modelCategory === null
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
      ticketId: ticketId,
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

    // Only allow specific fields to be updated
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

    const supportRequest = await SupportRequest.findOneAndUpdate(
      { ticketId: ticketId },
      updateData,
      {
        returnDocument: "after",
        runValidators: true,
      },
    ).populate("customer", "customerId fullName email");

    if (!supportRequest) {
      return res.status(404).json({
        message: "Support ticket not found",
      });
    }

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
      ticketId: ticketId,
    });

    if (!supportRequest) {
      return res.status(404).json({
        message: "Support ticket not found",
      });
    }

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

module.exports = {
  createSupportRequest,
  getSupportRequests,
  getSupportRequestById,
  updateSupportRequest,
  deleteSupportRequest,
};
