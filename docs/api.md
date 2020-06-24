<a name="SQLite"></a>

## SQLite
A tool to make interactions with sqlite databases easier

**Kind**: global class  

* [SQLite](#SQLite)
    * [new SQLite([options])](#new_SQLite_new)
    * [.get(columnName, columnValue)](#SQLite+get) ⇒ <code>\*</code>
    * [.getAll()](#SQLite+getAll) ⇒ <code>object</code>
    * [.set(options)](#SQLite+set) ⇒ <code>object</code> \| <code>boolean</code>
    * [.has(columnName, columnValue)](#SQLite+has) ⇒ <code>boolean</code>
    * [.ensure(columnName, columnValue, ensureValue)](#SQLite+ensure) ⇒ <code>\*</code>
    * [.delete(columnName, columnValue)](#SQLite+delete) ⇒ <code>number</code>
    * [.uncache([columnName], [columnValue])](#SQLite+uncache) ⇒ <code>boolean</code>

<a name="new_SQLite_new"></a>

### new SQLite([options])

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [options] | <code>object</code> | <code>{}</code> | Options for SQLite. |
| [options.caching] | <code>boolean</code> | <code>true</code> | Toggle whether to enable caching. |
| [options.fetchAll] | <code>boolean</code> | <code>false</code> | Whether to fetch all rows of the sqlite database on initialization. Note: This option cannot be set to `true` if `options.caching` is `false`. |
| [options.dir] | <code>string</code> | <code>&quot;./data&quot;</code> | The directory where the sqlite file is/will be located. |
| [options.filename] | <code>string</code> | <code>&quot;sqlite.db&quot;</code> | The name of the file where the sqlite database is/should be saved. |
| [options.tableName] | <code>string</code> | <code>&quot;database&quot;</code> | The name of the table which SQLite should use. Note: You cannot work with multiple tables in one SQLite, you should create a separate SQLite for that. |
| [options.columns] | <code>object</code> | <code>[]</code> | The columns that should be created on the table if it doesn't exist. |
| [options.wal] | <code>boolean</code> | <code>false</code> | Whether to enable wal mode. (Read more about that [here](https://www.sqlite.org/wal.html)) |

**Example**  
```js
const db = new SQLite({  tableName: "foods",  columns: {      name: "text",      price: "int"  },  wal: true});
```
<a name="SQLite+get"></a>

### sqLite.get(columnName, columnValue) ⇒ <code>\*</code>
**Kind**: instance method of [<code>SQLite</code>](#SQLite)  
**Returns**: <code>\*</code> - The value retreived from the table.  

| Param | Type | Description |
| --- | --- | --- |
| columnName | <code>string</code> | The name of the column to search by. |
| columnValue | <code>\*</code> | The value of the column to search by. |

<a name="SQLite+getAll"></a>

### sqLite.getAll() ⇒ <code>object</code>
**Kind**: instance method of [<code>SQLite</code>](#SQLite)  
**Returns**: <code>object</code> - All rows of the table.  
<a name="SQLite+set"></a>

### sqLite.set(options) ⇒ <code>object</code> \| <code>boolean</code>
**Kind**: instance method of [<code>SQLite</code>](#SQLite)  
**Returns**: <code>object</code> \| <code>boolean</code> - The new column values of the row or `false` if no rows were modified. NOTE: If caching is not enabled, only changed column values will be returned.  

| Param | Type | Description |
| --- | --- | --- |
| options | <code>array</code> \| <code>object</code> |  |
| [options.where] | <code>object</code> | Column parameters which should be used to search rows by. If not provided, a new row will be inserted. |
| options.columns | <code>object</code> | Columns to insert/modify. |

**Example**  
```js
sqlite.set({    where: {        first_name: 'Josh',        last_name: 'Smith'    },    columns: {        last_name: 'Jonas'    }})
```
<a name="SQLite+has"></a>

### sqLite.has(columnName, columnValue) ⇒ <code>boolean</code>
**Kind**: instance method of [<code>SQLite</code>](#SQLite)  
**Returns**: <code>boolean</code> - Whether a row with the provided column name and value exists.  

| Param | Type | Description |
| --- | --- | --- |
| columnName | <code>string</code> | The name of the column to search by. |
| columnValue | <code>\*</code> | The value of the column to search by. |

<a name="SQLite+ensure"></a>

### sqLite.ensure(columnName, columnValue, ensureValue) ⇒ <code>\*</code>
Ensures that a value exists in the table

**Kind**: instance method of [<code>SQLite</code>](#SQLite)  
**Returns**: <code>\*</code> - Ensured value  

| Param | Type | Description |
| --- | --- | --- |
| columnName | <code>string</code> | Name of the column to search by. |
| columnValue | <code>\*</code> | Value of the column to search by. |
| ensureValue | <code>object</code> | Value of the columns to be ensured if the row does not exist. |

<a name="SQLite+delete"></a>

### sqLite.delete(columnName, columnValue) ⇒ <code>number</code>
Deletes a single or multiple rows from the table.

**Kind**: instance method of [<code>SQLite</code>](#SQLite)  
**Returns**: <code>number</code> - Number of rows that were deleted.  

| Param | Type | Description |
| --- | --- | --- |
| columnName | <code>string</code> | Name of the column to search by. |
| columnValue | <code>\*</code> | Value of the column to search by. |

<a name="SQLite+uncache"></a>

### sqLite.uncache([columnName], [columnValue]) ⇒ <code>boolean</code>
Removes a single value (or all values if no arguments are provided) from the cache.

**Kind**: instance method of [<code>SQLite</code>](#SQLite)  
**Returns**: <code>boolean</code> - Whether the deletion was successful.  

| Param | Type | Description |
| --- | --- | --- |
| [columnName] | <code>string</code> | Name of the column to search by. |
| [columnValue] | <code>\*</code> | Value of the column to search by. |

