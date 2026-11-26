const express = require("express");

const router = express.Router();

const {
  createSupportRequest,
  getSupportRequests,
  getSupportRequestById,
  updateSupportRequest,
  deleteSupportRequest,
  generateTicketResolution,
} = require("../controllers/supportRequestController");

// Create support ticket
router.post("/", createSupportRequest);

// Get all support tickets
router.get("/", getSupportRequests);

// Get ticket by ticket ID
router.get("/:ticketId", getSupportRequestById);

// Update support ticket
router.put("/:ticketId", updateSupportRequest);

// Delete support ticket
router.delete("/:ticketId", deleteSupportRequest);

// Generate AI resolution for a support ticket
router.post("/:ticketId/generate-resolution", generateTicketResolution);

module.exports = router;
