import { ContributorStats } from '../types/contributor';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function getGitContributors(period: string): Promise<any[]> {
  try {
    console.log('Starting getGitContributors for period:', period);
    const since = new Date();
    switch (period) {
      case 'week':
        since.setDate(since.getDate() - 7);
        break;
      case 'month':
        since.setMonth(since.getMonth() - 1);
        break;
      case 'year':
        since.setFullYear(since.getFullYear() - 1);
        break;
      default:
        since.setMonth(since.getMonth() - 1);
    }

    const sinceStr = since.toISOString();
    console.log('Fetching commits since:', sinceStr);
    
    // Check if we're in a git repository
    try {
      const { stdout: gitCheck } = await execAsync('git rev-parse --is-inside-work-tree');
      console.log('Git repository check:', gitCheck.trim());
    } catch (error) {
      console.error('Not in a git repository:', error);
      return [];
    }

    // Get commit statistics with error handling
    let commitStats = '';
    try {
      const gitCommand = `git log --since="${sinceStr}" --pretty=format:"%an|%ae|%h|%at" --numstat`;
      console.log('Executing git command:', gitCommand);
      const { stdout } = await execAsync(gitCommand);
      commitStats = stdout;
      console.log('Git log output length:', commitStats.length);
      console.log('First few lines of git log:', commitStats.split('\n').slice(0, 3));
    } catch (error) {
      console.error('Error getting commit stats:', error);
      return [];
    }

    // Get contributor details with error handling
    let contributorDetails = '';
    try {
      const gitCommand = `git log --since="${sinceStr}" --pretty=format:"%an|%ae|%at" | sort | uniq -c | sort -nr`;
      console.log('Executing git command:', gitCommand);
      const { stdout } = await execAsync(gitCommand);
      contributorDetails = stdout;
      console.log('Contributor details length:', contributorDetails.length);
      console.log('First few lines of contributor details:', contributorDetails.split('\n').slice(0, 3));
    } catch (error) {
      console.error('Error getting contributor details:', error);
      return [];
    }

    const parsedData = parseGitOutput(commitStats, contributorDetails);
    console.log('Parsed contributors:', parsedData);
    return parsedData;
  } catch (error) {
    console.error('Error in getGitContributors:', error);
    return [];
  }
}

function parseGitOutput(commitStats: string, contributorDetails: string): any[] {
  try {
    console.log('Starting parseGitOutput');
    const contributors = new Map();
    
    // Parse commit statistics
    const commits = commitStats.split('\n');
    console.log('Total commit lines:', commits.length);
    let currentAuthor = '';
    let lastCommitTime = 0;
    
    commits.forEach((line, index) => {
      if (line.includes('|')) {
        const [name, email, hash, timestamp] = line.split('|');
        currentAuthor = email;
        lastCommitTime = parseInt(timestamp) * 1000; // Convert to milliseconds
        if (!contributors.has(email)) {
          contributors.set(email, {
            name,
            email,
            commits: 0,
            additions: 0,
            deletions: 0,
            byFileType: {},
            lastCommitTime: 0,
          });
        }
        const contributor = contributors.get(email);
        contributor.commits++;
        contributor.lastCommitTime = Math.max(contributor.lastCommitTime, lastCommitTime);
      } else if (line.trim() && currentAuthor) {
        const [additions, deletions, file] = line.split('\t');
        if (additions && deletions) {
          const contributor = contributors.get(currentAuthor);
          contributor.additions += parseInt(additions) || 0;
          contributor.deletions += parseInt(deletions) || 0;
          
          const fileType = file.split('.').pop() || 'unknown';
          contributor.byFileType[fileType] = (contributor.byFileType[fileType] || 0) + 1;
        }
      }
    });

    const result = Array.from(contributors.values());
    console.log('Parsed contributors count:', result.length);
    console.log('Sample contributor data:', result[0]);
    return result;
  } catch (error) {
    console.error('Error parsing git output:', error);
    return [];
  }
}

export async function getContributorStats(period: 'week' | 'month' | 'year' = 'month'): Promise<ContributorStats> {
  try {
    console.log('Starting getContributorStats for period:', period);
    const contributors = await getGitContributors(period);
    console.log('Retrieved contributors:', contributors.length);
    
    if (contributors.length === 0) {
      console.log('No contributors found, returning empty stats');
      return {
        topContributors: [],
        totalCommits: 0,
        totalContributors: 0,
        period: {
          start: new Date().toISOString(),
          end: new Date().toISOString(),
        },
      };
    }
    
    // Sort contributors by total commits
    const sortedContributors = contributors
      .sort((a, b) => b.commits - a.commits)
      .slice(0, 10)
      .map(contributor => ({
        ...contributor,
        id: contributor.email,
        avatarUrl: `https://www.gravatar.com/avatar/${Buffer.from(contributor.email).toString('hex')}?d=identicon`,
        recentActivity: {
          commits: contributor.commits,
          pullRequests: 0,
          issues: 0,
          reviews: 0,
          lastActive: new Date(contributor.lastCommitTime).toISOString(),
        },
        totalContributions: contributor.commits,
        joinDate: new Date(contributor.lastCommitTime).toISOString(),
      }));

    console.log('Processed top contributors:', sortedContributors.length);
    const result = {
      topContributors: sortedContributors,
      totalCommits: contributors.reduce((sum, c) => sum + c.commits, 0),
      totalContributors: contributors.length,
      period: {
        start: new Date().toISOString(),
        end: new Date().toISOString(),
      },
    };
    console.log('Final stats result:', result);
    return result;
  } catch (error) {
    console.error('Error getting contributor stats:', error);
    throw error;
  }
}

export async function getContributorDetails(contributorId: string): Promise<any> {
  throw new Error('Not implemented');
} 