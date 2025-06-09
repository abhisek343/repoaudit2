import { z } from 'zod';

// Code quality configuration schema
export const QualityConfigSchema = z.object({
  maxFileLength: z.number().default(500), // lines
  maxFunctionLength: z.number().default(50), // lines
  maxCyclomaticComplexity: z.number().default(10),
  minTestCoverage: z.number().default(80), // percentage
  maxDependencies: z.number().default(20),
  requireTypescript: z.boolean().default(true),
  requireComments: z.boolean().default(true),
  requireTests: z.boolean().default(true),
});

export type QualityConfig = z.infer<typeof QualityConfigSchema>;

// Default quality configuration
export const defaultQualityConfig: QualityConfig = {
  maxFileLength: 500,
  maxFunctionLength: 50,
  maxCyclomaticComplexity: 10,
  minTestCoverage: 80,
  maxDependencies: 20,
  requireTypescript: true,
  requireComments: true,
  requireTests: true,
};

// Code quality utility functions
export const calculateCyclomaticComplexity = (code: string): number => {
  const complexityKeywords = [
    'if', 'else', 'for', 'while', 'do', 'switch',
    'case', 'catch', '&&', '||', '?', '??'
  ];
  
  return complexityKeywords.reduce((count, keyword) => {
    const regex = new RegExp(`\\b${keyword}\\b`, 'g');
    const matches = code.match(regex);
    return count + (matches ? matches.length : 0);
  }, 1); // Base complexity is 1
};

export const validateFileLength = (content: string, maxLength: number): boolean => {
  const lines = content.split('\n');
  return lines.length <= maxLength;
};

export const validateFunctionLength = (functionContent: string, maxLength: number): boolean => {
  const lines = functionContent.split('\n');
  return lines.length <= maxLength;
};

// Code quality metrics
export interface CodeQualityMetrics {
  cyclomaticComplexity: number;
  fileLength: number;
  functionLengths: number[];
  testCoverage: number;
  dependencyCount: number;
}

export const calculateCodeQualityMetrics = (code: string): CodeQualityMetrics => {
  const lines = code.split('\n');
  const functions = code.match(/function\s+\w+\s*\([^)]*\)\s*{/g) || [];
  
  return {
    cyclomaticComplexity: calculateCyclomaticComplexity(code),
    fileLength: lines.length,
    functionLengths: functions.map(fn => {
      const startIndex = code.indexOf(fn);
      const endIndex = code.indexOf('}', startIndex);
      return endIndex - startIndex;
    }),
    testCoverage: 0, // This would need to be calculated by a test runner
    dependencyCount: (code.match(/import\s+.*\s+from\s+['"].*['"]/g) || []).length,
  };
}; 