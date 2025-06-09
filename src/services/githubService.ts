import axios from 'axios';
import { Base64 } from 'js-base64';
import { Repository, Contributor, Commit, FileInfo } from '../types';

export class GitHubService {
  private baseURL = 'https://api.github.com';
  private token?: string;

  constructor(token?: string) {
    this.token = token;
  }

  private getHeaders() {
    return {
      'Accept': 'application/vnd.github.v3+json',
      ...(this.token && { 'Authorization': `token ${this.token}` })
    };
  }

  private handleGitHubError(error: unknown, context: string): never {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const message = error.response?.data?.message || error.message;

      switch (status) {
        case 403:
          if (message.includes('rate limit') || message.includes('API rate limit')) {
            throw new Error(
              'GitHub API rate limit exceeded. Please configure a GitHub Personal Access Token in Settings to increase your rate limit from 60 to 5,000 requests per hour.'
            );
          } else if (message.includes('Bad credentials')) {
            throw new Error(
              'Invalid GitHub Personal Access Token. Please check your token in Settings and ensure it has the correct permissions.'
            );
          } else {
            throw new Error(
              `Access forbidden. ${this.token ? 'Your GitHub token may lack necessary permissions.' : 'Please configure a GitHub Personal Access Token in Settings to access this repository.'}`
            );
          }
        case 404:
          throw new Error(
            'Repository not found. Please check the URL and ensure the repository exists and is accessible.'
          );
        case 401:
          throw new Error(
            'Authentication failed. Please check your GitHub Personal Access Token in Settings.'
          );
        case 422:
          throw new Error(
            'Invalid request. Please check the repository URL format.'
          );
        default:
          throw new Error(
            `GitHub API error (${status}): ${message}. ${!this.token ? 'Consider adding a GitHub Personal Access Token in Settings for better reliability.' : ''}`
          );
      }
    }
    
    throw new Error(`Failed to ${context}: ${error instanceof Error ? error.message : String(error)}`);
  }

  async getRepository(owner: string, repo: string): Promise<Repository> {
    try {
      const response = await axios.get(
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
      this.handleGitHubError(error, 'fetch repository information');
    }
  }

  async getContributors(owner: string, repo: string): Promise<Contributor[]> {
    let allContributors: Contributor[] = [];
    let url = `${this.baseURL}/repos/${owner}/${repo}/contributors`;
    let page = 1;

    try {
      while (url) {
        const response = await axios.get(url, {
          headers: this.getHeaders(),
          params: page === 1 ? { per_page: 100, page: page } : undefined,
        });

        // Define a more specific type for the raw contributor data from GitHub API
        interface RawGitHubContributor {
          login: string;
          contributions: number;
          avatar_url: string;
          type: string;
          id: number; // example of another property that might exist
          node_id: string;
          gravatar_id: string;
          url: string;
          html_url: string;
          followers_url: string;
          following_url: string;
          gists_url: string;
          starred_url: string;
          subscriptions_url: string;
          organizations_url: string;
          repos_url: string;
          events_url: string;
          received_events_url: string;
          site_admin: boolean;
        }

        const responseData = response.data as RawGitHubContributor[];

        const contributorsOnPage: Contributor[] = responseData.map((contributor: RawGitHubContributor) => ({
          login: contributor.login,
          contributions: contributor.contributions,
          avatarUrl: contributor.avatar_url,
          type: contributor.type,
        }));
        
        allContributors = allContributors.concat(contributorsOnPage);

        // Check for pagination link
        const linkHeader = response.headers['link'];
        if (linkHeader) {
          const nextLink = linkHeader.split(',').find((s: string) => s.includes('rel="next"'));
          if (nextLink) {
            url = (nextLink.match(/<(.*?)>/) || [])[1] || '';
            page++; // Increment page for the next direct request if URL parsing fails (fallback)
          } else {
            url = ''; // No next page
          }
        } else {
          // If no link header, assume it's the last page (or only page)
          if (contributorsOnPage.length < 100 && page === 1 && allContributors.length === contributorsOnPage.length) {
            // This was likely the only page and had less than 100 results.
          } else if (contributorsOnPage.length === 0 && page > 1) {
            // No more contributors on subsequent pages
          } else if (contributorsOnPage.length < 100) {
            // Fewer than 100 contributors on this page, so it must be the last.
          } else if (page === 1 && contributorsOnPage.length === 100 && !linkHeader) {
            // Potentially more pages, but no link header. This is unusual.
            // For safety, we might log a warning or assume this is all.
            // For now, we'll stop.
          }
          url = '';
        }
      }
      return allContributors;
    } catch (error) {
      this.handleGitHubError(error, `fetch contributors for ${owner}/${repo}`);
    }
  }

  async getCommits(owner: string, repo: string, branchOrSha?: string): Promise<Commit[]> {
    let allCommits: Commit[] = [];
    let url = `${this.baseURL}/repos/${owner}/${repo}/commits`;
    let page = 1;
    const params: { per_page: number; page: number; sha?: string } = { per_page: 100, page: page };

    if (branchOrSha) {
      params.sha = branchOrSha;
    }

    try {
      while (url) {
        const response = await axios.get(url, {
          headers: this.getHeaders(),
          // For the first request, use the initial URL with potential sha.
          // For subsequent requests, the `url` will be from the Link header and won't need params.
          params: page === 1 ? params : undefined,
        });
      
        // Define a more specific type for the raw commit data from GitHub API
      interface RawGitHubCommit {
        sha: string;
        commit: {
          message: string;
          author: {
            name: string;
            email: string;
            date: string;
          };
          committer: { // Committer can be different from author
            name: string;
            email: string;
            date: string;
          };
          tree: {
            sha: string;
            url: string;
          };
          url: string;
          comment_count: number;
          verification?: { // Optional verification details
            verified: boolean;
            reason: string;
            signature: string | null;
            payload: string | null;
          };
        };
        url: string;
        html_url: string;
        comments_url: string;
        author: RawGitHubUser | null; // User object for author
        committer: RawGitHubUser | null; // User object for committer
        parents: Array<{ sha: string; url: string; html_url: string; }>;
      }

      // Define a simple type for GitHub user associated with commit (can be expanded)
      interface RawGitHubUser {
        login: string;
        id: number;
        node_id: string;
        avatar_url: string;
        gravatar_id: string;
        url: string;
        html_url: string;
        followers_url: string;
        following_url: string;
        gists_url: string;
        starred_url: string;
        subscriptions_url: string;
        organizations_url: string;
        repos_url: string;
        events_url: string;
        received_events_url: string;
        type: string;
        site_admin: boolean;
      }
      
      const responseData = response.data as RawGitHubCommit[];
      
      const commitsOnPage: Commit[] = responseData.map((commit: RawGitHubCommit) => ({
        sha: commit.sha,
        message: commit.commit.message,
        author: {
          name: commit.commit.author?.name || 'N/A', // Author might be null for some commits
          email: commit.commit.author?.email || 'N/A',
          date: commit.commit.author?.date || new Date().toISOString()
        }
        // Add stats and files if needed later, currently not in Commit type
      }));

      allCommits = allCommits.concat(commitsOnPage);

      const linkHeader = response.headers['link'];
      if (linkHeader) {
        const nextLink = linkHeader.split(',').find((s: string) => s.includes('rel="next"'));
        if (nextLink) {
          url = (nextLink.match(/<(.*?)>/) || [])[1] || '';
          // Increment page for the next direct request if URL parsing fails (fallback)
          // and to ensure the params object is updated if we are not using the link header URL directly
          page++; 
        } else {
          url = ''; // No next page
        }
      } else {
         // If no link header, assume it's the last page (or only page)
         if (commitsOnPage.length < 100 && page === 1 && allCommits.length === commitsOnPage.length) {
            // This was likely the only page and had less than 100 results.
          } else if (commitsOnPage.length === 0 && page > 1) {
            // No more commits on subsequent pages
          } else if (commitsOnPage.length < 100) {
            // Fewer than 100 commits on this page, so it must be the last.
          } else if (page === 1 && commitsOnPage.length === 100 && !linkHeader) {
            // Potentially more pages, but no link header. This is unusual.
          }
        url = ''; // Stop pagination
      }
    }
    return allCommits;
    } catch (error) {
      this.handleGitHubError(error, `fetch commits for ${owner}/${repo}${branchOrSha ? ` on branch/sha ${branchOrSha}` : ''}`);
    }
  }

  async getLanguages(owner: string, repo: string): Promise<Record<string, number>> {
    try {
      const response = await axios.get(
        `${this.baseURL}/repos/${owner}/${repo}/languages`,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      console.warn('Error fetching languages:', error);
      return {};
    }
  }

  async getFileContent(owner: string, repo: string, path: string): Promise<string> {
    try {
      const response = await axios.get(
        `${this.baseURL}/repos/${owner}/${repo}/contents/${path}`,
        { headers: this.getHeaders() }
      );

      if (response.data.content) {
        return Base64.decode(response.data.content);
      }
      return '';
    } catch (error) {
      console.warn('Error fetching file content:', error);
      return '';
    }
  }

  async getDirectoryContents(owner: string, repo: string, path: string = ''): Promise<FileInfo[]> {
    try {
      const response = await axios.get(
        `${this.baseURL}/repos/${owner}/${repo}/contents/${path}`,
        { headers: this.getHeaders() }
      );

      // Define a more specific type for raw file/directory item from GitHub API
      interface RawGitHubContentItem {
        name: string;
        path: string;
        sha: string;
        size: number;
        url: string;
        html_url: string;
        git_url: string;
        download_url: string | null;
        type: 'file' | 'dir' | 'symlink' | 'submodule'; // type can be other things too
        _links: {
          self: string;
          git: string;
          html: string;
        };
      }

      if (Array.isArray(response.data)) {
        const responseData = response.data as RawGitHubContentItem[];
        return responseData
          .filter((item: RawGitHubContentItem) => item.type === 'file')
          .map((file: RawGitHubContentItem) => ({
            name: file.name,
            path: file.path,
            size: file.size
          }));
      }
      return [];
    } catch (error) {
      console.warn('Error fetching directory contents:', error);
      return [];
    }
  }

  parseGitHubUrl(url: string): { owner: string; repo: string } | null {
    // Removed unnecessary escapes for /
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
}
