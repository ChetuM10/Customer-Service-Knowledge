const express = require("express");
const router = express.Router();

const { getDashboardAnalytics } = require("../controllers/analyticsController");

// Get complete knowledge platform analytics
router.get("/dashboard", getDashboardAnalytics);

module.exports = router;
