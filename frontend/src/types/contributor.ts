// This file defines detailed contributor statistics, primarily for the ContributorStats component.
// The main Contributor type used in AnalysisResult is in src/types/index.ts.

export interface CommitDistribution {
  additions: number;
  deletions: number;
  total: number; // Total commits by this contributor in the period
  byFileType: {
    [key: string]: number; // e.g., { ".ts": 10, ".md": 5 }
  };
}

export interface RecentActivity {
  commits: number;
  pullRequests: number; // Number of PRs opened/merged
  issues: number;      // Number of issues opened/commented
  reviews: number;     // Number of PR reviews submitted
  lastActive: string;  // ISO date string of last activity
}

export interface ContributorDetail { // Renamed to avoid conflict with core Contributor type
  id: string; // GitHub user ID or login
  name: string;
  avatarUrl: string;
  email?: string; // Might not always be available
  commitDistribution: CommitDistribution;
  recentActivity: RecentActivity;
  totalContributions: number; // Overall contributions to the repo (from GitHub API)
  joinDate?: string; // Date of first contribution to this repo
  // Potentially more detailed stats could go here
}

export interface ContributorStats {
  topContributors: ContributorDetail[]; // Use the detailed type here
  totalCommitsInPeriod: number; // Total commits in the selected period by all contributors
  totalContributorsInPeriod: number; // Unique contributors active in the period
  period: {
    start: string; // ISO date string
    end: string;   // ISO date string
  };
}
