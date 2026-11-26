const express = require("express");
const router = express.Router();

const {
  getAllAuditLogs,
  getAuditLogById,
  getAuditLogsByTicket,
  getAuditLogsByEntity,
} = require("../controllers/auditLogController");

// Get all audit logs
router.get("/", getAllAuditLogs);

// Get audit history by ticket ID
router.get("/ticket/:ticketId", getAuditLogsByTicket);

// Get audit history by entity type
router.get("/entity/:entityType", getAuditLogsByEntity);

// Get audit log by Audit ID
router.get("/:auditId", getAuditLogById);

module.exports = router;
