class SQLiteError extends Error {
    constructor(message, errorName = "SQLiteHelperError") {
        super();

        this.name = errorName;
        this.message = message;
    }
}

module.exports = SQLiteError;