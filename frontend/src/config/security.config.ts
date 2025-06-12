import { z } from 'zod';

// Security configuration schema
export const SecurityConfigSchema = z.object({
  // Rate Limiting
  rateLimit: z.object({
    windowMs: z.number().default(15 * 60 * 1000), // 15 minutes
    max: z.number().default(100), // limit each IP to 100 requests per windowMs
  }),
  
  // CORS Configuration
  cors: z.object({
    origin: z.array(z.string()).default(['http://localhost:5173']),
    methods: z.array(z.string()).default(['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']),
    allowedHeaders: z.array(z.string()).default(['Content-Type', 'Authorization']),
    credentials: z.boolean().default(true),
  }),
  
  // File Upload Security
  fileUpload: z.object({
    maxSize: z.number().default(10 * 1024 * 1024), // 10MB
    allowedTypes: z.array(z.string()).default([
      '.txt', '.pdf', '.doc', '.docx',
      '.xls', '.xlsx', '.jpg', '.jpeg',
      '.png', '.gif'
    ]),
  }),
  
  // Password Security
  password: z.object({
    minLength: z.number().default(8),
    requireUppercase: z.boolean().default(true),
    requireLowercase: z.boolean().default(true),
    requireNumbers: z.boolean().default(true),
    requireSpecialChars: z.boolean().default(true),
  }),
  
  // API Security
  api: z.object({
    keyHeader: z.string().default('X-API-Key'),
    requireApiKey: z.boolean().default(true),
  }),
});

export type SecurityConfig = z.infer<typeof SecurityConfigSchema>;

// Default security configuration
export const defaultSecurityConfig: SecurityConfig = {
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

// Password validation utility
export const validatePassword = (password: string): boolean => {
  const { minLength, requireUppercase, requireLowercase, requireNumbers, requireSpecialChars } = defaultSecurityConfig.password;
  
  if (password.length < minLength) return false;
  if (requireUppercase && !/[A-Z]/.test(password)) return false;
  if (requireLowercase && !/[a-z]/.test(password)) return false;
  if (requireNumbers && !/\d/.test(password)) return false;
  if (requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) return false;
  
  return true;
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
