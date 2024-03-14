const apm = require("elastic-apm-node");

const apmAgent = apm.start({
    serverUrl: process.env.APM_SERVER_URL,
    serviceName: process.env.APP_NAME,
    active: process.env.ENABLE_APM === "true",
    secretToken: process.env.APM_SECRET,
});

async function withSpan(spanName, spanType, func, args) {
    let result, error;
    let span = apmAgent.startSpan(spanName, spanType);
    try {
        result = await func(...args);
    } catch (e) {
        error = e;
    }
    span.end();
    if (error) throw error;
    return result;
}

module.exports = {
    apmAgent,
    withSpan,
};