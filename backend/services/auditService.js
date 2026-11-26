const AuditLog = require("../models/AuditLog");

// Reusable function to create an audit record
const createAuditLog = async ({
  action,
  entityType,
  entityId,
  ticketId = null,
  performedBy = "System",
  description,
  previousData = null,
  newData = null,
}) => {
  try {
    const auditLog = await AuditLog.create({
      action,
      entityType,
      entityId: String(entityId),
      ticketId,
      performedBy,
      description,
      previousData,
      newData,
    });

    return auditLog;
  } catch (error) {
    console.error("Audit Log Creation Error:", error.message);

    throw error;
  }
};

module.exports = {
  createAuditLog,
};
