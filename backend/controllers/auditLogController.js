const AuditLog = require("../models/AuditLog");

// Get all audit logs
const getAllAuditLogs = async (req, res) => {
  try {
    const auditLogs = await AuditLog.find().sort({ createdAt: -1 });

    return res.status(200).json({
      message: "Audit history retrieved successfully",
      count: auditLogs.length,
      auditLogs,
    });
  } catch (error) {
    console.error("Get Audit Logs Error:", error.message);

    return res.status(500).json({
      message: "Failed to retrieve audit history",
      error: error.message,
    });
  }
};

// Get audit log by Audit ID
const getAuditLogById = async (req, res) => {
  try {
    const { auditId } = req.params;

    const auditLog = await AuditLog.findOne({ auditId });

    if (!auditLog) {
      return res.status(404).json({
        message: "Audit log not found",
      });
    }

    return res.status(200).json({
      message: "Audit log retrieved successfully",
      auditLog,
    });
  } catch (error) {
    console.error("Get Audit Log Error:", error.message);

    return res.status(500).json({
      message: "Failed to retrieve audit log",
      error: error.message,
    });
  }
};

// Get audit history for a specific ticket
const getAuditLogsByTicket = async (req, res) => {
  try {
    const ticketId = Number(req.params.ticketId);

    if (!Number.isInteger(ticketId)) {
      return res.status(400).json({
        message: "Invalid ticket ID",
      });
    }

    const auditLogs = await AuditLog.find({ ticketId }).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      message: "Ticket audit history retrieved successfully",
      ticketId,
      count: auditLogs.length,
      auditLogs,
    });
  } catch (error) {
    console.error("Get Ticket Audit History Error:", error.message);

    return res.status(500).json({
      message: "Failed to retrieve ticket audit history",
      error: error.message,
    });
  }
};

// Get audit history by entity type
const getAuditLogsByEntity = async (req, res) => {
  try {
    const { entityType } = req.params;

    const allowedEntities = [
      "Customer",
      "SupportRequest",
      "KnowledgeCategory",
      "KnowledgeArticle",
      "Resolution",
      "ArticleFeedback",
      "KnowledgeGap",
    ];

    if (!allowedEntities.includes(entityType)) {
      return res.status(400).json({
        message: "Invalid entity type",
      });
    }

    const auditLogs = await AuditLog.find({ entityType }).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      message: "Entity audit history retrieved successfully",
      entityType,
      count: auditLogs.length,
      auditLogs,
    });
  } catch (error) {
    console.error("Get Entity Audit History Error:", error.message);

    return res.status(500).json({
      message: "Failed to retrieve entity audit history",
      error: error.message,
    });
  }
};

module.exports = {
  getAllAuditLogs,
  getAuditLogById,
  getAuditLogsByTicket,
  getAuditLogsByEntity,
};
