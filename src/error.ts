export default class SQLiteHelperError extends Error {
    constructor(message: string, errorName = "SQLiteHelperError") {
        super();

        this.name = errorName;
        this.message = message;
    }
}