class ApmMetadataError extends Error {
    constructor(message, metadata, options) {
        super(message, options);
        this.metadata = metadata;
    }
}

module.exports = {
    ApmMetadataError,
};
