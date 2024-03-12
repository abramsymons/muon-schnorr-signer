const apm = require("elastic-apm-node");

const apmAgent = apm.start({
    serverUrl: process.env.APM_SERVER_URL,
    serviceName: process.env.APP_NAME,
    active: process.env.ENABLE_APM === "true",
    secretToken: process.env.APM_SECRET,
});

module.exports = {
    apmAgent,
};
