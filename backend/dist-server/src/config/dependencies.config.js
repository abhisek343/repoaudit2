"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dependencyUtils = exports.defaultDependencyConfig = exports.DependencyConfigSchema = void 0;
const zod_1 = require("zod");
// Dependency configuration schema
exports.DependencyConfigSchema = zod_1.z.object({
    // Package Management
    packageManager: zod_1.z.enum(['npm', 'yarn', 'pnpm']).default('npm'),
    registry: zod_1.z.string().url().default('https://registry.npmjs.org/'),
    // Version Control
    versioning: zod_1.z.object({
        strategy: zod_1.z.enum(['semver', 'calendar']).default('semver'),
        autoUpdate: zod_1.z.boolean().default(true),
        updateFrequency: zod_1.z.enum(['daily', 'weekly', 'monthly']).default('weekly'),
    }),
    // Dependency Rules
    rules: zod_1.z.object({
        maxDependencies: zod_1.z.number().default(100),
        maxDevDependencies: zod_1.z.number().default(50),
        requireExactVersions: zod_1.z.boolean().default(true),
        allowPrerelease: zod_1.z.boolean().default(false),
        allowedLicenses: zod_1.z.array(zod_1.z.string()).default([
            'MIT',
            'Apache-2.0',
            'BSD-2-Clause',
            'BSD-3-Clause',
            'ISC',
            'Unlicense'
        ]),
    }),
    // Security Scanning
    security: zod_1.z.object({
        enabled: zod_1.z.boolean().default(true),
        scanFrequency: zod_1.z.enum(['daily', 'weekly', 'monthly']).default('daily'),
        failOnVulnerability: zod_1.z.boolean().default(true),
        minimumSeverity: zod_1.z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
    }),
    // Code Quality
    quality: zod_1.z.object({
        maxFileLength: zod_1.z.number().default(500), // lines
        maxFunctionLength: zod_1.z.number().default(50), // lines
        maxCyclomaticComplexity: zod_1.z.number().default(10),
        minTestCoverage: zod_1.z.number().default(80), // percentage
        requireTypescript: zod_1.z.boolean().default(true),
        requireTests: zod_1.z.boolean().default(true),
        requireLinting: zod_1.z.boolean().default(true),
        requireFormatting: zod_1.z.boolean().default(true),
    }),
});
// Default dependency configuration
exports.defaultDependencyConfig = {
    packageManager: 'npm',
    registry: 'https://registry.npmjs.org/',
    versioning: {
        strategy: 'semver',
        autoUpdate: true,
        updateFrequency: 'weekly',
    },
    rules: {
        maxDependencies: 100,
        maxDevDependencies: 50,
        requireExactVersions: true,
        allowPrerelease: false,
        allowedLicenses: [
            'MIT',
            'Apache-2.0',
            'BSD-2-Clause',
            'BSD-3-Clause',
            'ISC',
            'Unlicense'
        ],
    },
    security: {
        enabled: true,
        scanFrequency: 'daily',
        failOnVulnerability: true,
        minimumSeverity: 'medium',
    },
    quality: {
        maxFileLength: 500,
        maxFunctionLength: 50,
        maxCyclomaticComplexity: 10,
        minTestCoverage: 80,
        requireTypescript: true,
        requireTests: true,
        requireLinting: true,
        requireFormatting: true,
    },
};
// Dependency validation utilities
exports.dependencyUtils = {
    validateLicense: (license) => {
        return exports.defaultDependencyConfig.rules.allowedLicenses.includes(license);
    },
    validateVersion: (version) => {
        if (exports.defaultDependencyConfig.rules.requireExactVersions) {
            return /^\d+\.\d+\.\d+$/.test(version);
        }
        return true;
    },
    validatePrerelease: (version) => {
        if (!exports.defaultDependencyConfig.rules.allowPrerelease) {
            return !version.includes('-');
        }
        return true;
    },
    calculateDependencyScore: (dependencies, devDependencies) => {
        const maxScore = 100;
        const dependencyPenalty = (dependencies / exports.defaultDependencyConfig.rules.maxDependencies) * 50;
        const devDependencyPenalty = (devDependencies / exports.defaultDependencyConfig.rules.maxDevDependencies) * 50;
        return Math.max(0, maxScore - dependencyPenalty - devDependencyPenalty);
    },
    calculateCyclomaticComplexity: (code) => {
        const complexityKeywords = [
            'if', 'else', 'for', 'while', 'do', 'switch',
            'case', 'catch', '&&', '||', '?', '??'
        ];
        return complexityKeywords.reduce((count, keyword) => {
            // MODIFIED: Escape special regex characters in the keyword
            const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            // Ensure word boundaries only if the keyword is alphanumeric
            const regex = /^[a-zA-Z0-9_]+$/.test(escapedKeyword)
                ? new RegExp(`\\b${escapedKeyword}\\b`, 'g')
                : new RegExp(escapedKeyword, 'g'); // For operators like &&, ||, ?
            const matches = code.match(regex);
            return count + (matches ? matches.length : 0);
        }, 1); // Base complexity is 1
    },
    validateFileLength: (content, maxLength) => {
        const lines = content.split('\n');
        return lines.length <= maxLength;
    },
    validateFunctionLength: (functionContent, maxLength) => {
        const lines = functionContent.split('\n');
        return lines.length <= maxLength;
    },
};
