const Database = require('better-sqlite3');
const fs = require('fs');
const { resolve } = require('path');
const SQLiteError = require('./error');

const { stringify } = JSON;

class SQLite {
    /**
    * @param {Object} options Options for SQLite.
    * @param {Boolean} options.caching Toggle whether to enable caching. Default to `true`.
    * @param {Boolean} options.fetchAll Wheter to fetch all rows of the sqlite database on initialization, defaults to `false`. 
    * Note: This option cannot be set to `true` if `options.caching` is `true`.
    * @param {String} options.dir The directory where the sqlite file is/will be located. Defaults to `./data`.
    * @param {String} options.filename The name of the file where the sqlite database is/should be saved. Defaults to `sqlite.db`
    * @param {String} options.tableName The name of the table which SQLite should use 
    * Note: You cannot work with multiple tables in one SQLite, you should create a separate SQLite for that.
    * @param {Object} options.columns 
    */
    constructor(options) {

        options = options || {};

        options.dir = options.dir || './data';
        if (!fs.existsSync(options.dir))
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

        const table = this.db.prepare("SELECT count(*) FROM sqlite_master WHERE type = 'table' AND name = ?").get(this.name);

        if (!table['count(*)']) {
            if (!columnsStatement.length)
                throw new SQLiteError(`No columns were provided and the "${this.name}" table doesn't exist. Columns are required to ensure at table creation.`);

            this.db.prepare(`CREATE TABLE ${this.name} (${columnsStatement.join(', ')})`).run();
        }


        options.caching = options.caching === undefined ? true : options.caching;

        if (options.caching)
            Object.defineProperty(this, "cache", {
                value: []
            });


        Object.defineProperty(this, "options", {
            value: options
        });
    }

    get(columnName, columnValue) {
        let response;
        if (this.options.caching) {
            const cacheResult = this.cache.find(row => row[columnName] === columnValue);

            if (cacheResult)
                return cacheResult;
        }
        response = this.db.prepare(`SELECT * FROM ${this.name} WHERE ${columnName} = ?`).get(columnValue);
        if (response)
            this.cache.push(response);


        return response;
    }

    /**
        @param {Object} where Column parameters which should be used to search rows by. If not provided, a new row will be inserted.
        @param {Object} columns Columns to insert/modify
        @example
        sqlite.set({
            where: {
                first_name: 'Josh',
                last_name: 'Smith'
            },
            columns: {
                last_name: 'Jonas'
            }
        })
    }
    */
    set(options) {
        options = options || {};
        if (!options.columns) {
            options.columns = options;
            delete options.where;
        }
        let columnNames = Object.keys(options.columns);
        let values = [];
        if (!options.columns || options.columns.constructor !== Object)
            throw new SQLiteError(`No columns were provided. They are required to modify/create a row.`)
        let columnsStatement;

        let response;
        let oldCacheValue;
        if (options.where) {
            let whereValues = [];
            columnsStatement = columnNames.map(columnName => {
                let value = options.columns[columnName];
                if (value.constructor === Object)
                    value = JSON.stringify(value);
                values.push(value);
                return `${columnName} = ?`;
            }).join(', ');
            let whereStatement = "WHERE " + Object.keys(options.where).map(whereCheck => {
                whereValues.push(options.where[whereCheck]);
                return `${whereCheck} = ?`;
            }).join(' AND');

            response = this.db.prepare(`UPDATE ${this.name} SET ${columnsStatement} ${whereStatement}`).run(values, whereValues);

            if (this.options.caching) {

                // Remove the old value from the cache
                for (let i = 0; i < this.cache.length; i++) {
                    const value = this.cache[i];

                    for (let key in options.where) {
                        if (value[key] === options.where[key]) {
                            oldCacheValue = value;
                            this.cache.splice(i, 1);
                            break;
                        }
                    }
                }
            }
        }
        else {
            let columnNamesString = columnNames.join(', ');
            values = columnNames.map(columnName => {
                let value = options.columns[columnName];
                if (value.constructor === Object)
                    value = JSON.stringify(value);
                return value;
            });
            const questionMarks = [];
            for (let i = 0; i < values.length; i++) {
                questionMarks.push('?');
            }
            response = this.db.prepare(`INSERT INTO ${this.name} (${columnNamesString}) VALUES (${questionMarks.join(', ')})`).run(values);
        }

        if (this.options.caching)
            this.cache.push(options.columns);

        if (typeof this.changedCB == 'function') {
            let newCacheValue = oldCacheValue || {};
            for (let key in options.columns) {
                newCacheValue[key] = options.columns[key];
            }
            this.changedCB(newCacheValue);
        }

        return !!response.changes ? options.columns : false;

    }

    has(columnName, columnValue) {
        return !!this.get(columnName, columnValue);
    }

    ensure(columnName, columnValue, ensureValue) {
        let value = this.get(columnName, columnValue);

        if (!value)
            value = this.set({
                columns: ensureValue
            });

        return value;
    }

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
        }

        else
            this.cache.length = [];

        return !this.cache.length;
    }

    indexes(columnName) {
        const response = this.db.prepare(`SELECT ${columnName} FROM ${this.name}`).all();

        return response.map(row => row[columnName]);
    }

    changed(cb) {
        this.changedCB = cb;
    }
}

module.exports = SQLite;