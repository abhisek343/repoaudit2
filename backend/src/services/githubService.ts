import axios, { AxiosResponse } from 'axios';
import { Base64 } from 'js-base64';
import { Repository, Contributor, Commit, FileInfo, PullRequestData } from '../types';

// Define interfaces for raw GitHub API responses to type axios calls
interface RawGitHubRepository {
  name: string;
  full_name: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  watchers_count: number;
  created_at: string;
  updated_at: string;
  default_branch: string;
  size: number;
  open_issues_count: number;
  has_wiki: boolean;
  has_pages: boolean;
  license: {
    name: string;
    spdx_id: string;
  } | null;
}

// Forward declaration for types used in other interfaces below
interface GitHubFileResponse {
  filename: string;
  additions: number;
  deletions: number;
  changes: number;
  status: string;
  patch?: string;
}

interface RawGitHubCommitListItem { // For the list /repos/{owner}/{repo}/commits
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      email: string;
      date: string;
    } | null;
  };
  author: { // User object for the commit author
    login: string;
  } | null;
}

interface RawGitHubSingleCommit extends RawGitHubCommitListItem { // For /repos/{owner}/{repo}/commits/{commitSha}
  stats?: {
    additions: number;
    deletions: number;
    total: number;
  };
  files?: GitHubFileResponse[];
}

interface RawGitHubFileContent {
  content: string;
  encoding: string;
}

interface GitHubTreeItem { // Already defined at the bottom, but good to have it here for reference if needed
  path: string;
  type: 'blob' | 'tree';
  size?: number;
  sha: string; // Tree items also have sha
  url: string; // And URL
}

// NEW: Interface for GitHub Pull Request API response
interface RawGitHubPullRequest {
    id: number;
    title: string;
    user: {
        login: string;
    } | null;
    state: 'open' | 'closed';
    created_at: string;
    updated_at: string;
    closed_at: string | null;
    merged_at: string | null;
}


export class GitHubService {
  private baseURL = 'https://api.github.com';
  private token?: string;
  private owner: string = '';
  private repo: string = '';

  constructor(token?: string) {
    this.token = token;
  }

  private getHeaders() {
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
    };
    if (this.token) {
      headers['Authorization'] = `token ${this.token}`;
    }
    return headers;
  }

  public hasToken(): boolean {
    return !!this.token;
  }

  private handleGitHubError(error: unknown, context: string): never {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const message = error.response?.data?.message || error.message;
      const headers = error.response?.headers;

      let userFriendlyMessage = `GitHub API error while ${context} for ${this.owner}/${this.repo} (Status: ${status}): ${message}.`;
      
      // Add rate limit information if available
      if (headers && headers['x-ratelimit-limit'] && headers['x-ratelimit-remaining']) {
        const rateLimit = headers['x-ratelimit-limit'];
        const remaining = headers['x-ratelimit-remaining'];
        const resetTime = headers['x-ratelimit-reset'] ? new Date(parseInt(headers['x-ratelimit-reset']) * 1000) : null;
        
        userFriendlyMessage += `\nRate Limit: ${remaining}/${rateLimit} requests remaining.`;
        if (resetTime) {
          userFriendlyMessage += ` Resets at: ${resetTime.toLocaleString()}.`;
        }
      }

      switch (status) {
        case 403:
          if (message.includes('rate limit') || message.includes('API rate limit')) {
            if (this.token) {
              userFriendlyMessage =
                'GitHub API rate limit exceeded even with token. This usually means: ' +
                '1. Your token is invalid or expired\n' +
                '2. Your token lacks necessary scopes\n' +
                '3. The token has been revoked\n' +
                'Please check your token in Settings.';
            } else {
              userFriendlyMessage =
                'GitHub API rate limit exceeded. Please configure a valid GitHub Personal Access Token in Settings to increase your rate limit from 60 to 5,000 requests per hour.';
            }
          } else if (message.includes('Bad credentials')) {
            userFriendlyMessage =
              'Invalid GitHub Personal Access Token. Please check your token in Settings and ensure it has the correct permissions.';
          } else {
            userFriendlyMessage =
              `Access forbidden while ${context} for ${this.owner}/${this.repo}. ${this.token ? 'Your GitHub token may lack necessary permissions (e.g. repo scope for private repos).' : 'Please configure a GitHub Personal Access Token in Settings to access this repository or enhance rate limits.'}`;
          }
          break;
        case 404:
          userFriendlyMessage =
            `Repository ${this.owner}/${this.repo} not found. Please check the URL and ensure the repository exists and is accessible.`;
          break;
        case 401:
          userFriendlyMessage =
            'Authentication failed with GitHub. Please check your GitHub Personal Access Token in Settings.';
          break;
        case 422:
            userFriendlyMessage = `Invalid request to GitHub API while ${context} for ${this.owner}/${this.repo}. The repository might be empty or the request malformed.`;
            break;
        default:
          userFriendlyMessage = `GitHub API error (${status || 'Unknown'}) while ${context} for ${this.owner}/${this.repo}: ${message}. ${!this.token ? 'Consider adding a GitHub Personal Access Token in Settings for better reliability.' : ''}`;
      }
      throw new Error(userFriendlyMessage);
    }
    
    throw new Error(`Failed to ${context} for ${this.owner}/${this.repo}: ${error instanceof Error ? error.message : String(error)}`);
  }

  // New method to verify token validity
  async verifyToken(): Promise<boolean> {
    if (!this.token) return false;
    
    try {
      const response = await axios.get(`${this.baseURL}/user`, {
        headers: this.getHeaders()
      });
      return response.status === 200;
    } catch (error) {
      console.error('Token verification failed:', error);
      return false;
    }
  }

  async getRepository(owner: string, repo: string): Promise<Repository> {
    this.owner = owner; this.repo = repo;
    try {
      const response: AxiosResponse<RawGitHubRepository> = await axios.get(
        `${this.baseURL}/repos/${owner}/${repo}`,
        { headers: this.getHeaders() }
      );

      const data = response.data;
      return {
        name: data.name,
        fullName: data.full_name,
        description: data.description || '',
        language: data.language || 'Unknown',
        stars: data.stargazers_count,
        forks: data.forks_count,
        watchers: data.watchers_count,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        defaultBranch: data.default_branch,
        size: data.size,
        openIssues: data.open_issues_count,
        hasWiki: data.has_wiki,
        hasPages: data.has_pages,
        license: data.license ? {
          name: data.license.name,
          spdxId: data.license.spdx_id
        } : undefined
      };
    } catch (error) {
      this.handleGitHubError(error, 'fetching repository information');
    }
  }

  async getContributors(owner: string, repo: string): Promise<Contributor[]> {
    this.owner = owner; this.repo = repo;
    let allContributors: Contributor[] = [];
    let url: string | undefined = `${this.baseURL}/repos/${owner}/${repo}/contributors?per_page=100`;
    const MAX_CONTRIBUTORS_PAGES = 5; // Fetch up to 5 pages (500 contributors)
    let pagesFetched = 0;

    interface RawGitHubContributor {
      login: string;
      contributions: number;
      avatar_url: string;
      html_url: string; // Add html_url from GitHub API
      type: string;
    }

    try {
      while (url && pagesFetched < MAX_CONTRIBUTORS_PAGES) {
        const response: AxiosResponse<RawGitHubContributor[]> = await axios.get(url, { 
          headers: this.getHeaders(),
        });
        
        const contributorsOnPage: Contributor[] = response.data.map((c) => ({ 
          login: c.login,
          contributions: c.contributions,
          avatarUrl: c.avatar_url,
          html_url: c.html_url, // Map html_url
          type: c.type,
        }));
        
        allContributors = allContributors.concat(contributorsOnPage);
        pagesFetched++;

        const linkHeader: string | undefined = response.headers['link'];
        if (linkHeader) {
          const nextLink: string | undefined = linkHeader.split(',').find((s: string) => s.includes('rel="next"'));
          url = nextLink ? (nextLink.match(/<(.*?)>/) || [])[1] : undefined;
        } else {
          url = undefined;
        }
      }
      return allContributors;
    } catch (error) {
      this.handleGitHubError(error, 'fetching contributors');
    }
  }

  async getCommits(owner: string, repo: string, branchOrSha?: string, limit: number = 2000): Promise<Commit[]> {
    this.owner = owner; this.repo = repo;
    let allCommits: Commit[] = [];
    
    // initialParams will store the consistent parameters like 'sha'
    const initialParams: { sha?: string } = {};
    if (branchOrSha) {
        initialParams.sha = branchOrSha;
    }

    let url: string | undefined = `${this.baseURL}/repos/${owner}/${repo}/commits`;
    let commitsFetched = 0;

    try {
      while (url && commitsFetched < limit) {
        const currentPerPage = Math.min(100, limit - commitsFetched);
        
        // Construct parameters for the current request
        // Always include sha from initialParams if it was provided
        // And always set the per_page for the current request
        const requestParams: { per_page: number; sha?: string } = { 
            per_page: currentPerPage,
            ...initialParams // Spread initialParams to include 'sha' if present
        };
        
        // Make the GET request. Axios will correctly append params to the URL.
        // If 'url' is a full pagination URL from Link header, axios handles merging.
        const response: AxiosResponse<RawGitHubCommitListItem[]> = await axios.get(url, { 
          headers: this.getHeaders(),
          params: requestParams, 
        });
      
        const commitsOnPage: Commit[] = response.data.map((c) => ({ 
          sha: c.sha,
          message: c.commit.message,
          author: { 
            name: c.commit.author?.name || c.author?.login || 'N/A',
            email: c.commit.author?.email || 'N/A',
            date: c.commit.author?.date || new Date().toISOString()
          },
          // Note: Detailed stats and files per commit are fetched by getCommitDetails
        }));
        
        allCommits = allCommits.concat(commitsOnPage);
        commitsFetched += commitsOnPage.length;

        if (commitsFetched >= limit) break; // Respect the limit

        const linkHeader: string | undefined = response.headers['link'];
        if (linkHeader) {
          const nextLink: string | undefined = linkHeader.split(',').find((s: string) => s.includes('rel="next"'));
          url = nextLink ? (nextLink.match(/<(.*?)>/) || [])[1] : undefined;
        } else {
          url = undefined;
        }
      }
    return allCommits;
    } catch (error) {
      this.handleGitHubError(error, 'fetching commits');
    }
  }

  async getCommitDetails(owner: string, repo: string, commitSha: string): Promise<Commit> {
    this.owner = owner; this.repo = repo;
    try {
      const response: AxiosResponse<RawGitHubSingleCommit> = await axios.get( 
        `${this.baseURL}/repos/${owner}/${repo}/commits/${commitSha}`,
        { headers: this.getHeaders() }
      );
      const data = response.data;
      return {
        sha: data.sha,
        message: data.commit.message,
        author: {
          name: data.commit.author?.name || data.author?.login || 'N/A',
          email: data.commit.author?.email || 'N/A',
          date: data.commit.author?.date || new Date().toISOString(),
        },
        stats: data.stats,
        files: data.files?.map((file: GitHubFileResponse) => ({
          filename: file.filename,
          additions: file.additions,
          deletions: file.deletions,
          changes: file.changes,
          status: file.status,
          patch: file.patch,
        })) || [],
      };
    } catch (error) {
      this.handleGitHubError(error, `fetching commit details for ${commitSha}`);
    }
  }

  async getLanguages(owner: string, repo: string): Promise<Record<string, number>> {
    this.owner = owner; this.repo = repo;
    try {
      const response = await axios.get(
        `${this.baseURL}/repos/${owner}/${repo}/languages`,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      console.warn(`Warning: Could not fetch languages for ${owner}/${repo}: ${error instanceof Error ? error.message : String(error)}`);
      return {}; 
    }
  }

  async getFileContent(owner: string, repo: string, filePath: string): Promise<string> {
    this.owner = owner; this.repo = repo;
    if (filePath.match(/\.(png|jpg|gif|svg|pdf|zip|tar|gz)$/i)) return '';
    try {
      const response: AxiosResponse<RawGitHubFileContent> = await axios.get( 
        `${this.baseURL}/repos/${owner}/${repo}/contents/${filePath}`,
        { headers: this.getHeaders() }
      );
      if (response.data && typeof response.data.content === 'string') {
        return Base64.decode(response.data.content);
      }
      return ''; 
    } catch (error) {
      throw this.handleGitHubError(error, `fetch file content for ${owner}/${repo}/${filePath}`);
    }
  }

  async getRepoTree(owner: string, repo: string, branch: string): Promise<FileInfo[]> {
    this.owner = owner; this.repo = repo;
    try {
      const response: AxiosResponse<{ tree: GitHubTreeItem[] }> = await axios.get( 
        `${this.baseURL}/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
        { headers: this.getHeaders() }
      );
      return response.data.tree
        .filter(item => item.type === 'blob' || item.type === 'tree') 
        .map(item => ({ 
            name: item.path.split('/').pop() || item.path, 
            path: item.path, 
            size: item.size || 0, 
            type: item.type === 'blob' ? 'file' : 'dir' 
        } as FileInfo)); 
    } catch (error) {
      this.handleGitHubError(error, `fetch repository tree for ${owner}/${repo}`);
    }
    return [];
  }

  async getDirectoryContents(owner: string, repo: string, path: string = ''): Promise<FileInfo[]> {
    this.owner = owner; this.repo = repo;
    try {
      interface RawGitHubContentItem { 
        name: string;
        path: string;
        sha: string;
        size: number;
        type: 'file' | 'dir' | 'symlink' | 'submodule' | string;
      }
      const response: AxiosResponse<RawGitHubContentItem[]> = await axios.get( 
        `${this.baseURL}/repos/${owner}/${repo}/contents/${path}`,
        { headers: this.getHeaders() }
      );

      if (Array.isArray(response.data)) {
        return response.data
          .filter(item => item.type === 'file' || item.type === 'dir') 
          .map(item => ({
            name: item.name,
            path: item.path,
            size: item.size || 0,
            type: item.type as 'file' | 'dir' | 'symlink' 
          } as FileInfo));
      }
      return [];
    } catch (error) {
      console.warn(`Warning: Could not fetch directory contents for ${path} in ${owner}/${repo}: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  parseGitHubUrl(url: string): { owner: string; repo: string } | null {
    const regex = /github\.com\/([^/]+)\/([^/]+)/;
    const match = url.match(regex);
    
    if (match) {
      return {
        owner: match[1],
        repo: match[2].replace(/\.git$/, '')
      };
    }
    return null;
  }

  async streamAnalysis(repoUrl: string) {
    const eventStream = new EventSource(`/api/analyze?repo=${encodeURIComponent(repoUrl)}`);
    
    return new ReadableStream({
      start(controller) {
        eventStream.onmessage = (event) => {
          const data = JSON.parse(event.data);
          
          if (data.type === 'progress') {
            controller.enqueue(data);
          }
          
          if (data.type === 'complete') {
            controller.close();
            eventStream.close();
          }
        };
        
        eventStream.onerror = () => {
          controller.error(new Error('SSE stream failed'));
          eventStream.close();
        };
      },
      cancel() {
        eventStream.close();
      }
    });
  }

  // ADDED: Method to fetch pull requests for the Gantt chart
  async getPullRequests(owner: string, repo: string): Promise<PullRequestData[]> {
    this.owner = owner;
    this.repo = repo;
    try {
      const response = await axios.get<RawGitHubPullRequest[]>(
        `${this.baseURL}/repos/${owner}/${repo}/pulls`,
        {
          params: { state: 'all', per_page: 100, sort: 'created', direction: 'desc' },
          headers: this.getHeaders(),
        }
      );
      return response.data.map(pr => {
        let state: 'open' | 'closed' | 'merged' = pr.state;
        if (pr.merged_at) {
          state = 'merged';
        }

        return {
          id: pr.id,
          title: pr.title,
          author: pr.user?.login || 'unknown',
          state: state,
          createdAt: pr.created_at,
          closedAt: pr.closed_at,
          mergedAt: pr.merged_at,
        };
      });
    } catch (error) {
      this.handleGitHubError(error, 'fetching pull requests');
    }
  }
}

// GitHub API Types (ensure these are not duplicated if defined elsewhere globally)
// interface GitHubFileResponse { // Already defined above
//   filename: string;
//   additions: number;
//   deletions: number;
//   changes: number;
//   status: string;
//   patch?: string;
// }

// interface GitHubTreeItem { // Already defined above
//   path: string;
//   type: 'blob' | 'tree';
//   size?: number;
// }
