import { AdvancedAnalysisResult } from './advanced';

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

export interface AnalysisResult {
  id: string;
  basicInfo: {
    fullName: string;
    description?: string;
    language?: string;
    stars?: number;
    forks?: number;
    createdAt: string;
    updatedAt: string;
    defaultBranch?: string;
  };
  metrics: {
    linesOfCode: number;
    totalCommits: number;
    totalContributors: number;
    fileCount?: number;
    criticalVulnerabilities?: number;
    highVulnerabilities?: number;
    mediumVulnerabilities?: number;
    lowVulnerabilities?: number;
  };
  commits: Array<Commit>;
  files: FileInfo[];
  dependencies?: {
    nodes: { id: string; [key: string]: string | number | undefined }[];
    links: { source: string; target: string; [key: string]: string | number | undefined }[];
  };
  contributors?: Contributor[];
  hotspots?: { file: string, path: string, complexity: number, changes: number, riskLevel: string, explanation: string }[];
  architectureAnalysis?: string;
  securityIssues?: SecurityIssue[];
  aiSummary?: string;
  createdAt: string;
  repositoryUrl?: string;
  advancedAnalysis?: AdvancedAnalysisResult;
}

export interface FileInfo {
  name: string;
  path: string;
  size: number;
  content?: string;
  complexity?: number;
  dependencies?: string[];
  contributors?: string[];
  commitCount?: number;
  type?: string;
  language?: string;
  testCoverage?: number;
  lastModified?: string;
  primaryAuthor?: string;
  functions?: { name: string, complexity: number }[];
}

export interface Contributor {
  login: string;
  id: number;
  contributions: number;
  avatarUrl: string;
}

export interface Commit {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      email: string;
      date: string;
    };
  };
  author: {
    login: string;
    id: number;
  };
}

export interface SecurityIssue {
  id: string;
  severity: string;
  description: string;
  [key: string]: unknown;
}

export interface Repository {
  id: number;
  name: string;
  full_name: string;
  [key: string]: unknown;
}
