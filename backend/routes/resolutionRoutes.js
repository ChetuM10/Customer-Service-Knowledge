const express = require("express");
const router = express.Router();

const {
  createResolution,
  getAllResolutions,
  getResolutionByTicketId,
  updateResolution,
} = require("../controllers/resolutionController");

// Create resolution from an existing generated ticket resolution
router.post("/:ticketId", createResolution);

// Get all resolutions
router.get("/", getAllResolutions);

// Get resolution by ticket ID
router.get("/ticket/:ticketId", getResolutionByTicketId);

// Update resolution using resolution ID
router.put("/:resolutionId", updateResolution);

module.exports = router;
