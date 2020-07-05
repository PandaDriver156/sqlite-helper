import * as Database from 'better-sqlite3';
import { PathLike, existsSync, mkdirSync } from 'fs'
import { resolve } from 'path';
import SQLiteHelperError from './error';

const { stringify, parse } = JSON;

interface LooseObject {
    [key: string]: any
}

interface ConstructorOptions {
    tableName?: string,
    dir?: PathLike,
    filename?: string,
    columns?: LooseObject,
    caching?: boolean,
    fetchAll?: boolean
    wal?: boolean
}

/**
 * A tool to make interactions with sqlite databases easier
 */
class SQLiteHelper {

    public readonly db: any;
    public readonly name: string;
    public readonly cache: LooseObject[] = [];
    private changedCB: (...args: any) => any = () => { };

    public tableName: string;
    public dir: PathLike;
    public filename: string;
    public columns: LooseObject;
    public caching: boolean;
    public fetchAll: boolean;
    public wal: boolean;

    /**
    * @param {object} [options = {}] Options for SQLite.
    * @param {string} [options.tableName = database] Name of the table which SQLite should use.
    * @param {string} [options.dir = ./data] Directory where the sqlite file is/will be located.
    * @param {string} [options.filename = sqlite.db] Name of the file where the sqlite database is/should be saved.
    * Note: You cannot work with multiple tables in one SQLite, you should create a separate SQLite for that.
    * @param {object} [options.columns = {}] Columns that should be created on the table if it doesn't exist.
    * @param {boolean} [options.caching = true] Toggle whether to enable caching.
    * @param {boolean} [options.fetchAll = false] Whether to fetch all rows of the sqlite database on initialization.
    * Note: This option cannot be set to `true` if `options.caching` is `true`.
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
    constructor(options: ConstructorOptions) {

        this.tableName = options.tableName || "";
        this.dir = options.dir || "./data";
        this.filename = options.filename || "sqlite.db";
        this.columns = options.columns || {};
        this.caching = options.caching || true;
        this.fetchAll = options.fetchAll || false;
        this.wal = options.wal || false;

        if (!existsSync(this.dir)) // Check whether the provided folder exists
            mkdirSync(this.dir);   // Create it if it doesn't

        const path = resolve(process.cwd(), `${this.dir}/${this.filename}`);

        this.db = new Database(path)
        this.name = options.tableName || "database";

        if (this.wal)
            this.db.pragma('journal_mode = wal');

        const table = this.db.prepare("SELECT count(*) FROM sqlite_master WHERE type = 'table' AND name = ?").get(this.name);

        if (!table['count(*)']) {
            if (!Object.keys(this.columns).length)
                throw new SQLiteHelperError(`No columns were provided and the "${this.name}" table doesn't exist. Columns are required to ensure at table creation.`);

            const columnsStatement = Object.keys(this.columns).map(columnName => {
                return `${columnName} ${this.columns[columnName]}`;
            });

            this.db.prepare(`CREATE TABLE ${this.name} (${columnsStatement.join(', ')})`).run();
        }

        if (this.fetchAll) {
            if (!this.caching) {
                const err = new SQLiteHelperError("The fetchAll options was enabled but caching was not. \
It's impossible to fetch all values and save them to the cache if the cache doesn't exist. \
Either disable fetchAll or enable caching.");
                throw err;
            }

            const allRows = this.getAll();
            for (const row of allRows) {
                this.cache.push(row);
            }
        }
    }

    /**
     * @param {string} columnName Name of the column to search by.
     * @param {*} columnValue Value of the column to search by.
     * @returns {*} Value retreived from the table.
     */
    get(columnName: string, columnValue: any) {
        let dbValue;
        const cacheValue: LooseObject = {};

        if (this.caching) { // Check if the row exists in the cache
            for (let i = 0; i < this.cache.length; i++) {
                const row = this.cache[i];
                if (row[columnName] == columnValue) {
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

        dbValue = this._parseKeys(dbValue);

        // Save the value to the cache, or update the existing one
        if (dbValue && this.caching) {
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

        for (let i = 0; i < values.length; i++)
            values[i] = this._parseKeys(values[i]);

        return values;
    }

    /**
     * @param {array<object>|object} options
     * @param {object} [options.where] Column parameters which should be used to search rows by. If not provided, a new row will be inserted.
     * @param {object} options.columns Columns to insert/modify.
     * @returns {object|boolean} New column values of the row or `false` if no rows were modified.
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
    set(rowOrRows: object[] | object) {
        if (!rowOrRows || (rowOrRows.constructor !== Object && rowOrRows.constructor !== Array)) {
            const err =
                new SQLiteHelperError("No rows were provided or their type was invalid.\
To set a single row, an object should be given, or an array if multiple rows should be set.");
            throw err;
        }

        // If only a single row was given, convert it to an array for easier handling
        const rows: object[] = rowOrRows.constructor === Array ? rowOrRows : [rowOrRows];

        const values = [];
        const queries = [];

        for (let i = 0; i < rows.length; i++) {
            let row: LooseObject = rows[i] || {};
            if (!row.columns) {
                const columns = row;
                row = {
                    columns
                };
            }

            const query = this._createQuery(row);
            queries.push(query);
        }

        this._set(queries);


        for (let i = 0; i < rows.length; i++) {
            const row: LooseObject = rows[i];

            let oldCacheValue;
            if (this.caching && row.where) {
                // Remove the old value from the cache
                // (only after writing the new value to the database, so that if writing the new value fails, the old cache value will not be removed)
                for (let j = 0; j < this.cache.length; j++) {
                    const value = this.cache[j];

                    for (const key in row.where) {
                        if (value[key] === row.where[key]) {
                            oldCacheValue = value;
                            this.cache.splice(j, 1);
                            break;
                        }
                    }
                }
            }

            const valuesObject = oldCacheValue || {};

            for (const key in row.columns) {
                valuesObject[key] = row.columns[key];
            }

            if (this.caching) {
                this.cache.push(valuesObject);
            }

            this.changedCB(valuesObject);

            values.push(valuesObject);
        }

        let returnValue: LooseObject = values; // By default, the returned value will be the array of values.
        if (returnValue.length === 1) // If the array only has one value, only return its first element.
            returnValue = returnValue[0];


        return returnValue;

    }

    /**
     * @param {string} columnName Name of the column to search by.
     * @param {*} columnValue Value of the column to search by.
     * @returns {boolean} Whether a row with the provided column name and value exists.
     */
    has(columnName: string, columnValue: any) {
        return !!this.get(columnName, columnValue);
    }

    /**
     * Ensures that a value exists in the table
     * @param {string} columnName Name of the column to search by.
     * @param {*} columnValue Value of the column to search by.
     * @param {object} ensureValue Value of the columns to be ensured if the row does not exist.
     * @returns {*} Ensured value
     */
    ensure(columnName: string, columnValue: any, ensureValue: object) {
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
    delete(columnName: string, columnValue: any) {
        const info = this.db.prepare(`DELETE FROM ${this.name} WHERE ${columnName} = ?`).run(columnValue);
        if (this.caching) {
            const columnObject: LooseObject = {};
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
    uncache(columnName?: string, columnValue?: any) {
        if (!this.caching)
            return false;
        if (columnName !== undefined && columnValue !== undefined) {
            // Remove the value from the cache
            for (let i = 0; i < this.cache.length; i++) {
                const value = this.cache[i];
                const columnObject: LooseObject = {};
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
            this.cache.length = 0;
            return !this.cache.length;
        }
    }

    indexes(columnName: string) {
        const dbValue = this.db.prepare(`SELECT ${columnName} FROM ${this.name}`).all();

        return dbValue.map((row: LooseObject) => row[columnName]);
    }

    changed(cb: (newValue: LooseObject) => void) {
        this.changedCB = cb;
    }

    private _createQuery(row: LooseObject) {
        const columnNames = Object.keys(row.columns);
        let values = [];
        let columnsStatement;
        const whereValues: object[] = [];

        let query;
        if (row.where) {
            columnsStatement = columnNames.map(columnName => {
                let value = row.columns[columnName];
                if (value.constructor === Object || value.constructor === Array)
                    value = stringify(value);
                values.push(value);
                return `${columnName} = ?`;
            }).join(', ');
            const whereStatement = "WHERE " + Object.keys(row.where).map(whereCheck => {
                whereValues.push(row.where[whereCheck]);
                return `${whereCheck} = ?`;
            }).join(' AND');
            query = `UPDATE ${this.name} SET ${columnsStatement} ${whereStatement}`;
        }
        else {
            const columnNamesString = columnNames.join(', ');
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
            query,
            values,
            whereValues
        };
    }

    private _set(rows: object[]) {
        const infos: object[] = [];
        const transaction = this.db.transaction(() => {
            for (let i = 0; i < rows.length; i++) {
                const row: LooseObject = rows[i];
                const { query, values, whereValues } = row;
                const stmt = this.db.prepare(query);
                const info = stmt.run(values, whereValues);
                infos.push(info);
            }
        });
        transaction();

        return infos;
    }

    private _parseKeys(object: LooseObject) {
        for (const key in object) {
            try {
                object[key] = parse(object[key]);
            } catch { }
        }
        return object;
    }
}

export = SQLiteHelper;