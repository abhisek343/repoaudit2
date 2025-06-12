import { z } from 'zod';

// Dependency configuration schema
export const DependencyConfigSchema = z.object({
  // Package Management
  packageManager: z.enum(['npm', 'yarn', 'pnpm']).default('npm'),
  registry: z.string().url().default('https://registry.npmjs.org/'),
  
  // Version Control
  versioning: z.object({
    strategy: z.enum(['semver', 'calendar']).default('semver'),
    autoUpdate: z.boolean().default(true),
    updateFrequency: z.enum(['daily', 'weekly', 'monthly']).default('weekly'),
  }),
  
  // Dependency Rules
  rules: z.object({
    maxDependencies: z.number().default(100),
    maxDevDependencies: z.number().default(50),
    requireExactVersions: z.boolean().default(true),
    allowPrerelease: z.boolean().default(false),
    allowedLicenses: z.array(z.string()).default([
      'MIT',
      'Apache-2.0',
      'BSD-2-Clause',
      'BSD-3-Clause',
      'ISC',
      'Unlicense'
    ]),
  }),
  
  // Security Scanning
  security: z.object({
    enabled: z.boolean().default(true),
    scanFrequency: z.enum(['daily', 'weekly', 'monthly']).default('daily'),
    failOnVulnerability: z.boolean().default(true),
    minimumSeverity: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  }),
  
  // Code Quality
  quality: z.object({
    maxFileLength: z.number().default(500), // lines
    maxFunctionLength: z.number().default(50), // lines
    maxCyclomaticComplexity: z.number().default(10),
    minTestCoverage: z.number().default(80), // percentage
    requireTypescript: z.boolean().default(true),
    requireTests: z.boolean().default(true),
    requireLinting: z.boolean().default(true),
    requireFormatting: z.boolean().default(true),
  }),
});

export type DependencyConfig = z.infer<typeof DependencyConfigSchema>;

// Default dependency configuration
export const defaultDependencyConfig: DependencyConfig = {
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
export const dependencyUtils = {
  validateLicense: (license: string): boolean => {
    return defaultDependencyConfig.rules.allowedLicenses.includes(license);
  },
  
  validateVersion: (version: string): boolean => {
    if (defaultDependencyConfig.rules.requireExactVersions) {
      return /^\d+\.\d+\.\d+$/.test(version);
    }
    return true;
  },
  
  validatePrerelease: (version: string): boolean => {
    if (!defaultDependencyConfig.rules.allowPrerelease) {
      return !version.includes('-');
    }
    return true;
  },
  
  calculateDependencyScore: (dependencies: number, devDependencies: number): number => {
    const maxScore = 100;
    const dependencyPenalty = (dependencies / defaultDependencyConfig.rules.maxDependencies) * 50;
    const devDependencyPenalty = (devDependencies / defaultDependencyConfig.rules.maxDevDependencies) * 50;
    
    return Math.max(0, maxScore - dependencyPenalty - devDependencyPenalty);
  },

  calculateCyclomaticComplexity: (code: string): number => {
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

  validateFileLength: (content: string, maxLength: number): boolean => {
    const lines = content.split('\n');
    return lines.length <= maxLength;
  },

  validateFunctionLength: (functionContent: string, maxLength: number): boolean => {
    const lines = functionContent.split('\n');
    return lines.length <= maxLength;
  },
};
