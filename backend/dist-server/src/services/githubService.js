"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitHubService = void 0;
const axios_1 = __importDefault(require("axios"));
const jszip_1 = __importDefault(require("jszip"));
const path = __importStar(require("path"));
const githubGraphQLService_1 = require("./githubGraphQLService");
class GitHubService {
    baseURL = 'https://api.github.com';
    token;
    owner = '';
    repo = '';
    graphqlService;
    constructor(token) {
        this.token = token;
        this.graphqlService = new githubGraphQLService_1.GitHubGraphQLService(token);
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
    /**
     * Get batched repository data using GraphQL API as primary method
     * Falls back to individual REST API calls if GraphQL fails
     */ async getBatchedRepositoryData(owner, repo, branch) {
        this.owner = owner;
        this.repo = repo;
        console.log(`[GitHubService] Attempting batched fetch for ${owner}/${repo} using GraphQL API`);
        try {
            // Try GraphQL API first for efficient batched data fetching
            const result = await this.graphqlService.getBatchedRepositoryData(owner, repo, branch);
            console.log(`[GitHubService] GraphQL batched fetch successful: repository + ${result.files.length} files`);
            return result;
        }
        catch (graphqlError) {
            console.error(`[GitHubService] GraphQL batched fetch failed: ${graphqlError}`);
            throw graphqlError;
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
            // Try GraphQL fallback if REST API fails
            try {
                console.warn(`[GitHubService] REST API failed for repository info, trying GraphQL fallback`);
                return await this.graphqlService.getRepository(owner, repo);
            }
            catch (graphqlError) {
                console.error(`[GitHubService] Both REST and GraphQL failed for repository info`);
                this.handleGitHubError(error, 'fetching repository information');
            }
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
            // Try GraphQL fallback if REST API fails
            try {
                console.warn(`[GitHubService] REST API failed for contributors, trying GraphQL fallback`);
                return await this.graphqlService.getContributors(owner, repo);
            }
            catch (graphqlError) {
                console.error(`[GitHubService] Both REST and GraphQL failed for contributors`);
                this.handleGitHubError(error, 'fetching contributors');
            }
        }
    }
    async getCommits(owner, repo, branchOrSha, limit = 2000, sendProgress) {
        this.owner = owner;
        this.repo = repo;
        let allCommits = [];
        const initialParams = {};
        if (branchOrSha) {
            initialParams.sha = branchOrSha;
        }
        let url = `${this.baseURL}/repos/${owner}/${repo}/commits`;
        let commitsFetched = 0;
        let isFirstRequest = true;
        const maxRetries = 3;
        let retryCount = 0;
        try {
            while (url && commitsFetched < limit) {
                const currentPerPage = Math.min(100, limit - commitsFetched);
                const requestConfig = {
                    headers: this.getHeaders(),
                    timeout: 15000, // 15-second timeout for each request
                };
                if (isFirstRequest) {
                    requestConfig.params = {
                        per_page: currentPerPage,
                        ...initialParams
                    };
                    isFirstRequest = false;
                }
                try {
                    const response = await axios_1.default.get(url, requestConfig);
                    const commitsOnPage = response.data.map((c) => ({
                        sha: c.sha,
                        message: c.commit.message,
                        author: {
                            name: c.commit.author?.name || c.author?.login || 'N/A',
                            email: c.commit.author?.email || 'N/A',
                            date: c.commit.author?.date || new Date().toISOString()
                        },
                        date: c.commit.author?.date || new Date().toISOString(),
                    }));
                    allCommits = allCommits.concat(commitsOnPage);
                    commitsFetched += commitsOnPage.length;
                    if (sendProgress) {
                        // Progress for commit fetching is between 15% and 20%
                        const progress = 15 + Math.min(5, 5 * (commitsFetched / limit));
                        sendProgress(`Fetched ${commitsFetched} commits...`, Math.round(progress));
                    }
                    if (commitsFetched >= limit)
                        break;
                    const linkHeader = response.headers['link'];
                    if (linkHeader) {
                        const nextLink = linkHeader.split(',').find((s) => s.includes('rel="next"'));
                        url = nextLink ? (nextLink.match(/<(.*?)>/) || [])[1] : undefined;
                    }
                    else {
                        url = undefined;
                    }
                    retryCount = 0; // Reset retries on success
                }
                catch (error) {
                    if (retryCount < maxRetries) {
                        retryCount++;
                        const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
                        console.warn(`[GitHubService] Error fetching commits. Retrying in ${delay}ms...`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                    }
                    else {
                        throw error; // Max retries reached, re-throw the error
                    }
                }
            }
            return allCommits;
        }
        catch (error) {
            // For commits, only try GraphQL fallback if it's a simple request (not with complex pagination)
            if (limit <= 100) {
                try {
                    console.warn(`[GitHubService] REST API failed for commits, trying GraphQL fallback`);
                    return await this.graphqlService.getCommits(owner, repo, branchOrSha, limit);
                }
                catch (graphqlError) {
                    console.error(`[GitHubService] Both REST and GraphQL failed for commits`);
                }
            }
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
                date: data.commit.author?.date || new Date().toISOString(),
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
    async getRepoTree(owner, repo, branch) {
        this.owner = owner;
        this.repo = repo;
        console.log(`[GitHubService] Fetching repository tree with content for ${owner}/${repo}@${branch} using archive method`);
        try {
            // Use archive download method for better performance and complete file content
            const files = await this.downloadRepositoryArchive(owner, repo, branch);
            if (files.length === 0) {
                throw new Error(`Archive download failed and no fallback is configured`);
            }
            console.log(`[GitHubService] Successfully fetched ${files.length} files with content using archive method`);
            return files;
        }
        catch (error) {
            console.error(`[GitHubService] Failed to fetch repository tree via archive download: ${error}`);
            this.handleGitHubError(error, `fetch repository tree for ${owner}/${repo}`);
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
                timeout: 60000, // 60 seconds timeout for pull requests
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
            // For large repos, pull requests might timeout - this shouldn't fail the entire analysis
            console.warn(`Failed to fetch pull requests for ${owner}/${repo}:`, error instanceof Error ? error.message : 'Unknown error');
            // Return empty array instead of throwing, so analysis can continue
            return [];
        }
    }
    /**
     * Download entire repository as ZIP archive and extract files with content
     * This replaces individual file fetching for better performance
     */
    async downloadRepositoryArchive(owner, repo, branch) {
        this.owner = owner;
        this.repo = repo;
        console.log(`[Archive Download] Starting download of ${owner}/${repo}@${branch}`);
        try {
            // Download the ZIP archive
            const archiveUrl = `${this.baseURL}/repos/${owner}/${repo}/zipball/${branch}`;
            const response = await axios_1.default.get(archiveUrl, {
                headers: this.getHeaders(),
                responseType: 'arraybuffer',
                timeout: 120000, // 2 minutes timeout for large repos
                maxContentLength: 100 * 1024 * 1024, // 100MB max file size
            });
            console.log(`[Archive Download] Downloaded ${(response.data.byteLength / 1024 / 1024).toFixed(2)}MB archive`); // Extract ZIP file
            const zip = new jszip_1.default();
            const zipContents = await zip.loadAsync(response.data);
            const files = [];
            const filePromises = [];
            // Process each file in the ZIP
            for (const [relativePath, zipObject] of Object.entries(zipContents.files)) {
                if (zipObject.dir) {
                    // Skip directories
                    continue;
                }
                // Remove the root directory from the path (GitHub adds a prefix like "repo-branch/")
                const pathParts = relativePath.split('/');
                const cleanPath = pathParts.slice(1).join('/'); // Remove first part which is the repo-branch prefix
                if (!cleanPath) {
                    // Skip if path becomes empty
                    continue;
                } // Create the file info object
                const fileInfo = {
                    name: path.basename(cleanPath),
                    path: cleanPath,
                    size: 0, // We'll estimate this from content length
                    type: 'file',
                    content: undefined, // Will be populated below for text files
                    language: this.getLanguageFromExtension(cleanPath) // Add language detection
                }; // Only extract content for text files under a reasonable size limit
                if (this.isTextFile(cleanPath)) {
                    const contentPromise = zipObject.async('text').then((content) => {
                        // Set size based on content length and only include if reasonable size
                        if (content.length < 1024 * 1024) { // 1MB limit per file
                            fileInfo.content = content;
                            fileInfo.size = content.length;
                        }
                        else {
                            console.warn(`[Archive Download] Skipping large file ${cleanPath} (${content.length} bytes)`);
                            fileInfo.content = '';
                            fileInfo.size = content.length;
                        }
                    }).catch((error) => {
                        console.warn(`[Archive Download] Failed to extract content for ${cleanPath}:`, error.message);
                        fileInfo.content = ''; // Set empty content on error
                    });
                    filePromises.push(contentPromise);
                }
                else {
                    // For binary files, try to get size estimate
                    zipObject.async('uint8array').then((data) => {
                        fileInfo.size = data.length;
                    }).catch(() => {
                        fileInfo.size = 0;
                    });
                }
                files.push(fileInfo);
            }
            // Wait for all file content extraction to complete
            await Promise.all(filePromises);
            console.log(`[Archive Download] Extracted ${files.length} files, ${files.filter(f => f.content !== undefined).length} with content`);
            return files;
        }
        catch (error) {
            console.error('[Archive Download] Failed to download repository archive:', error);
            this.handleGitHubError(error, `download repository archive for ${owner}/${repo}`);
            return [];
        }
    }
    /**
     * Get programming language from file extension
     */
    getLanguageFromExtension(filePath) {
        const extensionLanguageMap = {
            '.ts': 'typescript',
            '.tsx': 'typescript',
            '.js': 'javascript',
            '.jsx': 'javascript',
            '.mjs': 'javascript',
            '.cjs': 'javascript',
            '.py': 'python',
            '.pyw': 'python',
            '.pyi': 'python',
            '.java': 'java',
            '.kt': 'kotlin',
            '.scala': 'scala',
            '.groovy': 'groovy',
            '.c': 'c',
            '.cpp': 'cpp',
            '.cxx': 'cpp',
            '.cc': 'cpp',
            '.h': 'c',
            '.hpp': 'cpp',
            '.hxx': 'cpp',
            '.cs': 'csharp',
            '.vb': 'vb',
            '.fs': 'fsharp',
            '.php': 'php',
            '.rb': 'ruby',
            '.go': 'go',
            '.rs': 'rust',
            '.swift': 'swift',
            '.dart': 'dart',
            '.lua': 'lua',
            '.hs': 'haskell',
            '.elm': 'elm',
            '.clj': 'clojure',
            '.cljs': 'clojure',
            '.ml': 'ocaml',
            '.ex': 'elixir',
            '.exs': 'elixir',
            '.sh': 'shell',
            '.bash': 'shell',
            '.zsh': 'shell',
            '.fish': 'shell',
            '.ps1': 'powershell',
            '.bat': 'batch',
            '.cmd': 'batch',
            '.sql': 'sql',
            '.plsql': 'sql',
            '.psql': 'sql',
            '.json': 'json',
            '.yaml': 'yaml',
            '.yml': 'yaml',
            '.toml': 'toml',
            '.xml': 'xml',
            '.html': 'html',
            '.htm': 'html',
            '.css': 'css',
            '.scss': 'scss',
            '.sass': 'sass',
            '.less': 'less',
            '.md': 'markdown',
            '.mdx': 'markdown',
            '.tex': 'latex',
            '.tf': 'terraform',
            '.hcl': 'hcl',
            '.dockerfile': 'dockerfile'
        };
        const ext = path.extname(filePath).toLowerCase();
        const fileName = path.basename(filePath).toLowerCase();
        // Check by extension
        if (extensionLanguageMap[ext]) {
            return extensionLanguageMap[ext];
        }
        // Check specific filenames without extensions
        if (fileName === 'dockerfile' || fileName === 'makefile' || fileName === 'rakefile' || fileName === 'gemfile') {
            return fileName;
        }
        return undefined;
    }
    /**
     * Determine if a file is likely a text file based on extension
     */
    isTextFile(filePath) {
        const textExtensions = new Set([
            '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
            '.py', '.pyw', '.pyi',
            '.java', '.kt', '.scala', '.groovy',
            '.c', '.cpp', '.cxx', '.cc', '.h', '.hpp', '.hxx',
            '.cs', '.vb', '.fs',
            '.php', '.rb', '.go', '.rs', '.swift', '.dart', '.lua',
            '.hs', '.elm', '.clj', '.cljs', '.ml', '.ex', '.exs',
            '.sh', '.bash', '.zsh', '.fish', '.ps1', '.bat', '.cmd',
            '.sql', '.plsql', '.psql',
            '.json', '.yaml', '.yml', '.toml', '.xml', '.ini', '.cfg', '.conf',
            '.html', '.htm', '.css', '.scss', '.sass', '.less',
            '.md', '.mdx', '.tex', '.txt', '.log',
            '.tf', '.hcl', '.dockerfile',
            '.gitignore', '.gitattributes', '.editorconfig'
        ]);
        const ext = path.extname(filePath).toLowerCase();
        const fileName = path.basename(filePath).toLowerCase();
        // Check by extension
        if (textExtensions.has(ext)) {
            return true;
        }
        // Check specific filenames without extensions
        const textFilenames = new Set([
            'readme', 'license', 'changelog', 'dockerfile', 'makefile', 'rakefile', 'gemfile'
        ]);
        return textFilenames.has(fileName) || textFilenames.has(fileName.split('.')[0]);
    }
    /**
     * Extract files from ZIP archive with intelligent filtering
     * Provides comprehensive analysis of all repository files
     */
    async extractFilesFromArchive(archiveBuffer, maxFiles = 800, maxFileSize = 200 * 1024) {
        const startTime = Date.now();
        console.log(`[GitHubService] 🔍 Starting file extraction from ${(archiveBuffer.length / 1024 / 1024).toFixed(2)}MB archive`);
        // Load ZIP archive buffer
        const zip = await new jszip_1.default().loadAsync(archiveBuffer);
        const files = [];
        let extractedCount = 0;
        let skippedCount = 0;
        let totalEntries = 0;
        // Count total entries for progress tracking
        Object.keys(zip.files).forEach(() => totalEntries++);
        // Sort files by relevance before processing
        const sortedEntries = Object.entries(zip.files)
            .filter(([_, file]) => !file.dir)
            .sort(([pathA], [pathB]) => this.prioritizeFile(pathA) - this.prioritizeFile(pathB));
        console.log(`[GitHubService] 📁 Found ${sortedEntries.length} files in archive`);
        console.log(`[GitHubService] 🎯 Will extract up to ${maxFiles} most relevant files`);
        for (const [relativePath, file] of sortedEntries) {
            if (extractedCount >= maxFiles) {
                console.log(`[GitHubService] 🛑 Reached max files limit (${maxFiles}), stopping extraction`);
                break;
            }
            // Remove the root folder from path (GitHub archives have a root folder)
            const cleanPath = relativePath.split('/').slice(1).join('/');
            if (!cleanPath || !this.isAnalyzableFile(cleanPath)) {
                skippedCount++;
                continue;
            }
            try {
                const content = await file.async('string');
                if (content.length > maxFileSize) {
                    console.log(`[GitHubService] ⚠️  Skipping large file: ${cleanPath} (${(content.length / 1024).toFixed(1)}KB)`);
                    skippedCount++;
                    continue;
                }
                files.push({
                    path: cleanPath,
                    name: path.basename(cleanPath),
                    type: 'file',
                    size: content.length,
                    content,
                    language: this.detectLanguage(cleanPath),
                    lastModified: new Date().toISOString(), // Archive doesn't preserve timestamps
                });
                extractedCount++;
                if (extractedCount % 50 === 0) {
                    console.log(`[GitHubService] 📊 Progress: ${extractedCount}/${maxFiles} files extracted...`);
                }
            }
            catch (error) {
                console.warn(`[GitHubService] ⚠️  Failed to extract ${cleanPath}:`, error);
                skippedCount++;
            }
        }
        const extractionTime = Date.now() - startTime;
        console.log(`[GitHubService] ✅ Extraction complete:`);
        console.log(`[GitHubService]    📄 Files extracted: ${extractedCount}`);
        console.log(`[GitHubService]    ⏭️  Files skipped: ${skippedCount}`);
        console.log(`[GitHubService]    ⏱️  Extraction time: ${extractionTime}ms`);
        console.log(`[GitHubService]    🎯 Coverage: ${((extractedCount / Math.max(1, sortedEntries.length)) * 100).toFixed(1)}% of analyzable files`);
        return files;
    }
    /**
     * Determine if a file should be analyzed
     */
    isAnalyzableFile(filePath) {
        const fileName = path.basename(filePath);
        const ext = path.extname(filePath).toLowerCase();
        // Skip common non-essential directories
        const skipDirectories = [
            'node_modules', '.git', 'dist', 'build', 'coverage',
            '.next', 'out', 'public', 'static', 'assets',
            '__pycache__', '.pytest_cache', 'venv', 'env',
            'target', 'bin', 'obj', 'packages'
        ];
        const pathParts = filePath.split('/');
        if (pathParts.some(part => skipDirectories.includes(part))) {
            return false;
        }
        // Only include source files
        const analyzableExtensions = [
            '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
            '.py', '.java', '.go', '.cs', '.php', '.rb',
            '.cpp', '.c', '.h', '.hpp', '.rs', '.swift',
            '.kt', '.scala', '.dart', '.lua', '.r', '.m'
        ];
        // Skip common non-source files
        const skipPatterns = [
            /\.min\./,
            /\.map$/,
            /\.lock$/,
            /\.log$/,
            /\.tmp$/,
            /\.test\./,
            /\.spec\./,
            /\.d\.ts$/,
            /\.config\./,
            /package-lock\.json$/,
            /yarn\.lock$/,
            /composer\.lock$/,
        ];
        return analyzableExtensions.includes(ext) &&
            !skipPatterns.some(pattern => pattern.test(fileName)) &&
            pathParts.length < 8; // Skip deeply nested files
    }
    /**
     * Prioritize files for extraction (lower number = higher priority)
     */
    prioritizeFile(filePath) {
        let priority = 1000; // Default priority
        // Higher priority for main application files
        if (filePath.includes('src/') || filePath.includes('lib/'))
            priority -= 100;
        if (filePath.includes('components/'))
            priority -= 50;
        if (filePath.includes('services/'))
            priority -= 50;
        if (filePath.includes('pages/') || filePath.includes('views/'))
            priority -= 50;
        // Lower priority for test files
        if (filePath.includes('test') || filePath.includes('spec'))
            priority += 200;
        // Lower priority for config files
        if (filePath.includes('config') || filePath.includes('.config.'))
            priority += 100;
        // Higher priority for entry points
        if (path.basename(filePath).match(/^(index|main|app)\./))
            priority -= 200;
        return priority;
    }
    /**
     * Detect language from file extension
     */
    detectLanguage(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        const languageMap = {
            '.ts': 'typescript', '.tsx': 'typescript',
            '.js': 'javascript', '.jsx': 'javascript', '.mjs': 'javascript',
            '.py': 'python', '.java': 'java', '.go': 'go',
            '.cs': 'csharp', '.php': 'php', '.rb': 'ruby',
            '.cpp': 'cpp', '.c': 'c', '.rs': 'rust', '.swift': 'swift'
        };
        return languageMap[ext] || 'text';
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
