import { 
  AdvancedAnalysisResult, 
  TemporalCoupling, 
  SankeyData, 
  FeatureFileMatrixItem, 
  PullRequestData, 
  GitGraphData 
} from './advanced';
// Re-export important types from advanced module
export type { 
  TemporalCoupling, 
  SankeyData, 
  SankeyNode, 
  SankeyLink,
  FeatureFileMatrixItem, 
  PullRequestData, 
  GitGraphData, 
  GitGraphNode, 
  GitGraphLink,
  FileNode,
  ChurnNode
} from './advanced';

export interface Contributor {
    login: string;
    id?: number;
    node_id?: string;
    avatar_url?: string; // Keep as optional for potential raw GitHub data
    avatarUrl: string;   // Make this the primary, required field
    html_url?: string;
    name?: string | null;
    email?: string | null;
    contributions: number; // Make contributions required
    // Add other fields that might be expected by RepositoryData.owner or AnalysisResult.contributors
}

export interface LLMConfig {
  provider: string;
  apiKey: string;
  model?: string;
}

export interface ReportCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  features: string[];
  requiredPlan: string;
}

export interface SavedReport {
  id: string;
  repositoryName: string;
  category: string;
  createdAt: string;
  summary: string;
  tags: string[];
  isPublic: boolean;
  userId: string;
  repositoryUrl: string;
  lastAccessed: string;
}

export interface BasicRepositoryInfo {
  name?: string;
  fullName: string;
  description?: string | null;
  stars?: number;
  forks?: number;
  watchers?: number;
  language?: string | null;
  url?: string;
  owner?: string;
  createdAt: string;
  updatedAt: string;
  defaultBranch?: string;
  size?: number;
  openIssues?: number;
  hasWiki?: boolean;
  hasPages?: boolean;
}

export interface AnalysisWarning {
  step: string;
  message: string;
  error?: string;
}

// Define more specific types to replace 'any' where possible
export interface FileInfo {
  path: string;
  name: string;
  type: 'file' | 'dir'; // Example, adjust as needed
  size: number;
  content?: string;
  language?: string;
  dependencies?: string[];
  complexity?: number;
  functions?: FunctionInfo[];
  lastModified?: string;
  contributors?: string[]; // Added
  commitCount?: number; // Added
  testCoverage?: number; // Added
  primaryAuthor?: string; // Added
  // Add other relevant fields
}

// Corresponds to backend/src/types/index.ts FunctionParameter
export interface FunctionParameter {
  name: string;
  type?: string;
  optional?: boolean;
  initializer?: string;
}

// Updated to match backend/src/types/index.ts FunctionInfo
export interface FunctionInfo {
  name: string;
  startLine?: number; // Keep optional as some simple frontend displays might not need it
  endLine?: number;   // Keep optional
  parameters?: FunctionParameter[]; // Updated from string[]
  returnType?: string;
  cyclomaticComplexity?: number;
  sloc?: number;
  calls?: string[];
  description?: string;
  isAsync?: boolean;
  visibility?: 'public' | 'private' | 'protected';
  content?: string; // Raw content of the function body
  // Note: 'dependencies' was in the old frontend FunctionInfo, but not in the new backend one.
  // If it's still needed for a specific frontend use case, it should be added to backend parsing or handled differently.
  // For now, aligning with backend, so 'dependencies' is removed from here.
}

export interface ProcessedCommit {
  sha: string;
  author: string;
  date: string;
  message: string;
  stats?: { additions: number; deletions: number; total: number };
  files?: Array<{ filename: string; status: string; additions: number; deletions: number; changes: number }>;

}

export interface DependencyNode {
  id: string;
  name: string;
  type?: string;
  path?: string;
  // Add other relevant fields
}

export interface DependencyLink {
  source: string;
  target: string;
  // Add other relevant fields
}

export interface ArchitectureData {
  nodes: DependencyNode[];
  links: DependencyLink[];
}

export interface QualityMetricDetails {
  complexity: number;
  maintainability: number;
  linesOfCode: number;
}

export interface QualityMetrics {
  [filePath: string]: QualityMetricDetails;
}

export interface SecurityIssue {
  type: string; // e.g., 'secret', 'vulnerability'
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  file: string;
  line?: number;
  description: string;
  recommendation?: string;
  cwe?: string;
  codeSnippet?: string;
}

export interface TechnicalDebtItem {
  type: string; // e.g., 'smell', 'complexity', 'duplication'
  severity: 'critical' | 'high' | 'medium' | 'low';
  file: string;
  line?: number;
  description: string;
  effort?: string; // e.g., '1h', '2d'
  impact?: string;
  recommendation?: string;
}

export interface PerformanceMetric {
  function: string;
  file: string;
  complexity?: string; // e.g., 'O(n^2)'
  estimatedRuntime?: string;
  recommendation?: string;
}

export interface APIEndpointParameter {
  name: string;
  type: string;
  in: 'query' | 'path' | 'body' | 'header';
}

export interface APIEndpointResponse {
  statusCode: string;
  description: string;
  schema?: Record<string, unknown>; // Or a more defined schema type
}

export interface APIEndpoint {
  method: string;
  path: string;
  file: string;
  handlerFunction?: string;
  parameters?: APIEndpointParameter[];
  responses?: APIEndpointResponse[];
  documentation?: string;
  security?: string[];
}

export interface Hotspot {
  file: string;
  path: string;
  complexity: number;
  changes: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  explanation?: string;
  size?: number;
  primaryContributors?: string[];
}

export interface KeyFunction {
  name: string;
  file: string;
  complexity?: number;
  explanation?: string;
  parameters?: FunctionParameter[];
  returnType?: string;
  sloc?: number;
  calls?: string[];
  isAsync?: boolean;
  visibility?: 'public' | 'private' | 'protected';
  content?: string; // For showing source code, optional
  startLine?: number; // From FunctionInfo
  endLine?: number;   // From FunctionInfo
}

export interface RepositoryData { // For the 'repository' field in AnalysisResult
  id: number;
  node_id: string;
  name: string;
  full_name: string;
  private: boolean;
  owner: Contributor; // Assuming Contributor type can represent owner info
  html_url: string;
  description: string | null;
  fork: boolean;
  url: string;
  // Add other fields from GitHub API as needed
  languages_url: string;
  default_branch: string;
  stargazers_count: number;
  watchers_count: number;
  forks_count: number;
  open_issues_count: number;
  created_at: string;
  updated_at: string;
  pushed_at: string;
  size: number;
  // ... and many more
}

export interface AnalysisResult {
  id: string;
  repositoryUrl: string;
  createdAt: string;
  basicInfo: BasicRepositoryInfo;  metrics: {
    linesOfCode: number;
    totalCommits: number;
    totalContributors: number;
    fileCount: number;
    analyzableFileCount?: number; // New: Count of source files that were analyzed
    codeQuality?: number;
    testCoverage?: number;
    busFactor?: number;
    securityScore?: number;
    technicalDebtScore?: number;
    performanceScore?: number;
    criticalVulnerabilities: number;
    highVulnerabilities: number;
    mediumVulnerabilities: number;
    lowVulnerabilities: number;
    avgComplexity?: number; // New: Average file complexity
    filesWithComplexity?: number; // New: Count of files with complexity analysis
  };
  aiSummary?: string;
  advancedAnalysis?: AdvancedAnalysisResult; // Use the imported type
  files?: FileInfo[];
  dependencies?: ArchitectureData; // Using ArchitectureData for nodes/links structure
  commits?: ProcessedCommit[];
  contributors?: Contributor[];
  hotspots?: Hotspot[];
  securityIssues?: SecurityIssue[];
  technicalDebt?: TechnicalDebtItem[];
  performanceMetrics?: PerformanceMetric[];
  keyFunctions?: KeyFunction[];
  apiEndpoints?: APIEndpoint[];
  languages?: Record<string, number>;  dependencyGraph?: ArchitectureData;
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
    packageDependencyGraph: { nodes: unknown[]; links: unknown[] }; // External package dependencies
    vulnerabilityDistribution: Array<{ severity: string; count: number; color: string }>;
  };
  qualityMetrics?: QualityMetrics;  repository?: RepositoryData; // Using the defined RepositoryData type
  architectureAnalysis?: string;
  systemArchitecture?: SystemArchitecture; // System architecture analysis with Mermaid diagram
  analysisWarnings?: AnalysisWarning[];
  // Diagram-specific data structures
  dependencyWheelData?: Array<{ source: string; target: string; value: number }>; // Define specific type
  fileSystemTree?: import('./advanced').FileNode; // Define specific type (e.g., FileNode from advanced)
  churnSunburstData?: import('./advanced').ChurnNode; // Define specific type (e.g., ChurnNode from advanced)
  contributorStreamData?: Array<{ date: string; contributors: Record<string, number> }>; // Define specific type
  // ADDED: Data for new advanced diagrams
  temporalCouplings?: TemporalCoupling[];
  transformationFlows?: SankeyData;
  featureFileMatrix?: FeatureFileMatrixItem[];
  pullRequests?: PullRequestData[];
  gitGraph?: GitGraphData;
  analysisMethod?: 'archive' | 'individual'; // Method used for file analysis
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
