# sqlite-helper

⚠️ **WARNING**: sqlite-helper is under heavy development and is not ready for production use. If you still decide to implement it, make sure to intervally check for updates.

 A tool to make interactions with sqlite databases easier

![GitHub repository size](https://img.shields.io/github/repo-size/PandaDriver156/sqlite-helper?label=Repository%20Size&logo=github)

## Requirements

Node.js 12.0.0 or above is required.

## Installation

<pre>
//Using npm
npm i PandaDriver156/sqlite-helper
</pre>

## Example usage

```js
const SQLite = require('sqlite-helper');

const db = new SQLite({
tableName: "foods",
columns: {
    name: "text",
    price: "int"
},
wal: true
});
```

## Documentation

 * [API Refenece](./docs/api.md)