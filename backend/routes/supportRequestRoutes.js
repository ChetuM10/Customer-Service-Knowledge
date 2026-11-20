const express = require("express");

const router = express.Router();

const {
  createSupportRequest,
  getSupportRequests,
  getSupportRequestById,
  updateSupportRequest,
  deleteSupportRequest,
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

module.exports = router;
