const Database = require('better-sqlite3');
const fs = require('fs');
const { resolve } = require('path');
const SQLiteError = require('./error');

const { stringify, parse } = JSON;
/**
 * A tool to make interactions with sqlite databases easier
 */
class SQLite {
    /**
    * @param {object} [options = {}] Options for SQLite.
    * @param {boolean} [options.caching = true] Toggle whether to enable caching.
    * @param {boolean} [options.fetchAll = false] Whether to fetch all rows of the sqlite database on initialization.
    * Note: This option cannot be set to `true` if `options.caching` is `false`.
    * @param {string} [options.dir = ./data] The directory where the sqlite file is/will be located.
    * @param {string} [options.filename = sqlite.db] The name of the file where the sqlite database is/should be saved.
    * @param {string} [options.tableName = database] The name of the table which SQLite should use.
    * Note: You cannot work with multiple tables in one SQLite, you should create a separate SQLite for that.
    * @param {object} [options.columns = []] The columns that should be created on the table if it doesn't exist.
    * @param {boolean} [options.wal = false] Whether to enable wal mode. (Read more about that [here](https://www.sqlite.org/wal.html))
    * @example
    * const db = new SQLite({
    *   tableName: "foods",
    *   columns: {
    *       name: "text",
    *       price: "int"
    *   },
    *   wal: true
    * });
    */
    constructor(options) {

        options = options || {};

        options.dir = options.dir || './data';
        if (!fs.existsSync(options.dir)) // Check whether the provided folder exists and create it if it doesn't
            fs.mkdirSync(options.dir);

        options.filename = options.filename || 'sqlite.db';
        const path = resolve(process.cwd(), `${options.dir}/${options.filename}`);

        Object.defineProperties(this, {
            db: {
                value: new Database(path)
            },
            name: {
                value: options.tableName || "database"
            }
        });

        options.columns = options.columns || {};

        let columnsStatement = Object.keys(options.columns).map(columnName => {
            return `${columnName} ${options.columns[columnName].type}`;
        });

        options.wal = options.wal === undefined ? true : !!options.wal;

        if (options.wal)
            this.db.pragma('journal_mode = wal');

        const table = this.db.prepare("SELECT count(*) FROM sqlite_master WHERE type = 'table' AND name = ?").get(this.name);

        if (!table['count(*)']) {
            if (!columnsStatement.length)
                throw new SQLiteError(`No columns were provided and the "${this.name}" table doesn't exist. Columns are required to ensure at table creation.`);

            this.db.prepare(`CREATE TABLE ${this.name} (${columnsStatement.join(', ')})`).run();
        }


        options.caching = options.caching === undefined ? true : !!options.caching;

        if (options.caching)
            Object.defineProperty(this, "cache", {
                value: []
            });

        options.fetchAll = options.fetchAll === undefined ? true : !!options.fetchAll;

        if (options.fetchAll) {
            if (!options.caching) {
                const err = new SQLiteError("The fetchAll options was enabled but caching was not. \
It's impossible to fetch all values and save them to the cache if the cache doesn't exist. \
Either disable fetchAll or enable caching.");
                throw err;
            }
            const allRows = this.db.prepare(`SELECT * FROM ${this.name}`).all();
            for (const row of allRows) {
                this.cache.push(row);
            }
        }


        Object.defineProperty(this, "options", {
            value: options
        });
    }

    /**
     * @param {string} columnName The name of the column to search by.
     * @param {*} columnValue The value of the column to search by.
     * @returns {*} The value retreived from the table.
     */
    get(columnName, columnValue) {
        let dbValue;
        let cacheValue = {};

        if (this.options.caching) { // Check if the row exists in the cache
            for (let i = 0; i < this.cache.length; i++) {
                const row = this.cache[i];
                if (row[columnName] === columnValue) {
                    cacheValue.result = row;
                    cacheValue.index = i;
                    break;
                }
            }

            if (cacheValue.result)
                dbValue = cacheValue.result;
        }
        if (!dbValue)
            dbValue = this.db.prepare(`SELECT * FROM ${this.name} WHERE ${columnName} = ?`).get(columnValue);

        for (let key in dbValue) {
            try {
                dbValue[key] = parse(dbValue[key]);
            } catch {

            }
        }

        // Save the value to the cache, or update the existing one
        if (dbValue && this.options.caching) {
            if (!cacheValue.result)
                this.cache.push(dbValue);
            else if (cacheValue.result !== dbValue)
                this.cache[cacheValue.index] = dbValue;
        }


        return dbValue;
    }

    /**
     * @returns {object} All rows of the table.
     */
    getAll() {
        const values = this.db.prepare(`SELECT * FROM ${this.name}`).all();

        for (let i = 0; i < values.length; i++) {
            const value = values[i];
            for (let key in value) {
                try {
                    value[key] = parse(value[key]);
                } catch {

                }
            }
        }

        return values;
    }

    /**
     * @param {array|object} options
     * @param {object} [options.where] Column parameters which should be used to search rows by. If not provided, a new row will be inserted.
     * @param {object} options.columns Columns to insert/modify.
     * @returns {object|boolean} The new column values of the row or `false` if no rows were modified. 
     * NOTE: If caching is not enabled, only changed column values will be returned.
     * @example
     * sqlite.set({
     *     where: {
     *         first_name: 'Josh',
     *         last_name: 'Smith'
     *     },
     *     columns: {
     *         last_name: 'Jonas'
     *     }
     * })
    */
    set(rows) {
        if (!rows || (rows.constructor !== Object && rows.constructor !== Array)) {
            const err =
                new SQLiteError("No rows were provided or their type was invalid. To set a single row, an object should be given, or an array if multiple rows should be set.");
            throw err;
        }

        // If only a single row was given, convert it to an array for easier handling
        if (rows.constructor === Object)
            rows = [rows];

        const values = [];
        const queries = [];

        for (let row of rows) {
            row = row || {};
            if (!row.columns) {
                const columns = row;
                row = {
                    columns: columns
                };
            }

            const query = this._createQuery(row);
            queries.push(query);
        }

        this._set(queries);


        for (const row of rows) {

            let oldCacheValue;
            if (this.options.caching && row.where) {
                // Remove the old value from the cache 
                // (only after writing the new value to the database, so that if writing the new value fails, the old cache value will not be removed)
                for (let i = 0; i < this.cache.length; i++) {
                    const value = this.cache[i];

                    for (const key in row.where) {
                        if (value[key] === row.where[key]) {
                            oldCacheValue = value;
                            this.cache.splice(i, 1);
                            break;
                        }
                    }
                }
            }

            let valuesObject = oldCacheValue || {};

            for (const key in row.columns) {
                valuesObject[key] = row.columns[key];
            }
            for (let key in valuesObject) {
                try {
                    valuesObject[key] = JSON.parse(valuesObject[key]);
                } catch { }
            }

            if (this.options.caching) {
                this.cache.push(valuesObject);
            }

            if (typeof this.changedCB === 'function') {
                this.changedCB(valuesObject);
            }
            values.push(valuesObject);
        }

        let returnValue = values; // By default, the returned value will be the array of values.
        if (returnValue.length === 1) // If the array only has one value, only return its first element.
            returnValue = returnValue[0];


        return returnValue;

    }

    /**
     * @param {string} columnName The name of the column to search by.
     * @param {*} columnValue The value of the column to search by.
     * @returns {boolean} Whether a row with the provided column name and value exists.
     */
    has(columnName, columnValue) {
        return !!this.get(columnName, columnValue);
    }

    /**
     * Ensures that a value exists in the table
     * @param {string} columnName Name of the column to search by.
     * @param {*} columnValue Value of the column to search by.
     * @param {object} ensureValue Value of the columns to be ensured if the row does not exist.
     * @returns {*} Ensured value
     */
    ensure(columnName, columnValue, ensureValue) {
        let value = this.get(columnName, columnValue);

        if (!value)
            value = this.set({
                columns: ensureValue
            });

        return value;
    }

    /**
     * Deletes a single or multiple rows from the table.
     * @param {string} columnName Name of the column to search by.
     * @param {*} columnValue Value of the column to search by.
     * @returns {number} Number of rows that were deleted.
     */
    delete(columnName, columnValue) {
        const info = this.db.prepare(`DELETE FROM ${this.name} WHERE ${columnName} = ?`).run(columnValue);
        if (this.options.caching) {
            const columnObject = {};
            columnObject[columnName] = columnValue;
            for (let i = 0; i < this.cache.length; i++) {
                const value = this.cache[i];

                if (stringify(value) === stringify(columnObject)) {
                    this.cache.splice(i, 1);
                }
            }
        }
        return info.changes;
    }

    /**
     * Removes a single value (or all values if no arguments are provided) from the cache.
     * @param {string} [columnName] Name of the column to search by.
     * @param {*} [columnValue] Value of the column to search by.
     * @returns {boolean} Whether the deletion was successful.
     */
    uncache(columnName, columnValue) {
        if (!this.options.cache)
            return false;
        if (columnName !== undefined && columnValue !== undefined) {
            // Remove the value from the cache
            for (let i = 0; i < this.cache.length; i++) {
                const value = this.cache[i];
                const columnObject = {};
                columnObject[columnName] = columnValue;
                if (stringify(value) === stringify(columnObject)) {
                    this.cache.splice(i, 1);
                    return true;
                }
            }
            // If the value was not found, return false as the deletion was not successful
            return false;
        }

        else {
            this.cache.length = [];
            return !this.cache.length;
        }
    }

    indexes(columnName) {
        const dbValue = this.db.prepare(`SELECT ${columnName} FROM ${this.name}`).all();

        return dbValue.map(row => row[columnName]);
    }

    changed(cb) {
        this.changedCB = cb;
    }

    _createQuery(row) {
        let columnNames = Object.keys(row.columns);
        let values = [];
        if (!row.columns || row.columns.constructor !== Object)
            throw new SQLiteError(`No columns were provided. They are required to modify/create a row.`)
        let columnsStatement;
        let whereValues = [];

        let query;
        if (row.where) {
            columnsStatement = columnNames.map(columnName => {
                let value = row.columns[columnName];
                if (value.constructor === Object || value.constructor === Array)
                    value = stringify(value);
                values.push(value);
                return `${columnName} = ?`;
            }).join(', ');
            let whereStatement = "WHERE " + Object.keys(row.where).map(whereCheck => {
                whereValues.push(row.where[whereCheck]);
                return `${whereCheck} = ?`;
            }).join(' AND');
            query = `UPDATE ${this.name} SET ${columnsStatement} ${whereStatement}`;
        }
        else {
            let columnNamesString = columnNames.join(', ');
            values = columnNames.map(columnName => {
                let value = row.columns[columnName];
                if (value.constructor === Object || value.constructor === Array)
                    value = stringify(value);
                return value;
            });
            const questionMarks = Array(values.length).fill('?');
            query = `INSERT INTO ${this.name} (${columnNamesString}) VALUES (${questionMarks.join(', ')})`;
        }

        return {
            query: query,
            values: values,
            whereValues: whereValues
        };
    }

    _set(rows) {
        const infos = [];
        const transaction = this.db.transaction(() => {
            for (let row of rows) {
                const { query, values, whereValues } = row;
                const stmt = this.db.prepare(query);
                const info = stmt.run(values, whereValues);
                infos.push(info);
            }
        });
        transaction();

        return infos;
    }
}

module.exports = SQLite;