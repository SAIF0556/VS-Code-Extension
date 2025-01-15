// src/utils/debug.js
const vscode = require("vscode");

function debugLog(message, data = '') {
    console.log(`[DEBUG] ${message}`, data);
    if (global._outputChannel) {
        global._outputChannel.appendLine(`[DEBUG] ${message} ${data}`);
    }
}

module.exports = { debugLog };