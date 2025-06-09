export interface Repository {
  name: string;
  fullName: string;
  description: string;
  language: string;
  stars: number;
  forks: number;
  watchers: number;
  createdAt: string;
  updatedAt: string;
  defaultBranch: string;
  size: number;
  openIssues: number;
  hasWiki: boolean;
  hasPages: boolean;
  license?: {
    name: string;
    spdxId: string;
  };
}

export interface FileInfo {
  name: string;
  path: string;
  size: number;
  type?: 'file' | 'dir' | 'symlink' | string; // Added type property
  content?: string;
  language?: string;
  complexity?: number;
  testCoverage?: number;
  lastModified?: string;
  primaryAuthor?: string;
}

export interface ExtendedFileInfo extends FileInfo {
  type: string;
  dependencies: string[];
  contributors: string[];
  commitCount: number;
  functions?: {
    name: string;
    complexity: number;
    dependencies: string[];
    calls: string[];
    description?: string;
  }[];
}

export interface Contributor {
  login: string;
  contributions: number;
  avatarUrl: string;
  type: string;
  recentActivity?: boolean;
  knowledgeAreas?: string[];
  reviewCount?: number;
}

export interface Commit {
  sha: string;
  message: string;
  author: {
    name: string;
    email: string;
    date: string;
  };
  stats?: {
    additions: number;
    deletions: number;
    total: number;
  };
  files?: string[];
}

export interface SecurityIssue {
  type: 'secret' | 'vulnerability' | 'configuration';
  severity: 'low' | 'medium' | 'high' | 'critical';
  file: string;
  line?: number;
  description: string;
  recommendation: string;
}

export interface PerformanceMetric {
  function: string;
  file: string;
  complexity: string; // O(n), O(n²), etc.
  estimatedRuntime: string;
  recommendation?: string;
}

export interface TechnicalDebt {
  type: 'complexity' | 'duplication' | 'smell' | 'outdated';
  severity: 'low' | 'medium' | 'high';
  file: string;
  description: string;
  effort: string; // hours/days estimate
  impact: string;
}

export interface APIEndpoint {
  method: string;
  path: string;
  file: string;
  parameters?: string[];
  responses?: string[];
  documentation?: string;
}

export interface AnalysisResult {
  repository: Repository;
  contributors: Contributor[];
  commits: Commit[];
  files: FileInfo[];
  languages: Record<string, number>;
  metrics: {
    totalCommits: number;
    totalContributors: number;
    linesOfCode: number;
    busFactor: number;
    testCoverage: number;
    codeQuality: number;
    technicalDebtScore: number;
    securityScore: number;
    performanceScore: number;
  };
  aiSummary?: string;
  hotspots?: Array<{
    file: string;
    complexity: number;
    changes: number;
    explanation?: string;
    size?: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
  }>;
  keyFunctions?: Array<{
    name: string;
    file: string;
    explanation: string;
    complexity: number;
    performance?: PerformanceMetric;
  }>;
  architectureAnalysis?: string;
  securityAnalysis?: string;
  securityIssues?: SecurityIssue[];
  technicalDebt?: TechnicalDebt[];
  apiEndpoints?: APIEndpoint[];
  performanceMetrics?: PerformanceMetric[];
  knowledgeSilos?: Array<{
    area: string;
    files: string[];
    primaryOwner: string;
    riskLevel: 'low' | 'medium' | 'high';
  }>;
  refactoringRoadmap?: Array<{
    priority: number;
    title: string;
    description: string;
    effort: string;
    impact: string;
    files: string[];
  }>;
}

export interface LLMConfig {
  provider: 'openai' | 'claude' | 'gemini'; // Consolidated to single 'gemini' for Google
  apiKey: string;
  model?: string;
}

export interface ReportCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  features: string[];
  requiredPlan: 'free' | 'pro' | 'enterprise';
}

export interface SavedReport {
  id: string;
  userId: string;
  repositoryUrl: string;
  repositoryName: string;
  category: string;
  createdAt: string;
  lastAccessed: string;
  isPublic: boolean;
  tags: string[];
  summary: string;
}

export interface Vulnerability {
  id: string;
  cveId: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  packageName: string;
  version: string;
  description: string;
  remediation: string;
  recommendation: string;
  file: string;
}
