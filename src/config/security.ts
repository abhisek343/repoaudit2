import { z } from 'zod';

// Security configuration schema
export const SecurityConfigSchema = z.object({
  maxFileSize: z.number().default(10 * 1024 * 1024), // 10MB
  allowedFileTypes: z.array(z.string()).default(['.txt', '.pdf', '.doc', '.docx', '.xls', '.xlsx']),
  rateLimit: z.number().default(100), // requests per minute
  corsOrigins: z.array(z.string()).default(['http://localhost:5173']),
  sessionTimeout: z.number().default(30 * 60 * 1000), // 30 minutes
});

export type SecurityConfig = z.infer<typeof SecurityConfigSchema>;

// Default security configuration
export const defaultSecurityConfig: SecurityConfig = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedFileTypes: ['.txt', '.pdf', '.doc', '.docx', '.xls', '.xlsx'],
  rateLimit: 100,
  corsOrigins: ['http://localhost:5173'],
  sessionTimeout: 30 * 60 * 1000, // 30 minutes
};

// Security utility functions
export const validateFileType = (filename: string, allowedTypes: string[]): boolean => {
  const extension = filename.toLowerCase().slice(filename.lastIndexOf('.'));
  return allowedTypes.includes(extension);
};

export const validateFileSize = (size: number, maxSize: number): boolean => {
  return size <= maxSize;
};

// Rate limiting utility
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(windowMs: number = 60000, maxRequests: number = 100) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  isRateLimited(key: string): boolean {
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