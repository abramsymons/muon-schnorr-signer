require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const { runMuonApp } = require("./utils");
global.MuonAppUtils = require("./muonapp-utils");

const { apmAgent } = MuonAppUtils;

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
    let trans;
    let response;
    try {
        const mixed = {
            ...req.query,
            ...req.body,
        };
        const { app, method, params = {} } = mixed;
        const requestData = { app, method, params };

        trans = apmAgent.startTransaction(method, `${app}-muon-app`);
        apmAgent.addLabels(params);
        const result = await runMuonApp(requestData);
        if (!result) {
            throw new Error("Running the Moun app failed.");
        }
        apmAgent.addLabels(result.data.result);
        response = res.json({ success: true, result });
    } catch (error) {
        apmAgent.captureError(error, { custom: error.data });
        if (trans) {
            trans.result = "failure";
        }
        response = errorHandler(res, error);
    }
    if (trans) trans.end();
    return response;
});

// Error handler function
const errorHandler = (res, error) => {
    console.error("error: ", error);
    response = {
        success: false,
        error: {
            message: error.message,
            data: error.data,
        },
    };
    res.status(400).json(response);
};

// Start the server and set up periodic request status updates
router.listen(PORT, async () => {
    console.log(`Server is running on port ${PORT}.`);
});
