const express = require("express");
const cors = require("cors");
require("dotenv").config();

const connectDB = require("./config/db");

const customerRoutes = require("./routes/customerRoutes");
const supportRequestRoutes = require("./routes/supportRequestRoutes");
const knowledgeCategoryRoutes = require("./routes/knowledgeCategoryRoutes");
const knowledgeArticleRoutes = require("./routes/knowledgeArticleRoutes");

const resolutionRoutes = require("./routes/resolutionRoutes");

const articleFeedbackRoutes = require("./routes/articleFeedbackRoutes");

const knowledgeGapRoutes = require("./routes/knowledgeGapRoutes");

const app = express();

app.use(cors());
app.use(express.json());

// Home route
app.get("/", (req, res) => {
  res.send("Customer Service Platform Backend is Running!");
});

// API routes
app.use("/api/customers", customerRoutes);
app.use("/api/support-requests", supportRequestRoutes);
app.use("/api/knowledge-categories", knowledgeCategoryRoutes);
app.use("/api/knowledge-articles", knowledgeArticleRoutes);
app.use("/api/resolutions", resolutionRoutes);
app.use("/api/article-feedback", articleFeedbackRoutes);
app.use("/api/knowledge-gaps", knowledgeGapRoutes);

const startServer = async () => {
  await connectDB();

  app.listen(process.env.PORT, () => {
    console.log(`Server running on port ${process.env.PORT}`);
  });
};

startServer();
