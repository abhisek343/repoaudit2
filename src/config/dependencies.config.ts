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
    requireTypescript: z.boolean().default(true),
    requireTests: z.boolean().default(true),
    minTestCoverage: z.number().default(80),
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
    requireTypescript: true,
    requireTests: true,
    minTestCoverage: 80,
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
}; 