// This file can be used to define more specific contributor-related types if needed,
// but the main Contributor type used by AnalysisResult should be in index.ts for consistency.

// Example: If ContributorDetail from here is distinct and needed elsewhere, it can stay.
// Otherwise, consider merging its relevant fields into a comprehensive Contributor type in index.ts.

export interface CommitDistribution {
  additions: number;
  deletions: number;
  total: number;
  byFileType: {
    [key: string]: number;
  };
}

export interface RecentActivity {
  commits: number;
  pullRequests: number;
  issues: number;
  reviews: number;
  lastActive: string;
}

// This ContributorDetail might be used for specific views like a contributor stats page.
// The core AnalysisResult.contributors array might use a simpler Contributor type defined in index.ts.
export interface ContributorDetail {
  id: string;
  name: string;
  avatarUrl: string;
  email?: string;
  commitDistribution: CommitDistribution;
  recentActivity: RecentActivity;
  totalContributions: number;
  joinDate?: string;
}

export interface ContributorStats {
  topContributors: ContributorDetail[];
  totalCommitsInPeriod: number;
  totalContributorsInPeriod: number;
  period: {
    start: string;
    end: string;
  };
}

// The Contributor type is defined and exported from frontend/src/types/index.ts
