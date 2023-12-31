require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const { runMuonApp } = require("./utils");
global.MuonAppUtils = require("./muonapp-utils");

const PORT = process.env.SERVER_PORT || 3000;
const router = express();

// Middleware
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: true }));

// Enable CORS
router.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  next();
});

// Define routes
router.get("/", (req, res) => {
  res.json({ message: "Muon Schnorr Signer" });
});

router.use("/v1/", async (req, res) => {
  try {
    const mixed = {
      ...req.query,
      ...req.body,
    };
    const { app, method, params = {} } = mixed;
    const requestData = { app, method, params };

    const result = await runMuonApp(requestData);
    if (!result) {
      throw new Error("Running the Moun app failed.");
    }
    return res.json({ success: true, result });
  } catch (error) {
    return errorHandler(res, error);
  }
});

// Error handler function
const errorHandler = (res, error) => {
  console.error("error: ", error);
  res.status(400).json({
    success: false,
    error: {
      message: error.message,
    },
  });
};

// Start the server and set up periodic request status updates
router.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}.`);
});
