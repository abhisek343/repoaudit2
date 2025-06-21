"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = exports.safeAsync = void 0;
const safeAsync = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};
exports.safeAsync = safeAsync;
const errorHandler = (err, _req, res, _next) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ error: 'An unexpected error occurred.' });
};
exports.errorHandler = errorHandler;
