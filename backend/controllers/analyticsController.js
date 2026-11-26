const SupportRequest = require("../models/supportRequest");
const KnowledgeArticle = require("../models/knowledgeArticle");
const KnowledgeGap = require("../models/KnowledgeGap");
const ArticleFeedback = require("../models/ArticleFeedback");
const Resolution = require("../models/Resolution");

// Get complete knowledge platform analytics
const getDashboardAnalytics = async (req, res) => {
  try {
    const [
      totalTickets,
      ticketsByCategory,
      ticketsByPriority,
      ticketsByStatus,
      ticketsRequiringAgent,
      resolvedTickets,
      unresolvedTickets,
      totalArticles,
      articlesByStatus,
      articles,
      totalKnowledgeGaps,
      gapsByStatus,
      gapsByCategory,
      gapsByPriority,
      totalFeedback,
      feedbackStats,
      feedbackByArticle,
      totalResolutions,
      resolutionsByStatus,
      resolutionsRequiringAgent,
      resolvedResolutionTimes,
    ] = await Promise.all([
      // Support ticket analytics
      SupportRequest.countDocuments(),

      SupportRequest.aggregate([
        { $group: { _id: "$category", count: { $sum: 1 } } },
      ]),

      SupportRequest.aggregate([
        { $group: { _id: "$priority", count: { $sum: 1 } } },
      ]),

      SupportRequest.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),

      SupportRequest.countDocuments({
        "resolution.requiresAgent": true,
      }),

      // Resolved and closed tickets
      SupportRequest.countDocuments({
        status: { $in: ["Resolved", "Closed"] },
      }),

      // Open and in-progress tickets
      SupportRequest.countDocuments({
        status: { $in: ["Open", "In Progress"] },
      }),

      // Knowledge article analytics
      KnowledgeArticle.countDocuments(),

      KnowledgeArticle.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),

      KnowledgeArticle.find()
        .populate("category", "categoryName")
        .select("articleId title category status currentVersion")
        .lean(),

      // Knowledge gap analytics
      KnowledgeGap.countDocuments(),

      KnowledgeGap.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),

      KnowledgeGap.aggregate([
        { $group: { _id: "$category", count: { $sum: 1 } } },
      ]),

      KnowledgeGap.aggregate([
        { $group: { _id: "$priority", count: { $sum: 1 } } },
      ]),

      // Article feedback analytics
      ArticleFeedback.countDocuments(),

      ArticleFeedback.aggregate([
        {
          $group: {
            _id: null,
            averageRating: { $avg: "$rating" },
            helpfulCount: {
              $sum: { $cond: ["$isHelpful", 1, 0] },
            },
            notHelpfulCount: {
              $sum: { $cond: ["$isHelpful", 0, 1] },
            },
          },
        },
      ]),

      ArticleFeedback.aggregate([
        {
          $group: {
            _id: "$articleId",
            totalFeedback: { $sum: 1 },
            averageRating: { $avg: "$rating" },
            helpfulCount: {
              $sum: { $cond: ["$isHelpful", 1, 0] },
            },
            notHelpfulCount: {
              $sum: { $cond: ["$isHelpful", 0, 1] },
            },
          },
        },
        { $sort: { totalFeedback: -1 } },
      ]),

      // Separate resolution analytics
      Resolution.countDocuments(),

      Resolution.aggregate([
        { $group: { _id: "$resolutionStatus", count: { $sum: 1 } } },
      ]),

      Resolution.countDocuments({
        requiresAgent: true,
      }),

      // Resolution time in hours for resolved records
      Resolution.aggregate([
        {
          $match: {
            resolutionStatus: "Resolved",
            createdAt: { $exists: true },
            resolvedAt: { $ne: null },
          },
        },
        {
          $project: {
            resolutionTimeHours: {
              $divide: [
                { $subtract: ["$resolvedAt", "$createdAt"] },
                1000 * 60 * 60,
              ],
            },
          },
        },
        {
          $group: {
            _id: null,
            averageResolutionTimeHours: {
              $avg: "$resolutionTimeHours",
            },
          },
        },
      ]),
    ]);

    // Group articles by category
    const articlesByCategory = {};

    articles.forEach((article) => {
      const categoryName = article.category
        ? article.category.categoryName
        : "Uncategorized";

      articlesByCategory[categoryName] =
        (articlesByCategory[categoryName] || 0) + 1;
    });

    // Feedback summary
    const feedbackSummary = feedbackStats[0] || {
      averageRating: 0,
      helpfulCount: 0,
      notHelpfulCount: 0,
    };

    // Format grouped aggregation results
    const formatStats = (data) => {
      const result = {};

      data.forEach((item) => {
        result[item._id || "Unspecified"] = item.count;
      });

      return result;
    };

    // Resolution performance calculations
    const resolutionRate =
      totalTickets === 0
        ? 0
        : Number(((resolvedTickets / totalTickets) * 100).toFixed(2));

    const averageResolutionTimeHours =
      resolvedResolutionTimes.length > 0
        ? Number(
            (
              resolvedResolutionTimes[0].averageResolutionTimeHours || 0
            ).toFixed(2),
          )
        : 0;

    return res.status(200).json({
      message: "Knowledge analytics retrieved successfully",

      supportTicketAnalytics: {
        totalTickets,
        ticketsByCategory: formatStats(ticketsByCategory),
        ticketsByPriority: formatStats(ticketsByPriority),
        ticketsByStatus: formatStats(ticketsByStatus),
        ticketsRequiringAgent,
      },

      knowledgeArticleAnalytics: {
        totalArticles,
        articlesByStatus: formatStats(articlesByStatus),
        articlesByCategory,
      },

      knowledgeGapAnalytics: {
        totalKnowledgeGaps,
        gapsByStatus: formatStats(gapsByStatus),
        gapsByCategory: formatStats(gapsByCategory),
        gapsByPriority: formatStats(gapsByPriority),
      },

      articleFeedbackAnalytics: {
        totalFeedback,
        averageRating: Number((feedbackSummary.averageRating || 0).toFixed(2)),
        helpfulCount: feedbackSummary.helpfulCount,
        notHelpfulCount: feedbackSummary.notHelpfulCount,
        feedbackByArticle,
      },

      resolutionAnalytics: {
        totalResolutions,
        resolutionsByStatus: formatStats(resolutionsByStatus),
        resolutionsRequiringAgent,
      },

      resolutionPerformance: {
        totalTickets,
        resolvedTickets,
        unresolvedTickets,
        resolutionRate,
        averageResolutionTimeHours,
      },
    });
  } catch (error) {
    console.error("Dashboard Analytics Error:", error.message);

    return res.status(500).json({
      message: "Failed to retrieve knowledge analytics",
      error: error.message,
    });
  }
};

module.exports = {
  getDashboardAnalytics,
};
