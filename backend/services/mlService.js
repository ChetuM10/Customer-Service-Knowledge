const axios = require("axios");

const ML_SERVICE_URL = "http://127.0.0.1:5001";

const classifyIssue = async (subject, description) => {
  try {
    const response = await axios.post(`${ML_SERVICE_URL}/predict`, {
      subject,
      description,
    });

    return response.data;
  } catch (error) {
    console.error("ML Service Error:", error.response?.data || error.message);

    throw new Error("Unable to classify support request");
  }
};

module.exports = { classifyIssue };
