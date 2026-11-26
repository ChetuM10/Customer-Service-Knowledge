const KnowledgeArticle = require("../models/knowledgeArticle");
const KnowledgeCategory = require("../models/knowledgeCategory");
const Counter = require("../models/counter");
const KnowledgeArticleVersion = require("../models/knowledgeArticleVersion");
const { createAuditLog } = require("../services/auditService");

// Reusable audit logging function
const recordAudit = async (auditData) => {
  try {
    await createAuditLog(auditData);
  } catch (error) {
    console.error("Knowledge Article audit recording failed:", error.message);
  }
};

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

    // Check whether category exists and is active
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

    // Create initial article version
    try {
      await KnowledgeArticleVersion.create({
        articleId: article.articleId,
        versionNumber: 1,
        title: article.title,
        problemDescription: article.problemDescription,
        category: article.category,
        troubleshootingSteps: article.troubleshootingSteps,
        solution: article.solution,
        applicableProduct: article.applicableProduct,
        status: article.status,
        isActive: true,
        modifiedBy: createdBy,
        changeDescription: "Initial article creation",
      });
    } catch (versionError) {
      await KnowledgeArticle.findByIdAndDelete(article._id);
      throw versionError;
    }

    // Record article creation in audit history
    await recordAudit({
      action: "Created",
      entityType: "KnowledgeArticle",
      entityId: article.articleId,
      performedBy: createdBy || "System",
      description: `Knowledge article ${article.articleId} created`,
      newData: {
        articleId: article.articleId,
        title: article.title,
        category: article.category,
        status: article.status,
        currentVersion: article.currentVersion,
      },
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

// 4. Update Knowledge Article and Create New Version
const updateKnowledgeArticle = async (req, res) => {
  const session = await KnowledgeArticle.db.startSession();

  try {
    session.startTransaction();

    const { articleId } = req.params;

    const {
      title,
      problemDescription,
      category,
      troubleshootingSteps,
      solution,
      applicableProduct,
      updatedBy,
      changeDescription,
    } = req.body;

    // Find existing article
    const existingArticle = await KnowledgeArticle.findOne({
      articleId,
    }).session(session);

    if (!existingArticle) {
      await session.abortTransaction();

      return res.status(404).json({
        message: "Knowledge article not found",
      });
    }

    // Capture previous article data for audit history
    const previousData = existingArticle.toObject();

    // Validate updated category
    if (category !== undefined) {
      const existingCategory =
        await KnowledgeCategory.findById(category).session(session);

      if (!existingCategory || !existingCategory.isActive) {
        await session.abortTransaction();

        return res.status(400).json({
          message: "Invalid or inactive knowledge category",
        });
      }
    }

    // Validate updatedBy
    if (!updatedBy || !updatedBy.trim()) {
      await session.abortTransaction();

      return res.status(400).json({
        message: "updatedBy is required",
      });
    }

    // Prepare fields to update
    const updateData = {};

    if (title !== undefined) updateData.title = title;

    if (problemDescription !== undefined) {
      updateData.problemDescription = problemDescription;
    }

    if (category !== undefined) updateData.category = category;

    if (troubleshootingSteps !== undefined) {
      updateData.troubleshootingSteps = troubleshootingSteps;
    }

    if (solution !== undefined) updateData.solution = solution;

    if (applicableProduct !== undefined) {
      updateData.applicableProduct = applicableProduct;
    }

    // Published articles must go through approval again after editing
    if (existingArticle.status === "Published") {
      updateData.status = "Draft";
    }

    if (Object.keys(updateData).length === 0) {
      await session.abortTransaction();

      return res.status(400).json({
        message: "No article fields provided for update",
      });
    }

    // Generate next version number
    const newVersionNumber = existingArticle.currentVersion + 1;

    // Update existing article
    const updatedArticle = await KnowledgeArticle.findOneAndUpdate(
      { articleId },
      {
        $set: {
          ...updateData,
          updatedBy,
        },
        $inc: {
          currentVersion: 1,
        },
      },
      {
        new: true,
        runValidators: true,
        session,
      },
    );

    if (!updatedArticle) {
      await session.abortTransaction();

      return res.status(400).json({
        message: "Article update failed",
      });
    }

    // Deactivate previous active version
    // The previous version retains its original status
    await KnowledgeArticleVersion.updateMany(
      {
        articleId,
        isActive: true,
      },
      {
        $set: {
          isActive: false,
        },
      },
      { session },
    );

    // Create new article version
    await KnowledgeArticleVersion.create(
      [
        {
          articleId: updatedArticle.articleId,
          versionNumber: newVersionNumber,
          title: updatedArticle.title,
          problemDescription: updatedArticle.problemDescription,
          category: updatedArticle.category,
          troubleshootingSteps: updatedArticle.troubleshootingSteps,
          solution: updatedArticle.solution,
          applicableProduct: updatedArticle.applicableProduct,
          status: updatedArticle.status,
          isActive: true,
          modifiedBy: updatedBy,
          changeDescription: changeDescription || "Article updated",
        },
      ],
      { session },
    );

    // Commit transaction
    await session.commitTransaction();

    // Record article update in audit history
    await recordAudit({
      action: "Updated",
      entityType: "KnowledgeArticle",
      entityId: updatedArticle.articleId,
      performedBy: updatedBy,
      description: `Knowledge article ${articleId} updated to version ${newVersionNumber}`,
      previousData: {
        title: previousData.title,
        problemDescription: previousData.problemDescription,
        category: previousData.category,
        troubleshootingSteps: previousData.troubleshootingSteps,
        solution: previousData.solution,
        applicableProduct: previousData.applicableProduct,
        status: previousData.status,
        currentVersion: previousData.currentVersion,
      },
      newData: {
        title: updatedArticle.title,
        problemDescription: updatedArticle.problemDescription,
        category: updatedArticle.category,
        troubleshootingSteps: updatedArticle.troubleshootingSteps,
        solution: updatedArticle.solution,
        applicableProduct: updatedArticle.applicableProduct,
        status: updatedArticle.status,
        currentVersion: updatedArticle.currentVersion,
      },
    });

    await updatedArticle.populate("category", "categoryId categoryName");

    return res.status(200).json({
      message: "Knowledge article updated and new version created successfully",
      article: updatedArticle,
      versionNumber: newVersionNumber,
    });
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }

    return res.status(500).json({
      message: "Error updating knowledge article",
      error: error.message,
    });
  } finally {
    await session.endSession();
  }
};

// 5. Reusable Knowledge Article Status Update Function
const updateKnowledgeArticleStatus = async (
  req,
  res,
  currentStatus,
  newStatus,
  action,
) => {
  const session = await KnowledgeArticle.db.startSession();

  try {
    session.startTransaction();

    const { articleId } = req.params;
    const { updatedBy } = req.body || {};

    // Validate updatedBy
    if (typeof updatedBy !== "string" || !updatedBy.trim()) {
      await session.abortTransaction();

      return res.status(400).json({
        message: "updatedBy is required",
      });
    }

    // Find article
    const article = await KnowledgeArticle.findOne({
      articleId,
    }).session(session);

    if (!article) {
      await session.abortTransaction();

      return res.status(404).json({
        message: "Knowledge article not found",
      });
    }

    // Validate current status
    if (article.status !== currentStatus) {
      await session.abortTransaction();

      return res.status(400).json({
        message: `Cannot ${action} article with status ${article.status}`,
      });
    }

    // Capture previous article status for audit history
    const previousData = {
      articleId: article.articleId,
      status: article.status,
      currentVersion: article.currentVersion,
    };

    // Update main article
    const updatedArticle = await KnowledgeArticle.findOneAndUpdate(
      {
        articleId,
        status: currentStatus,
      },
      {
        $set: {
          status: newStatus,
          updatedBy: updatedBy.trim(),
        },
      },
      {
        new: true,
        runValidators: true,
        session,
      },
    );

    if (!updatedArticle) {
      await session.abortTransaction();

      return res.status(400).json({
        message: "Article status changed. Please try again.",
      });
    }

    // Update corresponding active article version
    const versionUpdate = await KnowledgeArticleVersion.updateOne(
      {
        articleId,
        versionNumber: article.currentVersion,
        isActive: true,
      },
      {
        $set: {
          status: newStatus,
        },
      },
      { session },
    );

    if (versionUpdate.matchedCount !== 1) {
      throw new Error("Active article version not found");
    }

    // Commit transaction
    await session.commitTransaction();

    // Determine the appropriate audit action
    let auditAction = "Status Changed";

    if (newStatus === "Published") {
      auditAction = "Article Published";
    } else if (newStatus === "Retired") {
      auditAction = "Article Retired";
    }

    // Record article status change in audit history
    await recordAudit({
      action: auditAction,
      entityType: "KnowledgeArticle",
      entityId: updatedArticle.articleId,
      performedBy: updatedBy.trim(),
      description: `Knowledge article ${articleId} status changed from ${currentStatus} to ${newStatus}`,
      previousData,
      newData: {
        articleId: updatedArticle.articleId,
        status: updatedArticle.status,
        currentVersion: updatedArticle.currentVersion,
      },
    });

    await updatedArticle.populate("category", "categoryId categoryName");

    return res.status(200).json({
      message: `Knowledge article ${action} successfully`,
      article: updatedArticle,
    });
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }

    return res.status(500).json({
      message: `Error ${action} knowledge article`,
      error: error.message,
    });
  } finally {
    await session.endSession();
  }
};

// 6. Approve Knowledge Article
const approveKnowledgeArticle = async (req, res) => {
  return updateKnowledgeArticleStatus(req, res, "Draft", "Approved", "approve");
};

// 7. Publish Knowledge Article
const publishKnowledgeArticle = async (req, res) => {
  return updateKnowledgeArticleStatus(
    req,
    res,
    "Approved",
    "Published",
    "publish",
  );
};

// 8. Retire Knowledge Article
const retireKnowledgeArticle = async (req, res) => {
  return updateKnowledgeArticleStatus(
    req,
    res,
    "Published",
    "Retired",
    "retire",
  );
};

// 9. Get Knowledge Article Version History
const getKnowledgeArticleVersions = async (req, res) => {
  try {
    const { articleId } = req.params;

    const article = await KnowledgeArticle.findOne({ articleId });

    if (!article) {
      return res.status(404).json({
        message: "Knowledge article not found",
      });
    }

    const versions = await KnowledgeArticleVersion.find({
      articleId,
    })
      .populate("category", "categoryId categoryName")
      .sort({ versionNumber: 1 });

    return res.status(200).json({
      articleId,
      totalVersions: versions.length,
      versions,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error retrieving article versions",
      error: error.message,
    });
  }
};

// 10. Get a Specific Knowledge Article Version
const getSpecificArticleVersion = async (req, res) => {
  try {
    const { articleId, versionNumber } = req.params;

    const parsedVersionNumber = Number(versionNumber);

    if (!Number.isInteger(parsedVersionNumber) || parsedVersionNumber < 1) {
      return res.status(400).json({
        message: "Invalid version number",
      });
    }

    const version = await KnowledgeArticleVersion.findOne({
      articleId,
      versionNumber: parsedVersionNumber,
    }).populate("category", "categoryId categoryName");

    if (!version) {
      return res.status(404).json({
        message: "Knowledge article version not found",
      });
    }

    return res.status(200).json({
      articleId,
      version,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error retrieving knowledge article version",
      error: error.message,
    });
  }
};

// Export Controller Functions
module.exports = {
  createKnowledgeArticle,
  getKnowledgeArticles,
  getKnowledgeArticleById,
  updateKnowledgeArticle,
  approveKnowledgeArticle,
  publishKnowledgeArticle,
  retireKnowledgeArticle,
  getKnowledgeArticleVersions,
  getSpecificArticleVersion,
};
