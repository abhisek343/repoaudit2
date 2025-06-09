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

  private handleGitHubError(error: any, context: string): never {
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
    
    throw new Error(`Failed to ${context}: ${error.message}`);
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
    try {
      const response = await axios.get(
        `${this.baseURL}/repos/${owner}/${repo}/contributors`,
        { 
          headers: this.getHeaders(),
          params: { per_page: 100 }
        }
      );

      return response.data.map((contributor: any) => ({
        login: contributor.login,
        contributions: contributor.contributions,
        avatarUrl: contributor.avatar_url,
        type: contributor.type
      }));
    } catch (error) {
      console.warn('Error fetching contributors:', error);
      return [];
    }
  }

  async getCommits(owner: string, repo: string, limit: number = 100): Promise<Commit[]> {
    try {
      const response = await axios.get(
        `${this.baseURL}/repos/${owner}/${repo}/commits`,
        { 
          headers: this.getHeaders(),
          params: { per_page: limit }
        }
      );

      return response.data.map((commit: any) => ({
        sha: commit.sha,
        message: commit.commit.message,
        author: {
          name: commit.commit.author.name,
          email: commit.commit.author.email,
          date: commit.commit.author.date
        }
      }));
    } catch (error) {
      console.warn('Error fetching commits:', error);
      return [];
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

      if (Array.isArray(response.data)) {
        return response.data
          .filter((item: any) => item.type === 'file')
          .map((file: any) => ({
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
    const regex = /github\.com\/([^\/]+)\/([^\/]+)/;
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