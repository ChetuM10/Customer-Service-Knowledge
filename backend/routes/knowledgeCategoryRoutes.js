const express = require("express");
const router = express.Router();

const {
  createKnowledgeCategory,
  getKnowledgeCategories,
  getKnowledgeCategoryById,
  updateKnowledgeCategory,
  deleteKnowledgeCategory,
} = require("../controllers/knowledgeCategoryController");

// Create category
router.post("/", createKnowledgeCategory);

// Get all categories
router.get("/", getKnowledgeCategories);

// Get category by custom category ID
router.get("/:categoryId", getKnowledgeCategoryById);

// Update category
router.put("/:categoryId", updateKnowledgeCategory);

// Deactivate category
router.delete("/:categoryId", deleteKnowledgeCategory);

module.exports = router;
