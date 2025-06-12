// Contains all shared types for the application.

// --- GitHub API related types (as returned by githubService) ---
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

export interface Contributor {
  login: string;
  contributions: number;
  avatarUrl: string;
  type: string;
  html_url?: string;
  email?: string;
  recentActivity?: RecentActivity;
  knowledgeAreas?: string[];
  reviewCount?: number;
  joinDate?: string;
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
  files?: Array<{
    filename: string;
    additions: number;
    deletions: number;
    changes: number;
    status: string;
    patch?: string;
  }>;
}

export interface FileInfo {
  name: string;
  path: string;
  size: number;
  type: 'file' | 'dir' | 'symlink' | 'blob' | 'tree' | string;
  content?: string;
  language?: string;
  complexity?: number;
  testCoverage?: number;
  lastModified?: string;
  primaryAuthor?: string;
  dependencies?: string[];
  commitCount?: number;
  contributors?: string[];
  functions?: FunctionInfo[];
}


// --- Processed data types for frontend consumption ---

export interface BasicRepositoryInfo {
  name: string;
  fullName: string;
  description: string | null;
  stars: number;
  forks: number;
  watchers: number;
  language: string | null;
  url: string;
  owner: string;
  createdAt: string;
  updatedAt: string;
  defaultBranch: string;
  size: number;
  openIssues: number;
  hasWiki: boolean;
  hasPages: boolean;
}

export interface ProcessedCommit {
  sha: string;
  author: string;
  date: string;
  message: string;
  stats: {
    additions: number;
    deletions: number;
    total: number;
  };
  files: unknown[]; // Simplified for now
}

export interface ProcessedContributor {
  login: string;
  avatarUrl: string;
  contributions: number;
  profileUrl: string;
  activity?: Array<{ date: string; count: number;[key: string]: unknown }>;
}

export interface DependencyNode {
  id: string;
  name: string;
  version?: string;
  type: 'dependency' | 'devDependency' | string;
  size: number;
}

export interface DependencyLink {
  source: string | DependencyNode;
  target: string | DependencyNode;
  value?: number;
  type: string;
  strength: number;
}

export interface DependencyInfo {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  nodes?: DependencyNode[];
  links?: DependencyLink[];
}

export interface ArchitectureData {
    nodes: Array<{ id: string; name: string; type: string; path: string }>;
    links: Array<{ source: string; target: string }>;
}

export interface FileMetrics {
    complexity: number;
    maintainability: number;
    linesOfCode: number;
}

export interface QualityMetrics {
    [key: string]: FileMetrics;
}

export interface SecurityIssue {
  type: 'secret' | 'vulnerability' | 'configuration';
  severity: 'low' | 'medium' | 'high' | 'critical';
  file: string;
  line?: number;
  description: string;
  recommendation: string;
  cwe?: string;
  codeSnippet?: string;
}

// ADD these missing interfaces that components expect:
export interface TechnicalDebt {
  type: 'complexity' | 'duplication' | 'smell' | 'outdated' | 'documentation';
  severity: 'low' | 'medium' | 'high';
  file: string;
  line?: number;
  description: string;
  effort: string;
  impact: string;
  recommendation?: string;
}

export interface PerformanceMetric {
  function: string;
  file: string;
  complexity: string;
  estimatedRuntime: string;
  recommendation: string;
}

export interface APIEndpoint {
  method: string;
  path: string;
  file: string;
  handlerFunction: string;
  parameters?: Array<{ name: string; type: string; in: string }>;
  responses?: Array<{ statusCode: string; description: string; schema?: any }>;
  documentation?: string;
  security?: string[];
}

export interface Hotspot {
  file: string;
  path: string;
  complexity: number;
  changes: number;
  explanation?: string;
  size?: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  primaryContributors?: string[];
}

export interface KeyFunction {
  name: string;
  file: string;
  path?: string;
  complexity: number;
  explanation: string;
  linesOfCode?: number;
  performance?: {
    estimatedRuntime: string;
    complexity: string;
  };
}

// Enhanced FileNode for diagrams
export interface FileNode {
  name: string;
  path: string;
  size: number;
  children?: FileNode[];
  type: 'file' | 'directory';
  value?: number;
}

export interface ChurnNode {
  name: string;
  path: string;
  churnRate: number;
  children?: ChurnNode[];
  type: 'directory' | 'file';
}

export interface PRPhase {
  name: string;
  duration: number;
  color: string;
  icon: React.ReactNode | string;
}

// --- Main Analysis Result Structure ---

// Update AnalysisResult to include ALL expected fields
export interface AnalysisResult {
  id: string;
  repositoryUrl: string;
  createdAt: string;
  
  // Core data
  basicInfo: BasicRepositoryInfo;
  repository: Repository; // ← Many components expect THIS name
  commits: ProcessedCommit[];
  contributors: ProcessedContributor[];
  files: FileInfo[];
  languages: Record<string, number>;
  
  // Architecture & Dependencies  
  dependencies: DependencyInfo;
  dependencyGraph: ArchitectureData;
  qualityMetrics: QualityMetrics;
  
  // Analysis results
  securityIssues: SecurityIssue[];
  technicalDebt: TechnicalDebt[];
  performanceMetrics: PerformanceMetric[];
  hotspots: Hotspot[];
  keyFunctions: KeyFunction[];
  apiEndpoints: APIEndpoint[];
  
  // AI-generated content
  aiSummary?: string;
  architectureAnalysis?: string;
  securityAnalysis?: string;
  
  // Metrics object that components expect
  metrics: {
    totalCommits: number;
    totalContributors: number;
    linesOfCode: number;
    codeQuality: number;
    testCoverage: number;
    busFactor: number;
    securityScore: number;
    technicalDebtScore: number;
    performanceScore: number;
    criticalVulnerabilities: number;
    highVulnerabilities: number;
    mediumVulnerabilities: number;
    lowVulnerabilities: number;
  };
  
  // Diagram-specific data
  dependencyWheelData?: Array<{ source: string; target: string; value: number }>;
  fileSystemTree?: FileNode;
  churnSunburstData?: ChurnNode;
  temporalCouplingData?: { nodes: any[]; links: any[] };
  contributorStreamData?: Array<{ date: string; contributors: Record<string, number> }>;
  dataTransformationSankey?: { nodes: any[]; links: any[] };
  featureFileMatrixData?: { features: string[]; files: string[]; matrix: number[][] };
  prLifecycleData?: { phases: PRPhase[]; totalDuration: number };
}


// --- Other miscellaneous types ---

export interface FunctionInfo {
  name: string;
  complexity: number;
  dependencies: string[];
  calls: string[];
  description?: string;
  startLine: number;
  endLine: number;
}

export interface RecentActivity {
  [date: string]: number;
}

export interface CommitDistribution {
  byDayOfWeek: number[];
  byHourOfDay: number[];
}

export interface LLMConfig {
  provider: 'openai' | 'claude' | 'gemini';
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
  name: string;
  createdAt: string;
  summary: string;
}
