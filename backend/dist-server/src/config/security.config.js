"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimiter = exports.validatePassword = exports.securityMiddleware = exports.defaultSecurityConfig = exports.SecurityConfigSchema = void 0;
const zod_1 = require("zod");
const helmet_1 = __importDefault(require("helmet"));
// Security configuration schema
exports.SecurityConfigSchema = zod_1.z.object({
    // Rate Limiting
    rateLimit: zod_1.z.object({
        windowMs: zod_1.z.number().default(15 * 60 * 1000), // 15 minutes
        max: zod_1.z.number().default(100), // limit each IP to 100 requests per windowMs
    }),
    // CORS Configuration
    cors: zod_1.z.object({
        origin: zod_1.z.array(zod_1.z.string()).default(['http://localhost:5173']),
        methods: zod_1.z.array(zod_1.z.string()).default(['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']),
        allowedHeaders: zod_1.z.array(zod_1.z.string()).default(['Content-Type', 'Authorization']),
        credentials: zod_1.z.boolean().default(true),
    }),
    // File Upload Security
    fileUpload: zod_1.z.object({
        maxSize: zod_1.z.number().default(10 * 1024 * 1024), // 10MB
        allowedTypes: zod_1.z.array(zod_1.z.string()).default([
            '.txt', '.pdf', '.doc', '.docx',
            '.xls', '.xlsx', '.jpg', '.jpeg',
            '.png', '.gif'
        ]),
    }),
    // Password Security
    password: zod_1.z.object({
        minLength: zod_1.z.number().default(8),
        requireUppercase: zod_1.z.boolean().default(true),
        requireLowercase: zod_1.z.boolean().default(true),
        requireNumbers: zod_1.z.boolean().default(true),
        requireSpecialChars: zod_1.z.boolean().default(true),
    }),
    // API Security
    api: zod_1.z.object({
        keyHeader: zod_1.z.string().default('X-API-Key'),
        requireApiKey: zod_1.z.boolean().default(true),
    }),
});
// Default security configuration
exports.defaultSecurityConfig = {
    rateLimit: {
        windowMs: 15 * 60 * 1000,
        max: 100,
    },
    cors: {
        origin: ['http://localhost:5173'],
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
    },
    fileUpload: {
        maxSize: 10 * 1024 * 1024,
        allowedTypes: [
            '.txt', '.pdf', '.doc', '.docx',
            '.xls', '.xlsx', '.jpg', '.jpeg',
            '.png', '.gif'
        ],
    },
    password: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true,
    },
    api: {
        keyHeader: 'X-API-Key',
        requireApiKey: true,
    },
};
// Security middleware configuration
exports.securityMiddleware = {
    helmet: (0, helmet_1.default)({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "'unsafe-inline'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", 'data:', 'https:'],
                connectSrc: ["'self'"],
                fontSrc: ["'self'"],
                objectSrc: ["'none'"],
                mediaSrc: ["'self'"],
                frameSrc: ["'none'"],
            },
        },
        crossOriginEmbedderPolicy: true,
        crossOriginOpenerPolicy: true,
        crossOriginResourcePolicy: { policy: 'same-site' },
        dnsPrefetchControl: true,
        frameguard: { action: 'deny' },
        hidePoweredBy: true,
        hsts: true,
        ieNoOpen: true,
        noSniff: true,
        referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
        xssFilter: true,
    }),
};
// Password validation utility
const validatePassword = (password) => {
    const { minLength, requireUppercase, requireLowercase, requireNumbers, requireSpecialChars } = exports.defaultSecurityConfig.password;
    if (password.length < minLength)
        return false;
    if (requireUppercase && !/[A-Z]/.test(password))
        return false;
    if (requireLowercase && !/[a-z]/.test(password))
        return false;
    if (requireNumbers && !/\d/.test(password))
        return false;
    if (requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password))
        return false;
    return true;
};
exports.validatePassword = validatePassword;
// Rate limiting utility
class RateLimiter {
    requests = new Map();
    windowMs;
    maxRequests;
    constructor(windowMs = 60000, maxRequests = 100) {
        this.windowMs = windowMs;
        this.maxRequests = maxRequests;
    }
    isRateLimited(key) {
        const now = Date.now();
        const userRequests = this.requests.get(key) || [];
        // Remove old requests
        const recentRequests = userRequests.filter(time => now - time < this.windowMs);
        if (recentRequests.length >= this.maxRequests) {
            return true;
        }
        recentRequests.push(now);
        this.requests.set(key, recentRequests);
        return false;
    }
}
exports.RateLimiter = RateLimiter;
