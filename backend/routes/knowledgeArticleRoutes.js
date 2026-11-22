const express = require("express");

const router = express.Router();

const {
  createKnowledgeArticle,
  getKnowledgeArticles,
  getKnowledgeArticleById,
  updateKnowledgeArticle,
  approveKnowledgeArticle,
  publishKnowledgeArticle,
  retireKnowledgeArticle,
} = require("../controllers/knowledgeArticleController");

// Create Knowledge Article
router.post("/", createKnowledgeArticle);

// Get All Knowledge Articles
router.get("/", getKnowledgeArticles);

// Get Knowledge Article By Article ID
router.get("/:articleId", getKnowledgeArticleById);

// Update Knowledge Article
router.patch("/:articleId", updateKnowledgeArticle);

// Approve Knowledge Article
router.patch("/:articleId/approve", approveKnowledgeArticle);

// Publish Knowledge Article
router.patch("/:articleId/publish", publishKnowledgeArticle);

// Retire Knowledge Article
router.patch("/:articleId/retire", retireKnowledgeArticle);

module.exports = router;
