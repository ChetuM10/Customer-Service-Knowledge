const express = require("express");
const cors = require("cors");
require("dotenv").config();

const connectDB = require("./config/db");
const customerRoutes = require("./routes/customerRoutes");
const supportRequestRoutes = require("./routes/supportRequestRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Customer Service Platform Backend is Running!");
});

// Customer routes
app.use("/api/customers", customerRoutes);

// Support Request routes
app.use("/api/support-requests", supportRequestRoutes);

const startServer = async () => {
  await connectDB();

  app.listen(process.env.PORT, () => {
    console.log(`Server running on port ${process.env.PORT}`);
  });
};

startServer();
