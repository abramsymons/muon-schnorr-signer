const apm = require("elastic-apm-node");

const apmAgent = apm.start({
    serverUrl: process.env.SYMMIO_APM_SERVER_URL,
    serviceName: process.env.SYMMIO_APP_NAME,
    active: process.env.SYMMIO_ENABLED_APM === "True",
    secretToken: process.env.SYMMIO_APM_SECRET_TOKEN,
});

async function withSpan(spanName, spanType, func, args) {
    let result, error;
    let span = apmAgent.startSpan(spanName, spanType);
    try {
        result = await func(...args);
    } catch (e) {
        error = e;
    }
    if (span) span.end();
    if (error) throw error;
    return result;
}

module.exports = {
    apmAgent,
    withSpan,
};
