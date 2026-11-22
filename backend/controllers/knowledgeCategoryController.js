const KnowledgeCategory = require("../models/knowledgeCategory");
const Counter = require("../models/counter");

// 1. Create Knowledge Category
const createKnowledgeCategory = async (req, res) => {
  try {
    const { categoryName, description } = req.body;

    // Validate required field
    if (!categoryName || !categoryName.trim()) {
      return res.status(400).json({
        message: "Category name is required",
      });
    }

    // Check whether category already exists
    const existingCategory = await KnowledgeCategory.findOne({
      categoryName: categoryName.trim(),
    });

    if (existingCategory) {
      return res.status(409).json({
        message: "Category already exists",
      });
    }

    // Generate unique category ID
    const counter = await Counter.findByIdAndUpdate(
      "categoryId",
      { $inc: { seq: 1 } },
      { returnDocument: "after" },
    );

    if (!counter) {
      return res.status(500).json({
        message: "Category ID counter is not initialized",
      });
    }

    const categoryId = `CAT-${counter.seq}`;

    // Create category
    const newCategory = await KnowledgeCategory.create({
      categoryId,
      categoryName: categoryName.trim(),
      description: description?.trim() || "",
    });

    return res.status(201).json({
      message: "Knowledge category created successfully",
      category: newCategory,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "Category already exists",
      });
    }

    return res.status(500).json({
      message: "Failed to create knowledge category",
      error: error.message,
    });
  }
};

// 2. Get All Knowledge Categories
const getKnowledgeCategories = async (req, res) => {
  try {
    const categories = await KnowledgeCategory.find().sort({
      createdAt: -1,
    });

    return res.status(200).json({
      count: categories.length,
      categories,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to retrieve knowledge categories",
      error: error.message,
    });
  }
};

// 3. Get Knowledge Category By ID
const getKnowledgeCategoryById = async (req, res) => {
  try {
    const { categoryId } = req.params;

    const category = await KnowledgeCategory.findOne({
      categoryId,
    });

    if (!category) {
      return res.status(404).json({
        message: "Knowledge category not found",
      });
    }

    return res.status(200).json({
      category,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to retrieve knowledge category",
      error: error.message,
    });
  }
};

// 4. Update Knowledge Category
const updateKnowledgeCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;

    const allowedFields = ["categoryName", "description", "isActive"];

    const updateData = {};

    // Accept only permitted fields
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    // Check whether any valid field was provided
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        message: "No valid fields provided for update",
      });
    }

    // Validate category name if provided
    if (
      updateData.categoryName !== undefined &&
      (typeof updateData.categoryName !== "string" ||
        !updateData.categoryName.trim())
    ) {
      return res.status(400).json({
        message: "Category name cannot be empty",
      });
    }

    // Trim string fields
    if (updateData.categoryName !== undefined) {
      updateData.categoryName = updateData.categoryName.trim();
    }

    if (updateData.description !== undefined) {
      if (typeof updateData.description !== "string") {
        return res.status(400).json({
          message: "Description must be a string",
        });
      }

      updateData.description = updateData.description.trim();
    }

    // Validate isActive
    if (
      updateData.isActive !== undefined &&
      typeof updateData.isActive !== "boolean"
    ) {
      return res.status(400).json({
        message: "isActive must be true or false",
      });
    }

    // Check for duplicate category name
    if (updateData.categoryName) {
      const existingCategory = await KnowledgeCategory.findOne({
        categoryName: updateData.categoryName,
        categoryId: { $ne: categoryId },
      });

      if (existingCategory) {
        return res.status(409).json({
          message: "Category name already exists",
        });
      }
    }

    const updatedCategory = await KnowledgeCategory.findOneAndUpdate(
      { categoryId },
      { $set: updateData },
      {
        returnDocument: "after",
        runValidators: true,
      },
    );

    if (!updatedCategory) {
      return res.status(404).json({
        message: "Knowledge category not found",
      });
    }

    return res.status(200).json({
      message: "Knowledge category updated successfully",
      category: updatedCategory,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "Category name already exists",
      });
    }

    return res.status(500).json({
      message: "Failed to update knowledge category",
      error: error.message,
    });
  }
};

// 5. Deactivate Knowledge Category
const deleteKnowledgeCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;

    const category = await KnowledgeCategory.findOneAndUpdate(
      { categoryId },
      { $set: { isActive: false } },
      { returnDocument: "after" },
    );

    if (!category) {
      return res.status(404).json({
        message: "Knowledge category not found",
      });
    }

    return res.status(200).json({
      message: "Knowledge category deactivated successfully",
      category,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to deactivate knowledge category",
      error: error.message,
    });
  }
};

module.exports = {
  createKnowledgeCategory,
  getKnowledgeCategories,
  getKnowledgeCategoryById,
  updateKnowledgeCategory,
  deleteKnowledgeCategory,
};
