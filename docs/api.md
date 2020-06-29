<a name="SQLiteHelper"></a>

## SQLiteHelper
A tool to make interactions with sqlite databases easier

**Kind**: global class  

* [SQLiteHelper](#SQLiteHelper)
    * [new SQLiteHelper([options])](#new_SQLiteHelper_new)
    * [.get(columnName, columnValue)](#SQLiteHelper+get) ⇒ <code>\*</code>
    * [.getAll()](#SQLiteHelper+getAll) ⇒ <code>object</code>
    * [.set(options)](#SQLiteHelper+set) ⇒ <code>object</code> \| <code>boolean</code>
    * [.has(columnName, columnValue)](#SQLiteHelper+has) ⇒ <code>boolean</code>
    * [.ensure(columnName, columnValue, ensureValue)](#SQLiteHelper+ensure) ⇒ <code>\*</code>
    * [.delete(columnName, columnValue)](#SQLiteHelper+delete) ⇒ <code>number</code>
    * [.uncache([columnName], [columnValue])](#SQLiteHelper+uncache) ⇒ <code>boolean</code>

<a name="new_SQLiteHelper_new"></a>

### new SQLiteHelper([options])

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [options] | <code>object</code> | <code>{}</code> | Options for SQLite. |
| [options.tableName] | <code>string</code> | <code>&quot;database&quot;</code> | Name of the table which SQLite should use. |
| [options.dir] | <code>string</code> | <code>&quot;./data&quot;</code> | Directory where the sqlite file is/will be located. |
| [options.filename] | <code>string</code> | <code>&quot;sqlite.db&quot;</code> | Name of the file where the sqlite database is/should be saved. Note: You cannot work with multiple tables in one SQLite, you should create a separate SQLite for that. |
| [options.columns] | <code>object</code> | <code>{}</code> | Columns that should be created on the table if it doesn't exist. |
| [options.caching] | <code>boolean</code> | <code>true</code> | Toggle whether to enable caching. |
| [options.fetchAll] | <code>boolean</code> | <code>false</code> | Whether to fetch all rows of the sqlite database on initialization. Note: This option cannot be set to `true` if `options.caching` is `true`. |
| [options.wal] | <code>boolean</code> | <code>false</code> | Whether to enable wal mode. (Read more about that [here](https://www.sqlite.org/wal.html)) |

**Example**  
```js
const db = new SQLite({
  tableName: "foods",
  columns: {
      name: "text",
      price: "int"
  },
  wal: true
});
```
<a name="SQLiteHelper+get"></a>

### sqLiteHelper.get(columnName, columnValue) ⇒ <code>\*</code>
**Kind**: instance method of [<code>SQLiteHelper</code>](#SQLiteHelper)  
**Returns**: <code>\*</code> - Value retreived from the table.  

| Param | Type | Description |
| --- | --- | --- |
| columnName | <code>string</code> | Name of the column to search by. |
| columnValue | <code>\*</code> | Value of the column to search by. |

<a name="SQLiteHelper+getAll"></a>

### sqLiteHelper.getAll() ⇒ <code>object</code>
**Kind**: instance method of [<code>SQLiteHelper</code>](#SQLiteHelper)  
**Returns**: <code>object</code> - All rows of the table.  
<a name="SQLiteHelper+set"></a>

### sqLiteHelper.set(options) ⇒ <code>object</code> \| <code>boolean</code>
**Kind**: instance method of [<code>SQLiteHelper</code>](#SQLiteHelper)  
**Returns**: <code>object</code> \| <code>boolean</code> - New column values of the row or `false` if no rows were modified.
NOTE: If caching is not enabled, only changed column values will be returned.  

| Param | Type | Description |
| --- | --- | --- |
| options | <code>array.&lt;object&gt;</code> \| <code>object</code> |  |
| [options.where] | <code>object</code> | Column parameters which should be used to search rows by. If not provided, a new row will be inserted. |
| options.columns | <code>object</code> | Columns to insert/modify. |

**Example**  
```js
sqlite.set({
    where: {
        first_name: 'Josh',
        last_name: 'Smith'
    },
    columns: {
        last_name: 'Jonas'
    }
})
```
<a name="SQLiteHelper+has"></a>

### sqLiteHelper.has(columnName, columnValue) ⇒ <code>boolean</code>
**Kind**: instance method of [<code>SQLiteHelper</code>](#SQLiteHelper)  
**Returns**: <code>boolean</code> - Whether a row with the provided column name and value exists.  

| Param | Type | Description |
| --- | --- | --- |
| columnName | <code>string</code> | Name of the column to search by. |
| columnValue | <code>\*</code> | Value of the column to search by. |

<a name="SQLiteHelper+ensure"></a>

### sqLiteHelper.ensure(columnName, columnValue, ensureValue) ⇒ <code>\*</code>
Ensures that a value exists in the table

**Kind**: instance method of [<code>SQLiteHelper</code>](#SQLiteHelper)  
**Returns**: <code>\*</code> - Ensured value  

| Param | Type | Description |
| --- | --- | --- |
| columnName | <code>string</code> | Name of the column to search by. |
| columnValue | <code>\*</code> | Value of the column to search by. |
| ensureValue | <code>object</code> | Value of the columns to be ensured if the row does not exist. |

<a name="SQLiteHelper+delete"></a>

### sqLiteHelper.delete(columnName, columnValue) ⇒ <code>number</code>
Deletes a single or multiple rows from the table.

**Kind**: instance method of [<code>SQLiteHelper</code>](#SQLiteHelper)  
**Returns**: <code>number</code> - Number of rows that were deleted.  

| Param | Type | Description |
| --- | --- | --- |
| columnName | <code>string</code> | Name of the column to search by. |
| columnValue | <code>\*</code> | Value of the column to search by. |

<a name="SQLiteHelper+uncache"></a>

### sqLiteHelper.uncache([columnName], [columnValue]) ⇒ <code>boolean</code>
Removes a single value (or all values if no arguments are provided) from the cache.

**Kind**: instance method of [<code>SQLiteHelper</code>](#SQLiteHelper)  
**Returns**: <code>boolean</code> - Whether the deletion was successful.  

| Param | Type | Description |
| --- | --- | --- |
| [columnName] | <code>string</code> | Name of the column to search by. |
| [columnValue] | <code>\*</code> | Value of the column to search by. |

