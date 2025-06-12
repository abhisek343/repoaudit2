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
    [key: string]: unknown;
  };
  commits: Array<Commit>;
  aiSummary?: string;
  createdAt: string;
  repositoryUrl?: string;
  [key: string]: unknown;
}

export interface FileInfo {
  path: string;
  content?: string;
  [key: string]: unknown;
}

export interface Contributor {
  login: string;
  id: number;
  contributions: number;
  [key: string]: unknown;
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
    [key: string]: unknown;
  };
  author?: {
    login: string;
    id: number;
  [key: string]: unknown;
  };
    [key: string]: unknown;
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
