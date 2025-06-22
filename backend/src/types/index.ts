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

export interface RecentActivity {
  commits: number;
  pullRequests: number;
  reviews: number;
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

export interface LLMConfig {
  provider: 'openai' | 'gemini' | 'claude';
  apiKey: string;
  model?: string;
}

export interface FunctionParameter {
  name: string;
  type: string;
  optional: boolean;
  initializer?: string;
}

export interface FunctionInfo {
  name: string;
  startLine: number;
  endLine: number;
  sloc?: number;
  cyclomaticComplexity?: number;
  parameters?: FunctionParameter[];
  returnType?: string;
  isAsync?: boolean;
  visibility?: 'public' | 'private' | 'protected';
  description?: string;
  content?: string;
  calls?: string[];
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
  file: string; // Path to the file
  path?: string; // Redundant if file is full path, but kept for now if used elsewhere
  complexity: number; // Keep as number, default to 0 if undefined from source
  explanation: string;
  linesOfCode?: number; // This is SLOC from FunctionInfo
  // Add new fields from FunctionInfo
  parameters?: FunctionParameter[];
  returnType?: string;
  calls?: string[];
  isAsync?: boolean;
  visibility?: 'public' | 'private' | 'protected';
  content?: string; // For showing source code
  startLine?: number;
  endLine?: number;
  // performance?: { estimatedRuntime: string; complexity: string; }; // Can be added later
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
  icon: string;
}

// NEW: Data structures for advanced diagrams
export interface TemporalCoupling {
  source: string;
  target: string;
  weight: number;
}

export interface SankeyNode {
  id: string;
}

export interface SankeyLink {
  source: string;
  target: string;
  value: number;
}

export interface SankeyData {
  nodes: SankeyNode[];
  links: SankeyLink[];
}

export interface GitGraphNode {
  id: string;
  message: string;
  author: string;
  date: string;
  parents: string[];
}

export interface GitGraphLink {
  source: string;
  target: string;
}

export interface GitGraphData {
  nodes: GitGraphNode[];
  links: GitGraphLink[];
}

export interface PullRequestData {
  id: number;
  title: string;
  author: string;
  state: 'open' | 'closed' | 'merged';
  createdAt: string;
  closedAt?: string | null;
  mergedAt?: string | null;
}

// Analysis warning structure for error reporting
export interface AnalysisWarning {
  step: string;
  message: string;
  error?: string;
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
  dependencyMetrics?: {
    totalDependencies: number;
    devDependencies: number;
    outdatedPackages: number;
    vulnerablePackages: number;
    criticalVulnerabilities: number;
    highVulnerabilities: number;
    mediumVulnerabilities: number;
    lowVulnerabilities: number;
    lastScan: string;
    dependencyScore: number;
    dependencyGraph: { nodes: any[]; links: any[] };
    vulnerabilityDistribution: Array<{ severity: string; count: number; color: string }>;
  };
  qualityMetrics: QualityMetrics;
  
  // Analysis results
  securityIssues: SecurityIssue[];
  technicalDebt: TechnicalDebt[];
  performanceMetrics: PerformanceMetric[];
  hotspots: Hotspot[];
  keyFunctions: KeyFunction[];
  apiEndpoints: APIEndpoint[];  // AI-generated content
  aiSummary?: string;
  architectureAnalysis?: string;
  systemArchitecture?: SystemArchitecture; // System architecture analysis with Mermaid diagram
  analysisMethod?: 'archive' | 'individual'; // Method used for file analysis
  // Summary metrics
  metrics: {
    totalCommits: number;
    totalContributors: number;
    fileCount: number;
    analyzableFileCount?: number; // New: Count of source files that were analyzed
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
    totalPRs: number;
    mergedPRs: number;
    prMergeRate: number;
    avgPRMergeTime: number;
    recentActivity: number; // Commits in last 30 days
    avgCommitsPerWeek: number; // Average commits per week
    avgComplexity?: number; // New: Average file complexity
    filesWithComplexity?: number; // New: Count of files with complexity analysis
  };
  analysisWarnings?: AnalysisWarning[];
  
  // Data for existing diagrams
  dependencyWheelData?: Array<{ source: string; target: string; value: number }>;
  fileSystemTree?: FileNode;
  churnSunburstData?: ChurnNode;
  contributorStreamData?: Array<{ date: string; contributors: Record<string, number> }>;
  // ADDED: Data for new advanced diagrams
  temporalCoupling?: TemporalCoupling[];
  dataTransformation?: SankeyData;
  pullRequests?: PullRequestData[];
  gitGraph?: GitGraphData;
  featureFileMatrix?: FeatureFileMatrixItem[];
}

// ADD these interfaces for archive download configuration
export interface ArchiveDownloadConfig {
  enabled: boolean;
  timeoutMs: number;
  maxSizeMB: number;
  fallbackToApi: boolean;
}

// --- System Architecture Analysis Types ---

export interface ArchitectureComponent {
  id: string;
  name: string;
  type: 'frontend' | 'backend' | 'database' | 'service' | 'api' | 'middleware' | 'config' | 'test' | 'util';
  path: string;
  dependencies: string[];
  files: string[];
  complexity: number;
  description?: string;
}

export interface ArchitectureLayer {
  name: string;
  type: 'presentation' | 'business' | 'data' | 'infrastructure';
  components: ArchitectureComponent[];
}

export interface SystemArchitecture {
  layers: ArchitectureLayer[];
  components: ArchitectureComponent[];
  dependencies: Array<{ from: string; to: string; type: string }>;
  mermaidDiagram: string;
  patterns: string[];
  summary: string;
}

export interface FeatureFileMatrixItem {
  feature: string;
  file: string;
  relationship: 'implements' | 'tests' | 'configures' | 'documents';
  strength: number;
}
