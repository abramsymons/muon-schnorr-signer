class MuonAppError extends Error {
    constructor(message, data, options) {
        super(message, options);
        this.data = data;
    }
}

module.exports = {
    MuonAppError,
};
