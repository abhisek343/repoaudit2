"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitHubService = void 0;
const axios_1 = __importDefault(require("axios"));
const js_base64_1 = require("js-base64");
class GitHubService {
    baseURL = 'https://api.github.com';
    token;
    owner = '';
    repo = '';
    constructor(token) {
        this.token = token;
    }
    getHeaders() {
        const headers = {
            'Accept': 'application/vnd.github.v3+json',
        };
        if (this.token) {
            headers['Authorization'] = `token ${this.token}`;
        }
        return headers;
    }
    hasToken() {
        return !!this.token;
    }
    handleGitHubError(error, context) {
        if (axios_1.default.isAxiosError(error)) {
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
                        }
                        else {
                            userFriendlyMessage =
                                'GitHub API rate limit exceeded. Please configure a valid GitHub Personal Access Token in Settings to increase your rate limit from 60 to 5,000 requests per hour.';
                        }
                    }
                    else if (message.includes('Bad credentials')) {
                        userFriendlyMessage =
                            'Invalid GitHub Personal Access Token. Please check your token in Settings and ensure it has the correct permissions.';
                    }
                    else {
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
    async verifyToken() {
        if (!this.token) {
            return false;
        }
        try {
            const response = await axios_1.default.get(`${this.baseURL}/user`, {
                headers: this.getHeaders(),
            });
            // If status is 200, token is valid
            return response.status === 200;
        }
        catch (error) {
            // Re-throw the error to be handled by the calling function's catch block
            // This allows for more specific error handling (e.g. rate limit vs. invalid token)
            throw error;
        }
    }
    async getRepository(owner, repo) {
        this.owner = owner;
        this.repo = repo;
        try {
            const response = await axios_1.default.get(`${this.baseURL}/repos/${owner}/${repo}`, { headers: this.getHeaders() });
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
        }
        catch (error) {
            this.handleGitHubError(error, 'fetching repository information');
        }
    }
    async getContributors(owner, repo) {
        this.owner = owner;
        this.repo = repo;
        let allContributors = [];
        let url = `${this.baseURL}/repos/${owner}/${repo}/contributors?per_page=100`;
        const MAX_CONTRIBUTORS_PAGES = 5; // Fetch up to 5 pages (500 contributors)
        let pagesFetched = 0;
        try {
            while (url && pagesFetched < MAX_CONTRIBUTORS_PAGES) {
                const response = await axios_1.default.get(url, {
                    headers: this.getHeaders(),
                });
                const contributorsOnPage = response.data.map((c) => ({
                    login: c.login,
                    contributions: c.contributions,
                    avatarUrl: c.avatar_url,
                    html_url: c.html_url, // Map html_url
                    type: c.type,
                }));
                allContributors = allContributors.concat(contributorsOnPage);
                pagesFetched++;
                const linkHeader = response.headers['link'];
                if (linkHeader) {
                    const nextLink = linkHeader.split(',').find((s) => s.includes('rel="next"'));
                    url = nextLink ? (nextLink.match(/<(.*?)>/) || [])[1] : undefined;
                }
                else {
                    url = undefined;
                }
            }
            return allContributors;
        }
        catch (error) {
            this.handleGitHubError(error, 'fetching contributors');
        }
    }
    async getCommits(owner, repo, branchOrSha, limit = 2000) {
        this.owner = owner;
        this.repo = repo;
        let allCommits = [];
        // initialParams will store the consistent parameters like 'sha'
        const initialParams = {};
        if (branchOrSha) {
            initialParams.sha = branchOrSha;
        }
        let url = `${this.baseURL}/repos/${owner}/${repo}/commits`;
        let commitsFetched = 0;
        try {
            while (url && commitsFetched < limit) {
                const currentPerPage = Math.min(100, limit - commitsFetched);
                // Construct parameters for the current request
                // Always include sha from initialParams if it was provided
                // And always set the per_page for the current request
                const requestParams = {
                    per_page: currentPerPage,
                    ...initialParams // Spread initialParams to include 'sha' if present
                };
                // Make the GET request. Axios will correctly append params to the URL.
                // If 'url' is a full pagination URL from Link header, axios handles merging.
                const response = await axios_1.default.get(url, {
                    headers: this.getHeaders(),
                    params: requestParams,
                });
                const commitsOnPage = response.data.map((c) => ({
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
                if (commitsFetched >= limit)
                    break; // Respect the limit
                const linkHeader = response.headers['link'];
                if (linkHeader) {
                    const nextLink = linkHeader.split(',').find((s) => s.includes('rel="next"'));
                    url = nextLink ? (nextLink.match(/<(.*?)>/) || [])[1] : undefined;
                }
                else {
                    url = undefined;
                }
            }
            return allCommits;
        }
        catch (error) {
            this.handleGitHubError(error, 'fetching commits');
        }
    }
    async getCommitDetails(owner, repo, commitSha) {
        this.owner = owner;
        this.repo = repo;
        try {
            const response = await axios_1.default.get(`${this.baseURL}/repos/${owner}/${repo}/commits/${commitSha}`, { headers: this.getHeaders() });
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
                files: data.files?.map((file) => ({
                    filename: file.filename,
                    additions: file.additions,
                    deletions: file.deletions,
                    changes: file.changes,
                    status: file.status,
                    patch: file.patch,
                })) || [],
            };
        }
        catch (error) {
            this.handleGitHubError(error, `fetching commit details for ${commitSha}`);
        }
    }
    async getLanguages(owner, repo) {
        this.owner = owner;
        this.repo = repo;
        try {
            const response = await axios_1.default.get(`${this.baseURL}/repos/${owner}/${repo}/languages`, { headers: this.getHeaders() });
            return response.data;
        }
        catch (error) {
            console.warn(`Warning: Could not fetch languages for ${owner}/${repo}: ${error instanceof Error ? error.message : String(error)}`);
            return {};
        }
    }
    async getFileContent(owner, repo, filePath) {
        this.owner = owner;
        this.repo = repo;
        if (filePath.match(/\.(png|jpg|gif|svg|pdf|zip|tar|gz)$/i))
            return '';
        try {
            const response = await axios_1.default.get(`${this.baseURL}/repos/${owner}/${repo}/contents/${filePath}`, { headers: this.getHeaders() });
            if (response.data && typeof response.data.content === 'string') {
                return js_base64_1.Base64.decode(response.data.content);
            }
            return '';
        }
        catch (error) {
            throw this.handleGitHubError(error, `fetch file content for ${owner}/${repo}/${filePath}`);
        }
    }
    async getRepoTree(owner, repo, branch) {
        this.owner = owner;
        this.repo = repo;
        try {
            const response = await axios_1.default.get(`${this.baseURL}/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`, { headers: this.getHeaders() });
            return response.data.tree
                .filter(item => item.type === 'blob' || item.type === 'tree')
                .map(item => ({
                name: item.path.split('/').pop() || item.path,
                path: item.path,
                size: item.size || 0,
                type: item.type === 'blob' ? 'file' : 'dir'
            }));
        }
        catch (error) {
            this.handleGitHubError(error, `fetch repository tree for ${owner}/${repo}`);
        }
        return [];
    }
    async getDirectoryContents(owner, repo, path = '') {
        this.owner = owner;
        this.repo = repo;
        try {
            const response = await axios_1.default.get(`${this.baseURL}/repos/${owner}/${repo}/contents/${path}`, { headers: this.getHeaders() });
            if (Array.isArray(response.data)) {
                return response.data
                    .filter(item => item.type === 'file' || item.type === 'dir')
                    .map(item => ({
                    name: item.name,
                    path: item.path,
                    size: item.size || 0,
                    type: item.type
                }));
            }
            return [];
        }
        catch (error) {
            console.warn(`Warning: Could not fetch directory contents for ${path} in ${owner}/${repo}: ${error instanceof Error ? error.message : String(error)}`);
            return [];
        }
    }
    parseGitHubUrl(url) {
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
    async streamAnalysis(repoUrl) {
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
    async getPullRequests(owner, repo) {
        this.owner = owner;
        this.repo = repo;
        try {
            const response = await axios_1.default.get(`${this.baseURL}/repos/${owner}/${repo}/pulls`, {
                params: { state: 'all', per_page: 100, sort: 'created', direction: 'desc' },
                headers: this.getHeaders(),
            });
            return response.data.map(pr => {
                let state = pr.state;
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
        }
        catch (error) {
            this.handleGitHubError(error, 'fetching pull requests');
        }
    }
}
exports.GitHubService = GitHubService;
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
