const express = require("express");
const router = express.Router();

const {
  createKnowledgeGap,
  getAllKnowledgeGaps,
  getKnowledgeGapById,
  updateKnowledgeGap,
  deleteKnowledgeGap,
} = require("../controllers/knowledgeGapController");

// Create knowledge gap
router.post("/", createKnowledgeGap);

// Get all knowledge gaps
router.get("/", getAllKnowledgeGaps);

// Get knowledge gap by ID
router.get("/:gapId", getKnowledgeGapById);

// Update knowledge gap
router.put("/:gapId", updateKnowledgeGap);

// Delete knowledge gap
router.delete("/:gapId", deleteKnowledgeGap);

module.exports = router;
