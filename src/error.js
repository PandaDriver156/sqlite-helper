class SQLiteHelperError extends Error {
    constructor(message, errorName = "SQLiteHelperError") {
        super();

        this.name = errorName;
        this.message = message;
    }
}

module.exports = SQLiteHelperError;