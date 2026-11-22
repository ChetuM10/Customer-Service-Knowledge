const KnowledgeArticle = require("../models/knowledgeArticle");
const KnowledgeCategory = require("../models/knowledgeCategory");
const Counter = require("../models/counter");

// 1. Create Knowledge Article
const createKnowledgeArticle = async (req, res) => {
  try {
    const {
      title,
      problemDescription,
      category,
      troubleshootingSteps,
      solution,
      applicableProduct,
      createdBy,
    } = req.body;

    // Check whether category exists
    const existingCategory = await KnowledgeCategory.findById(category);

    if (!existingCategory || !existingCategory.isActive) {
      return res.status(400).json({
        message: "Invalid or inactive knowledge category",
      });
    }

    // Generate Article ID
    const counter = await Counter.findByIdAndUpdate(
      "articleId",
      { $inc: { seq: 1 } },
      { returnDocument: "after" },
    );

    if (!counter) {
      return res.status(500).json({
        message: "Article ID counter not found",
      });
    }

    const articleId = `ART${counter.seq}`;

    // Create article
    const article = await KnowledgeArticle.create({
      articleId,
      title,
      problemDescription,
      category,
      troubleshootingSteps,
      solution,
      applicableProduct,
      createdBy,
    });

    return res.status(201).json({
      message: "Knowledge article created successfully",
      article,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error creating knowledge article",
      error: error.message,
    });
  }
};

// 2. Get All Knowledge Articles
const getKnowledgeArticles = async (req, res) => {
  try {
    const articles = await KnowledgeArticle.find()
      .populate("category", "categoryId categoryName")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      count: articles.length,
      articles,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error retrieving knowledge articles",
      error: error.message,
    });
  }
};

// 3. Get Knowledge Article By Article ID
const getKnowledgeArticleById = async (req, res) => {
  try {
    const { articleId } = req.params;

    const article = await KnowledgeArticle.findOne({ articleId }).populate(
      "category",
      "categoryId categoryName",
    );

    if (!article) {
      return res.status(404).json({
        message: "Knowledge article not found",
      });
    }

    return res.status(200).json({
      article,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error retrieving knowledge article",
      error: error.message,
    });
  }
};

const updateKnowledgeArticle = async (req, res) => {
  try {
    const { articleId } = req.params;

    const {
      title,
      problemDescription,
      category,
      troubleshootingSteps,
      solution,
      applicableProduct,
      updatedBy,
    } = req.body;

    // Find the existing article
    const existingArticle = await KnowledgeArticle.findOne({ articleId });

    if (!existingArticle) {
      return res.status(404).json({
        message: "Knowledge article not found",
      });
    }

    // Validate category if it is being updated
    if (category !== undefined) {
      const existingCategory = await KnowledgeCategory.findById(category);

      if (!existingCategory || !existingCategory.isActive) {
        return res.status(400).json({
          message: "Invalid or inactive knowledge category",
        });
      }
    }

    // Prepare fields to update
    const updateData = {};

    if (title !== undefined) updateData.title = title;
    if (problemDescription !== undefined)
      updateData.problemDescription = problemDescription;
    if (category !== undefined) updateData.category = category;
    if (troubleshootingSteps !== undefined)
      updateData.troubleshootingSteps = troubleshootingSteps;
    if (solution !== undefined) updateData.solution = solution;
    if (applicableProduct !== undefined)
      updateData.applicableProduct = applicableProduct;
    if (updatedBy !== undefined) updateData.updatedBy = updatedBy;

    // Update article
    const updatedArticle = await KnowledgeArticle.findOneAndUpdate(
      { articleId },
      { $set: updateData },
      {
        new: true,
        runValidators: true,
      },
    ).populate("category", "categoryId categoryName");

    return res.status(200).json({
      message: "Knowledge article updated successfully",
      article: updatedArticle,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error updating knowledge article",
      error: error.message,
    });
  }
};

const approveKnowledgeArticle = async (req, res) => {
  try {
    const { articleId } = req.params;
    const { updatedBy } = req.body;

    // Find article
    const article = await KnowledgeArticle.findOne({ articleId });

    if (!article) {
      return res.status(404).json({
        message: "Knowledge article not found",
      });
    }

    // Check current status
    if (article.status !== "Draft") {
      return res.status(400).json({
        message: `Cannot approve article with status ${article.status}`,
      });
    }

    // Update status
    const updatedArticle = await KnowledgeArticle.findOneAndUpdate(
      { articleId, status: "Draft" },
      {
        $set: {
          status: "Approved",
          updatedBy,
        },
      },
      {
        returnDocument: "after",
        runValidators: true,
      },
    ).populate("category", "categoryId categoryName");

    if (!updatedArticle) {
      return res.status(400).json({
        message: "Article status changed. Please try again.",
      });
    }

    return res.status(200).json({
      message: "Knowledge article approved successfully",
      article: updatedArticle,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error approving knowledge article",
      error: error.message,
    });
  }
};

const publishKnowledgeArticle = async (req, res) => {
  try {
    const { articleId } = req.params;
    const { updatedBy } = req.body;

    // Find article
    const article = await KnowledgeArticle.findOne({ articleId });

    if (!article) {
      return res.status(404).json({
        message: "Knowledge article not found",
      });
    }

    // Only Approved articles can be published
    if (article.status !== "Approved") {
      return res.status(400).json({
        message: `Cannot publish article with status ${article.status}`,
      });
    }

    // Update article status
    const publishedArticle = await KnowledgeArticle.findOneAndUpdate(
      { articleId, status: "Approved" },
      {
        $set: {
          status: "Published",
          updatedBy,
        },
      },
      {
        returnDocument: "after",
        runValidators: true,
      },
    ).populate("category", "categoryId categoryName");

    if (!publishedArticle) {
      return res.status(400).json({
        message: "Article status changed. Please try again.",
      });
    }

    return res.status(200).json({
      message: "Knowledge article published successfully",
      article: publishedArticle,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error publishing knowledge article",
      error: error.message,
    });
  }
};

const retireKnowledgeArticle = async (req, res) => {
  try {
    const { articleId } = req.params;
    const { updatedBy } = req.body;

    // Find article
    const article = await KnowledgeArticle.findOne({ articleId });

    if (!article) {
      return res.status(404).json({
        message: "Knowledge article not found",
      });
    }

    // Only Published articles can be retired
    if (article.status !== "Published") {
      return res.status(400).json({
        message: `Cannot retire article with status ${article.status}`,
      });
    }

    // Update article status
    const retiredArticle = await KnowledgeArticle.findOneAndUpdate(
      { articleId, status: "Published" },
      {
        $set: {
          status: "Retired",
          updatedBy,
        },
      },
      {
        returnDocument: "after",
        runValidators: true,
      },
    ).populate("category", "categoryId categoryName");

    if (!retiredArticle) {
      return res.status(400).json({
        message: "Article status changed. Please try again.",
      });
    }

    return res.status(200).json({
      message: "Knowledge article retired successfully",
      article: retiredArticle,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error retiring knowledge article",
      error: error.message,
    });
  }
};

module.exports = {
  createKnowledgeArticle,
  getKnowledgeArticles,
  getKnowledgeArticleById,
  updateKnowledgeArticle,
  approveKnowledgeArticle,
  publishKnowledgeArticle,
  retireKnowledgeArticle,
};
