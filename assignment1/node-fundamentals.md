# Node.js Fundamentals

## What is Node.js?

using javascript for backend developement or for connecting with the server is know as node.js

## How does Node.js differ from running JavaScript in the browser?

node.js is running in the server not the web browser. for example console.log() of node.js will appear in the terminal not on the web brower console.

## What is the V8 engine, and how does Node use it?

Node.js uses V8 to run JavaScript outside the browser and adds server-side capabilities like non-blocking I/O, the event loop, and system APIs

## What are some key use cases for Node.js?

node.js is the single threaded, event-driven application, due to that it is good for live streaming, live chats and notifications.

## Explain the difference between CommonJS and ES Modules. Give a code example of each.

commonJS is used in server side applications where import and exports are done by require() and module.exports.
ES modules are mainly used in browser side of the application where import and exports are import file or library and default export for the function/method.
ex:
ES module:
import { useState, useEffect } from 'react';
CommonJS:
const { register, logoff } = require("../controllers/userController");

**CommonJS (default in Node.js):**

```js
// Answer here..
Both CommonJS and ES modules are supoorted by node but we have to give file extension for ES module with .mjs, CommonJS with .js.Mixing bot will be confusing for developers so staying with CommonJS for backend and ES modules for front-end/ browser side will be useful.
```

**ES Modules (supported in modern Node.js):**

```js
// Answer here..
yes;
```
