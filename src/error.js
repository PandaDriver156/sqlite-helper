class SQLiteError extends Error {
    constructor(message, errorName = "SQLiteError") {
        super();

        this.name = errorName;
        this.message = message;
    }
}

module.exports = SQLiteError;