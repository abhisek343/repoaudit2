"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitHubGraphQLService = void 0;
const graphql_request_1 = require("graphql-request");
class GitHubGraphQLService {
    client;
    token;
    constructor(token) {
        this.token = token;
        this.client = new graphql_request_1.GraphQLClient('https://api.github.com/graphql', {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
    }
    hasToken() {
        return !!this.token;
    }
    handleGraphQLError(error, context) {
        if (error instanceof Error) {
            let userFriendlyMessage = `GitHub GraphQL API error while ${context}: ${error.message}`;
            if (error.message.includes('rate limit')) {
                if (this.token) {
                    userFriendlyMessage = 'GitHub GraphQL API rate limit exceeded. Please wait before making more requests.';
                }
                else {
                    userFriendlyMessage = 'GitHub GraphQL API rate limit exceeded. Please configure a GitHub Personal Access Token for higher rate limits.';
                }
            }
            else if (error.message.includes('Bad credentials') || error.message.includes('401')) {
                userFriendlyMessage = 'Invalid GitHub Personal Access Token for GraphQL API. Please check your token permissions.';
            }
            else if (error.message.includes('403')) {
                userFriendlyMessage = `Access forbidden to GraphQL API while ${context}. Your token may lack necessary permissions.`;
            }
            else if (error.message.includes('404')) {
                userFriendlyMessage = `Repository not found via GraphQL API while ${context}. Please check the repository exists and is accessible.`;
            }
            throw new Error(userFriendlyMessage);
        }
        throw new Error(`GraphQL API error while ${context}: ${String(error)}`);
    }
    /**
     * Get batched repository data including files using GraphQL API
     * This is more efficient than multiple REST API calls
     */
    async getBatchedRepositoryData(owner, repo, branch) {
        const branchRef = branch || 'HEAD';
        const query = `
      query GetRepoWithFiles($owner: String!, $repo: String!, $expression: String!) {
        repository(owner: $owner, name: $repo) {
          name
          nameWithOwner
          description
          primaryLanguage {
            name
          }
          stargazerCount
          forkCount
          watchers {
            totalCount
          }
          createdAt
          updatedAt
          defaultBranchRef {
            name
          }
          diskUsage
          openIssues: issues(states: OPEN) {
            totalCount
          }
          hasWikiEnabled
          hasProjectsEnabled
          licenseInfo {
            name
            spdxId
          }
          object(expression: $expression) {
            __typename
            ... on Tree {
              entries {
                name
                path
                type
                object {
                  __typename
                  ... on Blob {
                    text
                    byteSize
                  }
                }
              }
            }
          }
        }
      }
    `;
        try {
            const response = await this.client.request(query, {
                owner,
                repo,
                expression: `${branchRef}:`
            });
            const repoData = this.transformRepositoryData(response.repository);
            const files = this.transformFileData(response.repository.object);
            return {
                repository: repoData,
                files
            };
        }
        catch (error) {
            this.handleGraphQLError(error, `fetching batched repository data for ${owner}/${repo}`);
        }
    }
    /**
     * Get repository files using GraphQL API
     */
    async getRepositoryFiles(owner, repo, branch) {
        const branchRef = branch || 'HEAD';
        const query = `
      query GetRepoFiles($owner: String!, $repo: String!, $expression: String!) {
        repository(owner: $owner, name: $repo) {
          object(expression: $expression) {
            __typename
            ... on Tree {
              entries {
                name
                path
                type
                object {
                  __typename
                  ... on Blob {
                    text
                    byteSize
                  }
                }
              }
            }
          }
        }
      }
    `;
        try {
            const response = await this.client.request(query, {
                owner,
                repo,
                expression: `${branchRef}:`
            });
            return this.transformFileData(response.repository.object);
        }
        catch (error) {
            this.handleGraphQLError(error, `fetching repository files for ${owner}/${repo}`);
        }
    }
    /**
     * Get repository information using GraphQL API
     */
    async getRepository(owner, repo) {
        const query = `
      query GetRepository($owner: String!, $repo: String!) {
        repository(owner: $owner, name: $repo) {
          name
          nameWithOwner
          description
          primaryLanguage {
            name
          }
          stargazerCount
          forkCount
          watchers {
            totalCount
          }
          createdAt
          updatedAt
          defaultBranchRef {
            name
          }
          diskUsage
          openIssues: issues(states: OPEN) {
            totalCount
          }
          hasWikiEnabled
          hasProjectsEnabled
          licenseInfo {
            name
            spdxId
          }
        }
      }
    `;
        try {
            const response = await this.client.request(query, {
                owner,
                repo
            });
            return this.transformRepositoryData(response.repository);
        }
        catch (error) {
            this.handleGraphQLError(error, `fetching repository information for ${owner}/${repo}`);
        }
    }
    /**
     * Get contributors using GraphQL API
     */
    async getContributors(owner, repo) {
        const query = `
      query GetContributors($owner: String!, $repo: String!) {
        repository(owner: $owner, name: $repo) {
          collaborators(first: 100) {
            nodes {
              login
              avatarUrl
              url
            }
          }
          mentionableUsers(first: 100) {
            nodes {
              login
              avatarUrl
              url
            }
          }
        }
      }
    `;
        try {
            const response = await this.client.request(query, {
                owner,
                repo
            });
            return this.transformContributorData(response.repository);
        }
        catch (error) {
            this.handleGraphQLError(error, `fetching contributors for ${owner}/${repo}`);
        }
    }
    /**
     * Get commits using GraphQL API
     */
    async getCommits(owner, repo, branch, limit = 100) {
        const branchRef = branch || 'HEAD';
        const query = `
      query GetCommits($owner: String!, $repo: String!, $ref: String!, $first: Int!) {
        repository(owner: $owner, name: $repo) {
          ref(qualifiedName: $ref) {
            target {
              ... on Commit {
                history(first: $first) {
                  pageInfo {
                    hasNextPage
                    endCursor
                  }
                  nodes {
                    oid
                    message
                    author {
                      name
                      email
                      date
                    }
                    committedDate
                    additions
                    deletions
                  }
                }
              }
            }
          }
        }
      }
    `;
        try {
            const response = await this.client.request(query, {
                owner,
                repo,
                ref: branchRef,
                first: Math.min(limit, 100) // GraphQL has limits on how much data can be fetched
            });
            return this.transformCommitData(response.repository.ref.target.history.nodes);
        }
        catch (error) {
            this.handleGraphQLError(error, `fetching commits for ${owner}/${repo}`);
        }
    }
    transformRepositoryData(repo) {
        return {
            name: repo.name,
            fullName: repo.nameWithOwner,
            description: repo.description || '',
            language: repo.primaryLanguage?.name || 'Unknown',
            stars: repo.stargazerCount,
            forks: repo.forkCount,
            watchers: repo.watchers.totalCount,
            createdAt: repo.createdAt,
            updatedAt: repo.updatedAt,
            defaultBranch: repo.defaultBranchRef.name,
            size: repo.diskUsage,
            openIssues: repo.openIssues.totalCount,
            hasWiki: repo.hasWikiEnabled,
            hasPages: repo.hasProjectsEnabled,
            license: repo.licenseInfo ? {
                name: repo.licenseInfo.name,
                spdxId: repo.licenseInfo.spdxId
            } : undefined
        };
    }
    transformFileData(repoObject) {
        if (!repoObject || !repoObject.entries) {
            return [];
        }
        const files = [];
        for (const entry of repoObject.entries) {
            if (entry.type === 'blob') {
                // Only include files, not directories
                const file = {
                    name: entry.name,
                    path: entry.path,
                    size: entry.object?.byteSize || 0,
                    type: 'file',
                    content: entry.object?.text || undefined
                };
                files.push(file);
            }
        }
        return files;
    }
    transformContributorData(repo) {
        const contributors = [];
        const seen = new Set();
        // Combine collaborators and mentionable users, avoiding duplicates
        const allUsers = [
            ...repo.collaborators.nodes,
            ...repo.mentionableUsers.nodes
        ];
        for (const user of allUsers) {
            if (!seen.has(user.login)) {
                seen.add(user.login);
                contributors.push({
                    login: user.login,
                    contributions: 0, // GraphQL doesn't easily provide contribution count
                    avatarUrl: user.avatarUrl,
                    html_url: user.url,
                    type: 'User'
                });
            }
        }
        return contributors;
    }
    transformCommitData(commits) {
        return commits.map(commit => ({
            sha: commit.oid,
            message: commit.message,
            author: {
                name: commit.author.name,
                email: commit.author.email,
                date: commit.author.date
            },
            date: commit.committedDate,
            stats: {
                additions: commit.additions,
                deletions: commit.deletions,
                total: commit.additions + commit.deletions
            }
        }));
    }
}
exports.GitHubGraphQLService = GitHubGraphQLService;
