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

export interface Contributor {
  id: string;
  name: string;
  avatarUrl: string;
  email: string;
  commitDistribution: CommitDistribution;
  recentActivity: RecentActivity;
  totalContributions: number;
  joinDate: string;
}

export interface ContributorStats {
  topContributors: Contributor[];
  totalCommits: number;
  totalContributors: number;
  period: {
    start: string;
    end: string;
  };
} 