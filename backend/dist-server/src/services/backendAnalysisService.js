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
Object.defineProperty(exports, "__esModule", { value: true });
exports.BackendAnalysisService = void 0;
const githubService_1 = require("./githubService");
const llmService_1 = require("./llmService");
const parser = __importStar(require("@babel/parser"));
const path = __importStar(require("path"));
class BackendAnalysisService {
    githubService;
    llmService;
    analysisWarnings; // Added to store warnings
    constructor(githubToken, llmConfig) {
        this.githubService = new githubService_1.GitHubService(githubToken);
        this.analysisWarnings = []; // Initialize warnings
        let finalLlmConfig;
        console.log('LLM Config received by BackendAnalysisService constructor:', llmConfig);
        if (llmConfig?.apiKey?.trim()) {
            finalLlmConfig = llmConfig;
            console.log('LLM Config: Using user-provided configuration.');
        }
        else {
            // No API key provided - LLM features will be disabled
            console.log('LLM Config: No API key provided. LLM features will be disabled.');
            finalLlmConfig = {
                provider: 'openai',
                apiKey: '',
                model: llmConfig?.model
            };
        }
        this.llmService = new llmService_1.LLMService(finalLlmConfig);
        // Final debug logging
        console.log('Final LLM Config used for LLMService:', finalLlmConfig);
        console.log('LLM Service isConfigured() check:', this.llmService.isConfigured());
    }
    addWarning(step, message, error) {
        this.analysisWarnings.push({
            step,
            message,
            error: error ? (error instanceof Error ? error.message : String(error)) : undefined,
        });
        console.warn(`Analysis Warning [${step}]: ${message}`, error ? error : '');
    }
    async validateGithubToken(token) {
        const githubService = new githubService_1.GitHubService(token);
        try {
            const isValid = await githubService.verifyToken();
            if (isValid) {
                return { isValid: true };
            }
            else {
                return { isValid: false, error: 'Invalid GitHub token.' };
            }
        }
        catch (error) {
            return { isValid: false, error: error.message || 'Failed to validate GitHub token.' };
        }
    }
    async validateLlmKey(llmConfig) {
        const llmService = new llmService_1.LLMService(llmConfig);
        try {
            const isValid = await llmService.verifyKey();
            if (isValid) {
                return { isValid: true };
            }
            else {
                return { isValid: false, error: `Invalid API key for ${llmConfig.provider}.` };
            }
        }
        catch (error) {
            return { isValid: false, error: error.message || `Failed to validate API key for ${llmConfig.provider}.` };
        }
    }
    isValidRepoUrl(url) {
        return url.includes('github.com/');
    }
    extractRepoParts(repoUrl) {
        const parts = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
        if (!parts || parts.length < 3) {
            throw new Error('Could not extract owner and repo from URL');
        }
        return [parts[1], parts[2].replace(/\.git$/, '')];
    }
    transformRepoData(repoData) {
        return {
            name: repoData.name,
            fullName: repoData.fullName,
            description: repoData.description || '', // Handle potential null description
            stars: repoData.stars,
            forks: repoData.forks,
            watchers: repoData.watchers,
            language: repoData.language,
            url: `https://github.com/${repoData.fullName}`,
            owner: repoData.fullName.split('/')[0],
            createdAt: repoData.createdAt,
            updatedAt: repoData.updatedAt,
            defaultBranch: repoData.defaultBranch,
            size: repoData.size,
            openIssues: repoData.openIssues,
            hasWiki: repoData.hasWiki,
            hasPages: repoData.hasPages,
        };
    }
    processCommits(commits) {
        return commits.map(commit => ({
            sha: commit.sha,
            author: commit.author?.name || 'Unknown',
            date: commit.author?.date || new Date().toISOString(),
            message: commit.message,
            stats: {
                additions: commit.stats?.additions || 0,
                deletions: commit.stats?.deletions || 0,
                total: commit.stats?.total || 0,
            },
            files: commit.files || [],
        }));
    }
    processContributors(contributors) {
        return contributors.map(c => ({
            login: c.login,
            avatarUrl: c.avatarUrl,
            contributions: c.contributions,
            profileUrl: c.html_url || `https://github.com/${c.login}`,
        }));
    }
    parseDependencies(packageJsonContent) {
        try {
            const parsed = JSON.parse(packageJsonContent);
            return {
                dependencies: parsed.dependencies || {},
                devDependencies: parsed.devDependencies || {},
            };
        }
        catch (e) {
            this.addWarning("Dependency Parsing", "Failed to parse package.json content", e);
            return { dependencies: {}, devDependencies: {} };
        }
    }
    async detectArchitecturePatterns(filesInput) {
        // Quick fallback for large repositories to avoid long processing
        if (filesInput.length > 200) {
            console.warn('[Architecture Analysis] Large repo detected; using enhanced fallback architecture analysis');
            this.addWarning('detectArchitecturePatterns', `Repository has ${filesInput.length} files; using fallback analysis`);
            return this.createEnhancedFallbackArchitecture(filesInput);
        }
        console.log(`[Architecture Analysis] Starting analysis of ${filesInput.length} files`);
        const nodes = filesInput.map(file => {
            const moduleType = this.inferModuleType(file.path);
            return {
                id: file.path,
                name: path.basename(file.path),
                type: moduleType,
                path: file.path,
                layer: this.inferLayer(file.path, moduleType),
            };
        });
        const links = [];
        const sourceFiles = filesInput.filter(file => this.isSourceFile(file.path));
        const filesWithContent = [];
        console.log(`[Architecture Analysis] Found ${sourceFiles.length} source files out of ${filesInput.length} total files`);
        for (const file of sourceFiles) {
            if (file.content !== undefined) { // Check if content already exists
                filesWithContent.push({ file, content: file.content });
            }
            else {
                // Archive download should provide content for all files, so this is just a safety fallback
                this.addWarning('detectArchitecturePatterns', `Missing content for ${file.path}. File will be excluded from import analysis.`);
                console.warn(`[Architecture Analysis] Missing content for ${file.path}, excluding from analysis`);
                filesWithContent.push({ file, content: '' }); // Add with empty content to avoid breaking loops
            }
        }
        console.log(`[Architecture Analysis] Processing ${filesWithContent.length} files with content`);
        let totalImportsFound = 0;
        let totalLinksCreated = 0;
        for (let idx = 0; idx < filesWithContent.length; idx++) {
            // Yield to event loop to keep server responsive
            await new Promise(resolve => setImmediate(resolve));
            const { file, content } = filesWithContent[idx];
            if (content) { // Only parse imports if content is available
                const importedPaths = this.parseImports(content);
                totalImportsFound += importedPaths.length;
                console.log(`[Architecture Analysis] File ${file.path} has ${importedPaths.length} imports: ${importedPaths.slice(0, 3).join(', ')}${importedPaths.length > 3 ? '...' : ''}`);
                for (const importedPath of importedPaths) {
                    const targetNode = this.findNodeByPath(nodes, importedPath, file.path);
                    if (targetNode) {
                        links.push({
                            source: file.path,
                            target: targetNode.id,
                        });
                        totalLinksCreated++;
                        console.log(`[Architecture Analysis] Created link: ${file.path} -> ${targetNode.id}`);
                    }
                    else if (importedPath.startsWith('.')) {
                        console.log(`[Architecture Analysis] Relative import not resolved: ${importedPath} from ${file.path}`);
                    }
                }
            }
        }
        console.log(`[Architecture Analysis] Summary: ${totalImportsFound} total imports found, ${totalLinksCreated} internal links created`);
        console.log(`[Architecture Analysis] Found ${nodes.length} nodes and ${links.length} internal dependencies`);
        // Fallback: if no internal imports detected, connect all nodes to the first node
        if (links.length === 0 && nodes.length >= 2) {
            console.warn('[Architecture Analysis] No internal imports found; creating fallback links for visualization');
            for (let i = 1; i < nodes.length; i++) {
                links.push({ source: nodes[0].id, target: nodes[i].id });
            }
        }
        return { nodes, links };
    }
    // Safe wrapper for architecture analysis with timeout and minimal fallback
    async safeDetectArchitecturePatterns(filesInput) {
        const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Architecture analysis timeout')), 45000) // Increased timeout
        );
        try {
            const result = await Promise.race([
                this.detectArchitecturePatterns(filesInput),
                timeout
            ]);
            // Validate the result
            if (!result || !result.nodes || !result.links) {
                throw new Error('Invalid architecture analysis result');
            }
            console.log(`[Architecture Analysis] Successfully detected ${result.nodes.length} nodes and ${result.links.length} links`);
            // If we got a valid result but no links, try to add some based on common patterns
            if (result.nodes.length > 1 && result.links.length === 0) {
                console.log('[Architecture Analysis] No internal dependencies detected, creating fallback links');
                result.links = this.createFallbackLinks(result.nodes);
            }
            return result;
        }
        catch (error) {
            console.error('[Architecture Analysis] Failed:', error);
            this.addWarning('Architecture Analysis', 'Architecture analysis failed or timed out. Using enhanced fallback data.', error);
            // Create a more comprehensive fallback
            return this.createEnhancedFallbackArchitecture(filesInput);
        }
    }
    createFallbackLinks(nodes) {
        const links = [];
        // Create links based on common patterns
        const components = nodes.filter(n => n.type === 'component');
        const services = nodes.filter(n => n.type === 'service');
        const pages = nodes.filter(n => n.type === 'page');
        const hooks = nodes.filter(n => n.type === 'hook');
        // Connect pages to components
        pages.forEach(page => {
            components.forEach(comp => {
                if (links.length < 20) { // Limit to prevent too many connections
                    links.push({ source: page.id, target: comp.id });
                }
            });
        });
        // Connect components to services
        components.forEach(comp => {
            services.forEach(service => {
                if (links.length < 20) {
                    links.push({ source: comp.id, target: service.id });
                }
            });
        });
        // Connect components to hooks
        components.forEach(comp => {
            hooks.forEach(hook => {
                if (links.length < 20) {
                    links.push({ source: comp.id, target: hook.id });
                }
            });
        });
        // If still no links, create basic chain
        if (links.length === 0 && nodes.length >= 2) {
            for (let i = 0; i < Math.min(nodes.length - 1, 10); i++) {
                links.push({
                    source: nodes[i].id,
                    target: nodes[i + 1].id,
                });
            }
        }
        console.log(`[Architecture Analysis] Created ${links.length} fallback links`);
        return links;
    }
    createEnhancedFallbackArchitecture(filesInput) {
        // Take more files for analysis, focusing on source files
        const sourceFiles = filesInput.filter(f => this.isSourceFile(f.path));
        const relevantFiles = sourceFiles.slice(0, 50); // Increased from 10
        const nodes = relevantFiles.map(f => {
            const moduleType = this.inferModuleType(f.path);
            return {
                id: f.path,
                name: path.basename(f.path),
                type: moduleType,
                path: f.path,
                layer: this.inferLayer(f.path, moduleType),
            };
        });
        const links = this.createFallbackLinks(nodes);
        console.log(`[Architecture Analysis] Enhanced fallback: ${nodes.length} nodes, ${links.length} links`);
        return { nodes, links };
    }
    /**
     * Safe wrapper for ESComplex quality metrics with robust error handling and fallback
     */
    async safeCalculateQualityMetrics(repoTree, sendProgress) {
        const metrics = {};
        const sourceFiles = repoTree.filter(f => this.isSourceFile(f.path));
        const totalFiles = sourceFiles.length;
        const chunkSize = 25;
        for (let i = 0; i < totalFiles; i += chunkSize) {
            const chunk = sourceFiles.slice(i, i + chunkSize);
            for (const file of chunk) {
                try {
                    const content = file.content ?? '';
                    if (!content) {
                        metrics[file.path] = { complexity: 1, maintainability: 100, linesOfCode: 0 };
                        continue;
                    }
                    if (this.isJavaScriptFile(file.path)) {
                        try {
                            const ast = parser.parse(content, {
                                sourceType: 'module',
                                plugins: ['jsx', 'typescript', 'estree', 'doExpressions', 'objectRestSpread', 'classProperties', 'exportDefaultFrom', 'exportNamespaceFrom', 'asyncGenerators', 'dynamicImport', 'optionalChaining', 'nullishCoalescingOperator'],
                                errorRecovery: true,
                            });
                            const complexity = this.calculateComplexity(ast);
                            const linesOfCode = content.split('\n').length;
                            // Simplified maintainability index, can be improved
                            const maintainability = Math.max(0, (171 - 5.2 * Math.log(1) - 0.23 * complexity - 16.2 * Math.log(linesOfCode)) * 100 / 171);
                            metrics[file.path] = {
                                complexity,
                                maintainability: isNaN(maintainability) ? 100 : Math.round(maintainability),
                                linesOfCode,
                            };
                        }
                        catch (analysisErr) {
                            this.addWarning('Quality Metrics', `Babel parser failed for ${file.path}. Using fallback.`, analysisErr);
                            metrics[file.path] = {
                                complexity: this.calculateFallbackComplexity(content),
                                maintainability: 50,
                                linesOfCode: content.split('\n').length,
                            };
                        }
                    }
                    else {
                        metrics[file.path] = {
                            complexity: this.calculateFallbackComplexity(content),
                            maintainability: 75, // Higher for non-code files
                            linesOfCode: content.split('\n').length,
                        };
                    }
                }
                catch (err) {
                    this.addWarning('Quality Metrics', `Error processing ${file.path}.`, err);
                    metrics[file.path] = { complexity: 1, maintainability: 50, linesOfCode: 0 };
                }
            }
            await new Promise(resolve => setImmediate(resolve));
            if (sendProgress) {
                const progress = Math.round(((i + chunk.length) / totalFiles) * 100);
                sendProgress('Calculating quality metrics', 40 + (progress / 10));
            }
        }
        return metrics;
    }
    calculateFallbackComplexity(content) {
        const keywords = ['if', 'else', 'for', 'while', 'switch', 'case', 'catch'];
        let complexity = 1;
        for (const kw of keywords) {
            const matches = content.match(new RegExp(`\\b${kw}\\b`, 'g'));
            complexity += matches ? matches.length : 0;
        }
        return Math.min(100, complexity);
    }
    calculateComplexity(node) {
        let complexity = 0;
        const visitor = (node) => {
            switch (node.type) {
                case 'IfStatement':
                case 'ForStatement':
                case 'ForInStatement':
                case 'ForOfStatement':
                case 'WhileStatement':
                case 'DoWhileStatement':
                case 'SwitchCase':
                case 'CatchClause':
                case 'ConditionalExpression':
                    complexity++;
                    break;
                case 'LogicalExpression':
                    if (node.operator === '&&' || node.operator === '||') {
                        complexity++;
                    }
                    break;
            }
            for (const key in node) {
                if (node.hasOwnProperty(key)) {
                    const child = node[key];
                    if (typeof child === 'object' && child !== null) {
                        if (Array.isArray(child)) {
                            child.forEach(visitor);
                        }
                        else {
                            visitor(child);
                        }
                    }
                }
            }
        };
        visitor(node);
        return complexity + 1; // Start with a base complexity of 1 for the function/file
    }
    isSourceFile(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        const fileName = path.basename(filePath).toLowerCase();
        const dirPath = path.dirname(filePath);
        // Check if file is in an excluded directory
        const pathParts = dirPath.split(path.sep);
        if (pathParts.some(part => BackendAnalysisService.EXCLUDED_DIRECTORIES.has(part))) {
            return false;
        }
        // Check if extension is explicitly excluded
        if (BackendAnalysisService.EXCLUDED_EXTENSIONS.has(ext)) {
            return false;
        }
        // Check if filename matches excluded patterns
        const excludedFilePatterns = [
            /^\./, // Hidden files
            /vite-env\.d\.ts$/,
            /\.config\.(js|ts|mjs|cjs)$/,
            /eslint\.config\.(js|ts|mjs|cjs)$/,
            /\.min\.(js|css)$/,
            /\.bundle\.(js|css)$/,
            /\.chunk\.(js|css)$/,
            /package-lock\.json$/,
            /yarn\.lock$/,
            /composer\.lock$/,
            /Pipfile\.lock$/,
            /\.log$/,
            /\.tmp$/,
            /\.temp$/,
            /\.cache$/,
        ];
        if (excludedFilePatterns.some(pattern => pattern.test(fileName))) {
            return false;
        }
        // Only include files that have a recognized extension
        return ext in BackendAnalysisService.EXTENSION_LANGUAGE_MAP;
    }
    // ADDED: Stricter check specifically for escomplex compatibility
    isJavaScriptFile(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        const fileName = path.basename(filePath).toLowerCase();
        const dirPath = path.dirname(filePath);
        // Reuse directory exclusion logic
        const pathParts = dirPath.split(path.sep);
        if (pathParts.some(part => BackendAnalysisService.EXCLUDED_DIRECTORIES.has(part))) {
            return false;
        }
        // Stricter check for JS/TS files that can be parsed
        const jsExts = ['.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx', '.mts', '.cts'];
        if (!jsExts.includes(ext)) {
            return false;
        }
        // Exclude config files from complex parsing
        if (fileName.endsWith('.config.js') || fileName.endsWith('.config.ts')) {
            return false;
        }
        // Exclude test files from complex parsing if needed
        if (fileName.includes('.test.') || fileName.includes('.spec.')) {
            return true; // Or false if you want to exclude them
        }
        return true;
    }
    inferModuleType(filePath) {
        const fileName = path.basename(filePath).toLowerCase();
        if (fileName.includes('service'))
            return 'service';
        if (fileName.includes('controller'))
            return 'controller';
        if (fileName.includes('component') || filePath.includes('/components/'))
            return 'component';
        if (fileName.includes('page') || filePath.includes('/pages/'))
            return 'page';
        if (fileName.includes('hook') || filePath.includes('/hooks/'))
            return 'hook';
        if (fileName.includes('util') || filePath.includes('/utils/'))
            return 'utility';
        if (fileName.includes('config'))
            return 'config';
        if (fileName.includes('test') || fileName.includes('spec'))
            return 'test';
        return 'module';
    }
    parseImports(fileContent) {
        const imports = [];
        try {
            const ast = parser.parse(fileContent, {
                sourceType: 'module',
                plugins: ['jsx', 'typescript'],
                errorRecovery: true,
            });
            for (const node of ast.program.body) {
                if (node.type === 'ImportDeclaration' && node.source.value) {
                    imports.push(node.source.value);
                }
                else if (node.type === 'ExportNamedDeclaration' && node.source?.value) {
                    imports.push(node.source.value);
                }
                else if (node.type === 'ExportAllDeclaration' && node.source?.value) {
                    imports.push(node.source.value);
                }
                else if (node.type === 'VariableDeclaration' &&
                    node.declarations.some(d => d.init?.type === 'CallExpression' &&
                        d.init.callee.type === 'Identifier' &&
                        d.init.callee.name === 'require' &&
                        d.init.arguments[0]?.type === 'StringLiteral')) {
                    const requireArg = node.declarations[0].init.arguments[0].value;
                    imports.push(requireArg);
                }
            }
        }
        catch (e) {
            // This can happen with non-standard syntax or parse errors
            // Fallback to regex for a best-effort attempt
            const regex = /from\s+['"]([^'"]+)['"]|require\(['"]([^'"]+)['"]\)/g;
            let match;
            while ((match = regex.exec(fileContent)) !== null) {
                imports.push(match[1] || match[2]);
            }
        }
        return imports;
    }
    findNodeByPath(nodes, importedPath, currentFilePath) {
        // 1. Try to resolve relative paths
        if (importedPath.startsWith('.')) {
            const currentFileDir = path.dirname(currentFilePath);
            const absolutePath = path.resolve(currentFileDir, importedPath);
            // Try to find a direct match or with common extensions
            const extensions = ['.js', '.ts', '.jsx', '.tsx', '.json', ''];
            for (const ext of extensions) {
                const potentialPath = absolutePath + ext;
                const foundNode = nodes.find(n => path.resolve(n.path) === potentialPath);
                if (foundNode)
                    return foundNode;
                // Also check for index files in directories
                const indexPath = path.join(potentialPath, 'index' + ext);
                const foundIndexNode = nodes.find(n => path.resolve(n.path) === indexPath);
                if (foundIndexNode)
                    return foundIndexNode;
            }
        }
        // 2. Try to find by module name (for non-relative paths)
        const foundNode = nodes.find(n => n.path.includes(importedPath));
        if (foundNode)
            return foundNode;
        // 3. Fallback for partial matches (e.g. 'components/Button' matching 'src/components/Button.tsx')
        const partialMatches = nodes.filter(n => {
            const normalizedNodePath = n.path.replace(/\\/g, '/');
            const normalizedImportPath = importedPath.replace(/\\/g, '/');
            return normalizedNodePath.endsWith(normalizedImportPath) ||
                normalizedNodePath.endsWith(normalizedImportPath + '.js') ||
                normalizedNodePath.endsWith(normalizedImportPath + '.ts') ||
                normalizedNodePath.endsWith(normalizedImportPath + '.jsx') ||
                normalizedNodePath.endsWith(normalizedImportPath + '.tsx');
        });
        if (partialMatches.length > 0) {
            // Prefer shorter path difference
            partialMatches.sort((a, b) => a.path.length - b.path.length);
            return partialMatches[0];
        }
        return undefined;
    }
    async analyze(repoUrl, options) {
        this.analysisWarnings = []; // Reset warnings for each new analysis
        const [owner, repo] = this.extractRepoParts(repoUrl);
        // --- Stateful Progress Manager ---
        let lastProgress = 0;
        const progressStages = {
            init: { weight: 1, progress: 0 },
            repoInfo: { weight: 4, progress: 0 },
            commits: { weight: 15, progress: 0 },
            files: { weight: 30, progress: 0 },
            quality: { weight: 10, progress: 0 },
            architecture: { weight: 10, progress: 0 },
            dependencies: { weight: 5, progress: 0 },
            pr: { weight: 5, progress: 0 },
            contributors: { weight: 5, progress: 0 },
            finalizing: { weight: 15, progress: 0 },
        };
        const sendProgress = (stage, step, stageProgress) => {
            if (!options.sendProgress)
                return;
            progressStages[stage].progress = Math.max(0, Math.min(100, stageProgress));
            let totalProgress = 0;
            for (const s in progressStages) {
                totalProgress += progressStages[s].weight * (progressStages[s].progress / 100);
            }
            const finalProgress = Math.round(totalProgress);
            if (finalProgress > lastProgress) {
                lastProgress = finalProgress;
                options.sendProgress(step, finalProgress);
            }
            else {
                // Log if progress tries to go backward, but send the last known progress to avoid UI flicker
                if (finalProgress < lastProgress) {
                    console.warn(`Progress decrease detected (from ${lastProgress}% to ${finalProgress}%) for step "${step}". Sending ${lastProgress}% instead.`);
                }
                options.sendProgress(step, lastProgress);
            }
        };
        sendProgress('init', 'Initializing analysis...', 100);
        if (!this.isValidRepoUrl(repoUrl)) {
            throw new Error('Invalid GitHub repository URL');
        }
        const branch = options.branch || 'main'; // Default to main if not provided
        sendProgress('repoInfo', 'Fetching repository metadata', 25);
        // Use batched GraphQL API for better efficiency
        console.log(`[Backend Analysis] START: Attempting batched fetch using GraphQL API`);
        const batchedData = await this.githubService.getBatchedRepositoryData(owner, repo, branch);
        const repoData = batchedData.repository;
        const files = batchedData.files;
        console.log(`[Backend Analysis] SUCCESS: Batched fetch completed - repo info + ${files.length} files`);
        sendProgress('repoInfo', 'Fetched repository metadata', 100);
        sendProgress('files', 'Fetched repository tree via GraphQL', 100);
        const basicInfo = this.transformRepoData(repoData);
        console.log(`[Backend Analysis] DONE: Processed repo info for ${basicInfo.fullName}`);
        sendProgress('files', 'Processing repository files', 10);
        // Step 3: Fetch commits
        console.log(`[Backend Analysis] START: Fetching commit history`);
        sendProgress('commits', 'Fetching commit history', 0);
        const commitsData = await this.githubService.getCommits(owner, repo, branch, 2000, (_step, progress) => sendProgress('commits', 'Fetching commit history', progress));
        const commits = this.processCommits(commitsData);
        console.log(`[Backend Analysis] DONE: Fetched and processed ${commits.length} commits`);
        sendProgress('commits', 'Fetched commit history', 100);
        // Step 4: Fetch contributors
        let contributors = [];
        if (options.contributorAnalysis) {
            console.log(`[Backend Analysis] START: Fetching contributors`);
            sendProgress('contributors', 'Fetching contributors', 0);
            const contributorsData = await this.githubService.getContributors(owner, repo);
            contributors = this.processContributors(contributorsData);
            console.log(`[Backend Analysis] DONE: Fetched and processed ${contributors.length} contributors`);
            sendProgress('contributors', 'Fetched contributor data', 100);
        }
        // Step 5: Fetch dependencies from package.json
        let dependencies = { dependencies: {}, devDependencies: {} };
        if (options.dependencies) {
            console.log(`[Backend Analysis] START: Analyzing dependencies`);
            sendProgress('dependencies', 'Analyzing dependencies', 0);
            const packageJsonFile = files.find(f => f.path === 'package.json');
            if (packageJsonFile?.content) {
                dependencies = this.parseDependencies(packageJsonFile.content);
                console.log(`[Backend Analysis] DONE: Parsed ${Object.keys(dependencies.dependencies).length} dependencies and ${Object.keys(dependencies.devDependencies).length} dev dependencies`);
                sendProgress('dependencies', 'Parsed dependencies', 100);
            }
            else {
                this.addWarning("Dependencies", "package.json not found or content is missing.");
            }
        }
        // Step 6: Analyze architecture
        let architecture = { nodes: [], links: [] };
        sendProgress('architecture', 'Detecting architecture patterns', 0);
        if (options.architecture) {
            console.log(`[Backend Analysis] START: Detecting architecture patterns`);
            architecture = await this.safeDetectArchitecturePatterns(files);
            console.log(`[Backend Analysis] DONE: Analyzed architecture, found ${architecture.nodes.length} nodes and ${architecture.links.length} links`);
            sendProgress('architecture', 'Detected architecture patterns', 100);
        }
        // Step 7: Calculate quality metrics
        let quality = {};
        sendProgress('quality', 'Calculating quality metrics', 0);
        if (options.quality) {
            console.log(`[Backend Analysis] START: Calculating quality metrics`);
            quality = await this.safeCalculateQualityMetrics(files, (step, progress) => sendProgress('quality', step, progress));
            console.log(`[Backend Analysis] DONE: Calculated quality metrics for ${Object.keys(quality).length} files`);
            sendProgress('quality', 'Calculated quality metrics', 100);
        }
        // Steps 8-19: Perform final analysis steps in parallel
        sendProgress('finalizing', 'Generating analysis data', 5);
        const analysisPromises = {};
        if (options.hotspots)
            analysisPromises.hotspots = Promise.resolve(this.generateHotspots(files, commits));
        if (options.keyFunctions)
            analysisPromises.keyFunctions = Promise.resolve(this.generateKeyFunctions(files));
        if (options.security)
            analysisPromises.securityIssues = Promise.resolve(this.generateFallbackSecurityIssues(files));
        if (options.technicalDebt)
            analysisPromises.technicalDebt = Promise.resolve(this.generateFallbackTechnicalDebt(files, quality));
        if (options.performance)
            analysisPromises.performanceMetrics = Promise.resolve(this.generateFallbackPerformanceMetrics(files));
        if (options.apiEndpoints)
            analysisPromises.apiEndpoints = Promise.resolve(this.generateFallbackAPIEndpoints(files));
        if (options.prAnalysis)
            analysisPromises.prData = this.githubService.getPullRequests(owner, repo);
        if (options.temporalCoupling)
            analysisPromises.temporalCouplingData = Promise.resolve(this.generateTemporalCouplings(commits, files));
        if (options.dataTransformation)
            analysisPromises.dataTransformationData = Promise.resolve(this.generateDataTransformationFlow(files, commits));
        if (options.gitGraph)
            analysisPromises.gitGraphData = Promise.resolve(this.generateGitGraphData(commits, contributors));
        const analysisResults = await Promise.all(Object.values(analysisPromises).map(p => p.catch(e => e)));
        const results = {};
        Object.keys(analysisPromises).forEach((key, index) => {
            results[key] = analysisResults[index];
        });
        const { hotspots = [], keyFunctions = [], securityIssues = [], technicalDebt = [], performanceMetrics = [], apiEndpoints = [], prData = [], temporalCouplingData = [], dataTransformationData = { nodes: [], links: [] }, gitGraphData = { nodes: [], links: [] }, } = results;
        console.log(`[Backend Analysis] Generated analysis results`);
        sendProgress('finalizing', 'Generated analysis data', 30);
        // AI-powered analysis
        let aiSummary;
        let aiArchitecture;
        if (this.llmService.isConfigured() && (options.aiSummary || options.aiArchitecture)) {
            const aiPromises = [];
            if (options.aiSummary) {
                aiPromises.push(this.generateAISummary(repoData, files));
            }
            else {
                aiPromises.push(Promise.resolve(undefined));
            }
            if (options.aiArchitecture) {
                aiPromises.push(this.generateAIArchitectureDescription(repoData, files, architecture));
            }
            else {
                aiPromises.push(Promise.resolve(undefined));
            }
            const [summaryResult, architectureResult] = await Promise.all(aiPromises.map(p => p.catch(e => e)));
            if (options.aiSummary) {
                if (summaryResult instanceof Error) {
                    this.addWarning('AI Summary', 'Failed to generate AI summary', summaryResult);
                }
                else {
                    aiSummary = summaryResult;
                }
                console.log('[Backend Analysis] Generated AI summary');
                sendProgress('finalizing', 'Generated AI summary', 50);
            }
            if (options.aiArchitecture) {
                if (architectureResult instanceof Error) {
                    this.addWarning('AI Architecture', 'Failed to generate AI architecture description', architectureResult);
                }
                else {
                    aiArchitecture = architectureResult;
                }
                console.log('[Backend Analysis] Generated AI architecture description');
                sendProgress('finalizing', 'Generated AI architecture description', 70);
            }
        }
        sendProgress('finalizing', 'Finalizing report', 99);
        console.log('[Backend Analysis] Analysis complete.');
        // Calculate metrics for AnalysisResult
        const sourceFiles = files.filter(f => this.isSourceFile(f.path));
        console.log(`[Backend Analysis] Processing ${files.length} total files, ${sourceFiles.length} source files for metrics`);
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const recentCommits = commits.filter(commit => new Date(commit.date) > thirtyDaysAgo).length;
        const avgComplexity = Object.values(quality).length > 0
            ? Object.values(quality).reduce((sum, q) => sum + q.complexity, 0) / Object.values(quality).length
            : 0;
        console.log(`[Backend Analysis] Quality analysis complete: ${Object.keys(quality).length} files analyzed, avg complexity: ${avgComplexity.toFixed(2)}`);
        const avgMaintainability = Object.values(quality).length > 0
            ? Object.values(quality).reduce((sum, q) => sum + q.maintainability, 0) / Object.values(quality).length
            : 0;
        // Enhanced metric calculations
        const testCoverage = this.calculateTestCoverage(files);
        const languageDistribution = this.detectLanguages(files);
        const languageCount = Object.keys(languageDistribution).length;
        console.log(`[Backend Analysis] Detected ${languageCount} languages, test coverage: ${testCoverage.toFixed(1)}%`);
        const busFactor = this.calculateBusFactor(contributors, commits);
        const securityScore = Math.max(0, 100 - securityIssues.length * 5);
        const technicalDebtScore = Math.max(0, 100 - technicalDebt.length * 2);
        const qualityScore = this.calculateQualityScore(avgMaintainability, avgComplexity, testCoverage, securityScore, technicalDebtScore);
        sendProgress('finalizing', 'Analysis complete', 100);
        return {
            id: `${repoData.fullName.replace(/\//g, '-')}-${Date.now()}`,
            repositoryUrl: `https://github.com/${repoData.fullName}`,
            createdAt: new Date().toISOString(),
            basicInfo,
            repository: repoData,
            commits,
            contributors,
            files,
            languages: languageDistribution,
            dependencies,
            dependencyGraph: architecture,
            qualityMetrics: quality,
            securityIssues,
            technicalDebt,
            performanceMetrics,
            hotspots,
            keyFunctions,
            apiEndpoints,
            aiSummary,
            architectureAnalysis: aiArchitecture,
            temporalCoupling: temporalCouplingData,
            dataTransformation: dataTransformationData,
            pullRequests: prData,
            gitGraph: gitGraphData,
            metrics: {
                totalCommits: commits.length,
                totalContributors: contributors.length,
                fileCount: files.length,
                analyzableFileCount: sourceFiles.length,
                linesOfCode: (() => {
                    const totalLOC = sourceFiles.reduce((sum, f) => {
                        if (quality[f.path])
                            return sum + quality[f.path].linesOfCode;
                        const linesFromContent = f.content?.split('\n').length || 0;
                        return sum + linesFromContent;
                    }, 0);
                    console.log(`[Backend Analysis] Calculated ${totalLOC} total lines of code from ${sourceFiles.length} source files`);
                    return totalLOC;
                })(),
                codeQuality: qualityScore,
                testCoverage: testCoverage,
                busFactor: busFactor,
                securityScore: securityScore,
                technicalDebtScore: technicalDebtScore,
                performanceScore: Math.max(0, 100 - performanceMetrics.length * 3),
                criticalVulnerabilities: securityIssues.filter((s) => s.severity === 'critical').length,
                highVulnerabilities: securityIssues.filter((s) => s.severity === 'high').length,
                mediumVulnerabilities: securityIssues.filter((s) => s.severity === 'medium').length,
                lowVulnerabilities: securityIssues.filter((s) => s.severity === 'low').length,
                totalPRs: prData.length,
                mergedPRs: prData.filter((pr) => pr.mergedAt).length,
                prMergeRate: prData.length > 0 ? prData.filter((pr) => pr.mergedAt).length / prData.length * 100 : 0,
                avgPRMergeTime: 0, // Would need actual PR analysis
                recentActivity: recentCommits,
                avgCommitsPerWeek: commits.length > 0 ? commits.length / Math.max(1, Math.ceil((new Date().getTime() - new Date(commits[commits.length - 1].date).getTime()) / (7 * 24 * 60 * 60 * 1000))) : 0,
                avgComplexity,
                filesWithComplexity: Object.keys(quality).length,
                repositorySize: this.calculateRepositorySize(files),
                languageDistribution: languageDistribution,
            },
            analysisWarnings: this.analysisWarnings,
        };
    }
    static EXTENSION_LANGUAGE_MAP = {
        // JavaScript/TypeScript
        '.ts': 'typescript',
        '.tsx': 'typescript',
        '.js': 'javascript',
        '.jsx': 'javascript',
        '.mjs': 'javascript',
        '.cjs': 'javascript',
        // HTML/CSS
        '.html': 'html',
        '.htm': 'html',
        '.css': 'css',
        '.scss': 'scss',
        '.sass': 'sass',
        '.less': 'less',
        '.styl': 'stylus',
        // Python
        '.py': 'python',
        '.pyw': 'python',
        '.pyc': 'python',
        '.pyd': 'python',
        '.pyo': 'python',
        // Java
        '.java': 'java',
        '.jar': 'java',
        '.class': 'java',
        // C#
        '.cs': 'csharp',
        // C/C++
        '.c': 'c',
        '.h': 'c',
        '.cpp': 'cpp',
        '.hpp': 'cpp',
        '.cc': 'cpp',
        // Ruby
        '.rb': 'ruby',
        // PHP
        '.php': 'php',
        // Go
        '.go': 'go',
        // Rust
        '.rs': 'rust',
        // Swift
        '.swift': 'swift',
        // Kotlin
        '.kt': 'kotlin',
        '.kts': 'kotlin',
        // Shell
        '.sh': 'shell',
        '.bash': 'shell',
        '.zsh': 'shell',
        // Other
        '.json': 'json',
        '.xml': 'xml',
        '.md': 'markdown',
        '.yml': 'yaml',
        '.yaml': 'yaml',
        '.toml': 'toml',
        '.dockerfile': 'dockerfile',
        'Dockerfile': 'dockerfile',
    };
    static EXCLUDED_EXTENSIONS = new Set([
        '.svg', '.png', '.jpg', '.jpeg', '.gif', '.ico', '.webp',
        '.woff', '.woff2', '.eot', '.ttf', '.otf',
        '.mp4', '.webm', '.ogg', '.mp3', '.wav',
        '.zip', '.gz', '.tar', '.rar',
        '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
        '.lock',
        '.log',
        '.csv',
        '.d.ts',
        '.min.js',
        '.min.css',
    ]);
    static EXCLUDED_DIRECTORIES = new Set([
        'node_modules',
        '.git',
        'dist',
        'build',
        'coverage',
        'public',
        'assets',
        'vendor',
        '.vscode',
        '.idea',
    ]);
    generateHotspots(files, commits) {
        const fileChangeCounts = {};
        commits.forEach(commit => {
            if (commit.files) {
                commit.files.forEach((file) => {
                    if (file.filename) {
                        fileChangeCounts[file.filename] = (fileChangeCounts[file.filename] || 0) + 1;
                    }
                });
            }
        });
        const hotspots = files
            .filter(f => fileChangeCounts[f.path] > 0 && f.complexity && f.complexity > 10)
            .map(f => ({
            file: f.name,
            path: f.path,
            complexity: f.complexity || 0,
            changes: fileChangeCounts[f.path],
            riskLevel: 'high',
        }))
            .sort((a, b) => b.changes * b.complexity - a.changes * a.complexity)
            .slice(0, 20);
        return hotspots;
    }
    generateKeyFunctions(files) {
        const keyFunctions = [];
        const sourceFiles = files.filter(f => this.isJavaScriptFile(f.path));
        for (const file of sourceFiles) {
            if (!file.content)
                continue;
            try {
                const ast = parser.parse(file.content, {
                    sourceType: 'module',
                    plugins: ['jsx', 'typescript', 'estree', 'doExpressions', 'objectRestSpread', 'classProperties', 'exportDefaultFrom', 'exportNamespaceFrom', 'asyncGenerators', 'dynamicImport', 'optionalChaining', 'nullishCoalescingOperator'],
                    errorRecovery: true,
                });
                const visitor = (p) => {
                    if (p.node.type === 'FunctionDeclaration' || p.node.type === 'FunctionExpression' || p.node.type === 'ArrowFunctionExpression') {
                        const functionName = p.node.id?.name || (p.parent.type === 'VariableDeclarator' && p.parent.id.type === 'Identifier' ? p.parent.id.name : 'anonymous');
                        const complexity = this.calculateComplexity(p.node);
                        if (complexity > 5) { // Threshold for "key" function
                            keyFunctions.push({
                                name: functionName,
                                file: file.path,
                                complexity: complexity,
                                explanation: `A function with complexity ${complexity}.`,
                                linesOfCode: p.node.loc.end.line - p.node.loc.start.line,
                                startLine: p.node.loc.start.line,
                                endLine: p.node.loc.end.line,
                            });
                        }
                    }
                    p.traverse(visitor);
                };
                // The traversal logic needs to be adapted for babel's new API if this doesn't work
                // This is a simplified stand-in for a proper traversal
                JSON.stringify(ast, (_key, value) => {
                    if (value && (value.type === 'FunctionDeclaration' || value.type === 'FunctionExpression' || value.type === 'ArrowFunctionExpression')) {
                        const functionName = value.id?.name || 'anonymous';
                        const complexity = this.calculateComplexity(value);
                        if (complexity > 5) {
                            keyFunctions.push({
                                name: functionName,
                                file: file.path,
                                complexity: complexity,
                                explanation: `A function with complexity ${complexity}.`,
                                linesOfCode: value.loc.end.line - value.loc.start.line,
                                startLine: value.loc.start.line,
                                endLine: value.loc.end.line,
                            });
                        }
                    }
                    return value;
                });
            }
            catch (e) {
                this.addWarning('Key Function Analysis', `Failed to parse ${file.path}`, e);
            }
        }
        keyFunctions.sort((a, b) => {
            if (b.complexity !== a.complexity) {
                return b.complexity - a.complexity;
            }
            return (b.linesOfCode || 0) - (a.linesOfCode || 0);
        });
        return keyFunctions.slice(0, 20);
    }
    generateFallbackAPIEndpoints(files) {
        const endpoints = [];
        const apiFiles = files.filter(f => f.path.includes('controller') ||
            f.path.includes('route') ||
            f.path.includes('/api/'));
        const patterns = [
            // Express-style: app.get('/path', handler)
            /(app|router)\.(get|post|put|delete|patch)\s*\(\s*['"`](.+)['"`]\s*,\s*([a-zA-Z0-9_]+)/g,
            // NestJS-style: @Get('path')
            /@(Get|Post|Put|Delete|Patch)\s*\(\s*['"`](.*?)['"`]\s*\)/g,
        ];
        const resourcePatterns = [
            /new\s+Resource\(['"](.+?)['"]\)/g
        ];
        apiFiles.forEach(file => {
            if (!file.content)
                return;
            const lines = file.content.split('\n');
            lines.forEach((line, index) => {
                patterns.forEach(pattern => {
                    let match;
                    while ((match = pattern.exec(line)) !== null) {
                        endpoints.push({
                            method: match[2].toUpperCase(),
                            path: match[3],
                            file: file.path,
                            handlerFunction: match[4] || `line ${index + 1}`,
                            description: `Endpoint discovered in ${file.path}`,
                        });
                    }
                });
            });
            // Add logic for resource patterns if needed
            let match;
            while ((match = resourcePatterns[0].exec(file.content)) !== null) {
                endpoints.push({
                    method: 'RESOURCE',
                    path: match[1],
                    file: file.path,
                    handlerFunction: 'N/A',
                    description: `Resource discovered in ${file.path}`,
                });
            }
        });
        return endpoints.slice(0, 50); // Limit results
    }
    async generateAISummary(repoData, files) {
        if (!this.llmService.isConfigured()) {
            return "LLM service not configured.";
        }
        const prompt = `
      Analyze the following repository and provide a concise executive summary.
      Repository: ${repoData.fullName}
      Description: ${repoData.description}
      Language: ${repoData.language}
      Key Files:
      ${files.slice(0, 10).map(f => `- ${f.path} (size: ${f.size} bytes)`).join('\n')}

      Based on this information, what is the primary purpose of this repository? 
      What are the key technologies used?
      What might be the main value proposition or functionality?
      Provide a summary in 3-4 sentences.
    `;
        try {
            const summary = await this.llmService.generateText(prompt);
            return summary;
        }
        catch (error) {
            this.addWarning('AI Summary', 'Failed to generate AI summary via LLM.', error);
            return 'Could not generate AI summary.';
        }
    }
    async generateAIArchitectureDescription(repoData, files, dependencyGraph) {
        if (!this.llmService.isConfigured()) {
            return "LLM service not configured.";
        }
        const prompt = `
      Analyze the architecture of the repository "${repoData.fullName}".
      Description: ${repoData.description}
      Language: ${repoData.language}
      
      File structure includes:
      ${files.slice(0, 10).map(f => `- ${f.path}`).join('\n')}
      
      Dependency graph shows ${dependencyGraph.nodes.length} nodes and ${dependencyGraph.links.length} links.
      Key nodes:
      ${dependencyGraph.nodes.slice(0, 5).map(node => `- ${node.name} (${node.type})`).join('\n')}

      Based on this, describe the likely architecture (e.g., Monolith, Microservices, MVC, Client-Server).
      What are the main components and their likely interactions?
      Provide a description in 4-5 sentences.
    `;
        try {
            const description = await this.llmService.generateText(prompt);
            return description;
        }
        catch (error) {
            this.addWarning('AI Architecture', 'Failed to generate AI architecture description via LLM.', error);
            return 'Could not generate AI architecture description.';
        }
    }
    async analyzeDependencyVulnerabilities(dependencies) {
        const allDeps = { ...dependencies.dependencies, ...dependencies.devDependencies };
        const totalDeps = Object.keys(allDeps).length;
        if (totalDeps === 0) {
            return {
                totalDependencies: 0,
                vulnerablePackages: 0,
                vulnerabilities: {},
                dependencyScore: 100,
                dependencyGraph: { nodes: [], links: [] },
                vulnerabilityDistribution: [],
            };
        }
        // This is a simulation. In a real scenario, you would use a service like Snyk, NPM audit, etc.
        const vulnerabilityData = this.simulateVulnerabilityAnalysis(allDeps);
        const vulnerablePackages = Object.keys(vulnerabilityData).length;
        const dependencyScore = this.calculateDependencyScore(vulnerabilityData, totalDeps);
        const dependencyGraph = this.generateDependencyGraph(allDeps);
        const vulnerabilityDistribution = this.generateVulnerabilityDistribution(vulnerabilityData);
        return {
            totalDependencies: totalDeps,
            vulnerablePackages,
            vulnerabilities: vulnerabilityData,
            dependencyScore,
            dependencyGraph,
            vulnerabilityDistribution,
        };
    }
    simulateVulnerabilityAnalysis(dependencies) {
        const vulnerabilities = {};
        const commonVulnerablePackages = ['express', 'lodash', 'request', 'react-scripts', 'axios'];
        Object.keys(dependencies).forEach(dep => {
            if (commonVulnerablePackages.includes(dep) && Math.random() < 0.3) {
                vulnerabilities[dep] = {
                    severity: ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)],
                    summary: `Simulated vulnerability in ${dep}`,
                    version: dependencies[dep],
                };
            }
        });
        return vulnerabilities;
    }
    calculateDependencyScore(vulnerabilityData, totalDeps) {
        const vulnerableCount = Object.keys(vulnerabilityData).length;
        return Math.round(Math.max(0, (1 - (vulnerableCount / totalDeps)) * 100));
    }
    generateDependencyGraph(dependencies) {
        const nodes = Object.keys(dependencies).map(name => ({
            id: name,
            name,
            version: dependencies[name],
        }));
        // This is a simplified graph; a real one would show inter-dependencies
        const links = Object.keys(dependencies).map(name => ({
            source: name,
            target: 'root', // Assuming a single root for simplicity
        }));
        return { nodes, links };
    }
    /**
     * Generates a distribution of vulnerabilities by severity.
     * @param vulnerabilityData - The vulnerability data.
     * @returns An array of objects with severity, count, and color.
     */
    generateVulnerabilityDistribution(vulnerabilityData) {
        const distribution = { low: 0, medium: 0, high: 0, critical: 0 };
        Object.values(vulnerabilityData).forEach((vuln) => {
            if (distribution[vuln.severity] !== undefined) {
                distribution[vuln.severity]++;
            }
        });
        return Object.entries(distribution).map(([severity, count]) => ({ severity, count, color: 'red' }));
    }
    generateTemporalCouplings(commits, files) {
        // If there are many files, use a more efficient structure-based coupling as a fallback
        if (files && files.length > 500) {
            return this.generateEnhancedStructureCouplings(files);
        }
        return this.generateCommitBasedCouplings(commits);
    }
    generateCommitBasedCouplings(commits) {
        const filePairs = new Map();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentCommits = commits.filter(c => new Date(c.date) > thirtyDaysAgo);
        recentCommits.forEach(commit => {
            const changedFiles = (commit.files || [])
                .map((f) => f.filename)
                .filter(Boolean)
                .sort();
            if (changedFiles.length > 1 && changedFiles.length < 15) { // Ignore large commits
                for (let i = 0; i < changedFiles.length; i++) {
                    for (let j = i + 1; j < changedFiles.length; j++) {
                        const key = `${changedFiles[i]}--${changedFiles[j]}`;
                        if (!filePairs.has(key)) {
                            filePairs.set(key, { files: new Set([changedFiles[i], changedFiles[j]]), count: 0 });
                        }
                        filePairs.get(key).count++;
                    }
                }
            }
        });
        const couplings = [];
        filePairs.forEach((data, key) => {
            if (data.count > 2) { // Threshold for coupling
                const [source, target] = key.split('--');
                couplings.push({
                    source,
                    target,
                    weight: data.count,
                });
            }
        });
        return couplings.sort((a, b) => b.weight - a.weight).slice(0, 50); // Limit results
    }
    generateEnhancedStructureCouplings(files) {
        const couplings = [];
        const sourceFiles = files.filter(f => this.isSourceFile(f.path));
        // 1. Directory-based coupling
        const dirGroups = new Map();
        sourceFiles.forEach(file => {
            const dir = path.dirname(file.path);
            if (!dirGroups.has(dir))
                dirGroups.set(dir, []);
            dirGroups.get(dir).push(file);
        });
        dirGroups.forEach((filesInDir, _dir) => {
            if (filesInDir.length > 1 && filesInDir.length < 15) {
                for (let i = 0; i < filesInDir.length; i++) {
                    for (let j = i + 1; j < filesInDir.length; j++) {
                        couplings.push({
                            source: filesInDir[i].path,
                            target: filesInDir[j].path,
                            weight: 2, // Structural weight
                        });
                    }
                }
            }
        });
        // 2. Component-based coupling (e.g., Button.tsx, Button.css, Button.test.tsx)
        const componentMap = this.buildComponentMap(files);
        componentMap.forEach((relatedFiles, _componentName) => {
            if (relatedFiles.length > 1) {
                for (let i = 0; i < relatedFiles.length; i++) {
                    for (let j = i + 1; j < relatedFiles.length; j++) {
                        couplings.push({
                            source: relatedFiles[i].path,
                            target: relatedFiles[j].path,
                            weight: 5, // Stronger structural weight
                        });
                    }
                }
            }
        });
        // 3. Index file coupling (e.g., index.ts exports from other files in the same dir)
        const indexFiles = sourceFiles.filter(f => path.basename(f.path).startsWith('index.'));
        indexFiles.forEach(indexFile => {
            const dir = path.dirname(indexFile.path);
            const siblingFiles = sourceFiles.filter(f => path.dirname(f.path) === dir && f !== indexFile);
            if (indexFile.content) {
                siblingFiles.forEach(sibling => {
                    const siblingName = path.basename(sibling.path, path.extname(sibling.path));
                    if (indexFile.content.includes(`./${siblingName}`)) {
                        couplings.push({
                            source: indexFile.path,
                            target: sibling.path,
                            weight: 8, // Very strong coupling
                        });
                    }
                });
            }
        });
        return this.mergeCouplingResults(couplings).slice(0, 100);
    }
    mergeCouplingResults(allCouplings) {
        const merged = new Map();
        allCouplings.forEach(coupling => {
            const key = [coupling.source, coupling.target].sort().join('--');
            const currentWeight = merged.get(key) || 0;
            merged.set(key, currentWeight + coupling.weight);
        });
        const finalCouplings = [];
        merged.forEach((weight, key) => {
            const [source, target] = key.split('--');
            finalCouplings.push({ source, target, weight });
        });
        return finalCouplings.sort((a, b) => b.weight - a.weight);
    }
    buildComponentMap(files) {
        const componentMap = new Map();
        files.forEach(file => {
            const componentName = this.extractComponentName(file.name);
            if (componentName) {
                if (!componentMap.has(componentName)) {
                    componentMap.set(componentName, []);
                }
                componentMap.get(componentName).push(file);
            }
        });
        return componentMap;
    }
    extractComponentName(fileName) {
        const match = fileName.match(/^([A-Z][a-zA-Z0-9]+)/);
        return match ? match[1] : null;
    }
    generateDataTransformationFlow(files, _commits) {
        const nodes = [];
        const links = [];
        const nodeSet = new Set();
        const addNode = (id) => {
            if (!nodeSet.has(id)) {
                nodeSet.add(id);
                nodes.push({ id });
            }
        };
        const dataFiles = files.filter(f => this.isJavaScriptFile(f.path) &&
            (f.path.includes('util') || f.path.includes('service') || f.path.includes('api') || f.path.includes('data')));
        dataFiles.slice(0, 15).forEach((file, idx) => {
            addNode(file.path);
            if (file.content) {
                const imports = this.parseImports(file.content);
                imports.forEach(importedPath => {
                    const targetNode = this.findNodeByPath(dataFiles.map(f => ({ id: f.path, path: f.path })), importedPath, file.path);
                    if (targetNode) {
                        addNode(targetNode.path);
                        links.push({
                            source: file.path,
                            target: targetNode.path,
                            value: 1, // Simplified value
                        });
                    }
                });
            }
            // Create some outgoing links for demonstration
            if (idx < dataFiles.length - 1) {
                addNode(dataFiles[idx + 1].path);
                links.push({ source: file.path, target: dataFiles[idx + 1].path, value: 1 });
            }
        });
        return { nodes, links };
    }
    generateGitGraphData(commits, _contributors) {
        const nodes = [];
        const links = [];
        commits.slice(0, 20).forEach((commit, idx) => {
            nodes.push({
                id: commit.sha,
                message: commit.message,
                author: commit.author,
                date: commit.date,
                parents: [], // This would need to be parsed from the commit data if available
            });
            if (idx > 0) {
                links.push({
                    source: commit.sha,
                    target: commits[idx - 1].sha,
                });
            }
        });
        return { nodes, links };
    }
    generateFallbackSecurityIssues(files) {
        const issues = [];
        const patterns = [
            { regex: /AWS_ACCESS_KEY_ID/g, type: 'secret', severity: 'critical', cwe: 'CWE-798' },
            { regex: /private_key/g, type: 'secret', severity: 'critical', cwe: 'CWE-798' },
            { regex: /dangerouslySetInnerHTML/g, type: 'vulnerability', severity: 'high', cwe: 'CWE-79' },
            { regex: /eval\(/g, type: 'vulnerability', severity: 'high', cwe: 'CWE-95' },
            { regex: /password\s*=\s*['"`][^'"`]+['"`]/gi, type: 'secret', severity: 'high', cwe: 'CWE-259' },
            { regex: /TODO:|FIXME:/g, type: 'configuration', severity: 'low', cwe: 'CWE-546' },
        ];
        const sourceFiles = files.filter(f => this.isSourceFile(f.path));
        sourceFiles.forEach(file => {
            if (!file.content)
                return;
            const lines = file.content.split('\n');
            lines.forEach((line, index) => {
                patterns.forEach(pattern => {
                    if (pattern.regex.test(line)) {
                        issues.push({
                            type: pattern.type,
                            severity: pattern.severity,
                            file: file.path,
                            line: index + 1,
                            description: `Potential ${pattern.type} found: ${line.trim()}`,
                            recommendation: 'Review and remove sensitive information or insecure patterns.',
                            cwe: pattern.cwe,
                            codeSnippet: line,
                        });
                    }
                });
            });
        });
        return issues;
    }
    generateFallbackTechnicalDebt(files, _quality) {
        const debt = [];
        const patterns = [
            { regex: /console\.log/g, type: 'smell', severity: 'low', effort: 'low' },
            { regex: /\/\/\s*@ts-ignore/g, type: 'smell', severity: 'medium', effort: 'medium' },
            { regex: /any/g, type: 'smell', severity: 'medium', effort: 'high' },
            { regex: /function\s*\w*\s*\([^)]*?\)\s*\{[\s\S]{500,}/g, type: 'complexity', severity: 'high', effort: 'high' }, // Long function
        ];
        const sourceFiles = files.filter(f => this.isSourceFile(f.path));
        sourceFiles.forEach(file => {
            if (!file.content)
                return;
            const lines = file.content.split('\n');
            lines.forEach((line, index) => {
                patterns.forEach(pattern => {
                    if (pattern.regex.test(line)) {
                        debt.push({
                            type: pattern.type,
                            severity: pattern.severity,
                            file: file.path,
                            line: index + 1,
                            description: `Code smell detected: ${line.trim()}`,
                            effort: pattern.effort,
                            impact: 'low',
                        });
                    }
                });
            });
        });
        // Check for duplicated code blocks (simple version)
        const codeBlocks = new Map();
        files.forEach(file => {
            if (!file.content)
                return;
            const lines = file.content.split('\n');
            for (let i = 0; i < lines.length - 5; i++) {
                const block = lines.slice(i, i + 5).join('\n');
                if (block.trim().length > 50) { // Ignore small blocks
                    if (!codeBlocks.has(block))
                        codeBlocks.set(block, []);
                    codeBlocks.get(block).push({ file: file.path, line: i + 1 });
                }
            }
        });
        codeBlocks.forEach((locations) => {
            if (locations.length > 1) {
                debt.push({
                    type: 'duplication',
                    severity: 'medium',
                    file: locations[0].file,
                    line: locations[0].line,
                    description: `Duplicated code block found in ${locations.length} locations.`,
                    effort: 'medium',
                    impact: 'medium',
                    recommendation: `Refactor duplicated code into a shared function. Other locations: ${locations.slice(1).map(l => `${l.file}:${l.line}`).join(', ')}`,
                });
            }
        });
        return debt;
    }
    generateFallbackPerformanceMetrics(files) {
        const metrics = [];
        const patterns = [
            { regex: /\.forEach\s*\(/, recommendation: 'Consider using for...of loops for better performance on large arrays.' },
            { regex: /useEffect\(\s*async/, recommendation: 'useEffect should not be async directly. Use an async function inside.' },
            { regex: /useMemo\(\s*\(\)\s*=>\s*\[\]/, recommendation: 'useMemo with an empty dependency array may not be necessary.' },
            { regex: /JSON\.parse\(JSON\.stringify\(/, recommendation: 'Deep cloning with JSON methods can be slow for large objects.' },
        ];
        const sourceFiles = files.filter(f => this.isJavaScriptFile(f.path));
        sourceFiles.forEach(file => {
            if (!file.content)
                return;
            const lines = file.content.split('\n');
            lines.forEach((line) => {
                patterns.forEach(p => {
                    if (p.regex.test(line)) {
                        metrics.push({
                            function: 'N/A',
                            file: file.path,
                            complexity: 'N/A',
                            estimatedRuntime: 'N/A',
                            recommendation: p.recommendation,
                        });
                    }
                });
            });
        });
        return metrics;
    }
    inferLayer(filePath, moduleType) {
        const pathLower = filePath.toLowerCase();
        // Backend layers
        if (pathLower.includes('controller') || pathLower.includes('api') || pathLower.includes('route')) {
            return 'presentation';
        }
        if (pathLower.includes('service') || pathLower.includes('business') || pathLower.includes('logic')) {
            return 'business';
        }
        if (pathLower.includes('repository') || pathLower.includes('dao') || pathLower.includes('database') || pathLower.includes('model')) {
            return 'data';
        }
        // Frontend layers
        if (pathLower.includes('page') || pathLower.includes('view') || pathLower.includes('screen')) {
            return 'presentation';
        }
        if (pathLower.includes('component') || pathLower.includes('ui'))
            return 'presentation';
        if (pathLower.includes('hook') || pathLower.includes('store') || pathLower.includes('context')) {
            return 'business';
        }
        // Common layers
        if (pathLower.includes('util') || pathLower.includes('helper') || pathLower.includes('lib')) {
            return 'utility';
        }
        if (pathLower.includes('config') || pathLower.includes('constant') || pathLower.includes('env')) {
            return 'infrastructure';
        }
        if (pathLower.includes('test') || pathLower.includes('spec') || pathLower.includes('__test__')) {
            return 'test';
        }
        if (pathLower.includes('middleware') || pathLower.includes('guard') || pathLower.includes('filter')) {
            return 'infrastructure';
        }
        // Fallback based on module type
        switch (moduleType) {
            case 'controller':
            case 'page':
            case 'component':
                return 'presentation';
            case 'service':
            case 'hook':
                return 'business';
            case 'utility':
                return 'utility';
            case 'config':
                return 'infrastructure';
            case 'test':
                return 'test';
            default:
                return 'business'; // Default layer
        }
    }
    /**
     * Calculate more accurate test coverage by analyzing test files and testing patterns
     */
    calculateTestCoverage(files) {
        const sourceFiles = files.filter(f => this.isSourceFile(f.path) && !this.isTestFile(f.path));
        const testFiles = files.filter(f => this.isTestFile(f.path));
        if (sourceFiles.length === 0)
            return 0;
        if (testFiles.length === 0)
            return 0;
        // Calculate based on test files vs source files ratio
        const testRatio = testFiles.length / sourceFiles.length;
        // Analyze test patterns in test files
        let testPatterns = 0;
        testFiles.forEach(file => {
            if (file.content) {
                // Count test functions/methods
                const testPatternRegex = /\b(test|it|describe|should|expect|assert)\s*\(/gi;
                const matches = file.content.match(testPatternRegex);
                testPatterns += matches ? matches.length : 0;
            }
        });
        // Estimate coverage based on test patterns and file ratio
        const estimatedCoverage = Math.min(90, (testRatio * 50) + (testPatterns / sourceFiles.length * 40));
        return Math.round(estimatedCoverage * 10) / 10; // Round to 1 decimal
    }
    /**
     * Check if a file is a test file
     */
    isTestFile(filePath) {
        const testPatterns = [
            /\.test\.(js|ts|jsx|tsx)$/i,
            /\.spec\.(js|ts|jsx|tsx)$/i,
            //__tests__\//i,
            /\/tests?\//i,
            /\.test\.py$/i,
            /\.spec\.py$/i,
            /test_.*\.py$/i,
            /.*_test\.py$/i,
            /Test\.java$/i,
            /.*Test\.java$/i,
            /.*Tests\.java$/i,
            /.*_test\.go$/i,
            /.*\.test\.cs$/i
        ];
        return testPatterns.some(pattern => pattern.test(filePath));
    }
    /**
     * Calculate more accurate repository size from files
     */
    calculateRepositorySize(files) {
        return files.reduce((total, file) => {
            if (file.size)
                return total + file.size;
            if (file.content)
                return total + Buffer.byteLength(file.content, 'utf8');
            return total;
        }, 0);
    }
    /**
     * Detect programming languages more accurately
     */
    detectLanguages(files) {
        const languages = {};
        files.forEach(file => {
            const lang = this.getLanguageFromPath(file.path);
            if (lang && lang !== 'text') {
                const size = file.size || (file.content ? Buffer.byteLength(file.content, 'utf8') : 0);
                languages[lang] = (languages[lang] || 0) + size;
            }
        });
        return languages;
    }
    /**
     * Get language from file path using extension mapping
     */
    getLanguageFromPath(filePath) {
        const extension = '.' + filePath.split('.').pop()?.toLowerCase();
        return BackendAnalysisService.EXTENSION_LANGUAGE_MAP[extension] || null;
    }
    /**
     * Calculate bus factor more accurately based on contributor distribution
     */
    calculateBusFactor(contributors, _commits) {
        if (contributors.length === 0)
            return 0;
        // Sort contributors by contribution count
        const sortedContributors = contributors.sort((a, b) => b.contributions - a.contributions);
        // Calculate cumulative contribution percentage
        const totalContributions = contributors.reduce((sum, c) => sum + c.contributions, 0);
        let cumulativePercentage = 0;
        let busFactor = 0;
        for (const contributor of sortedContributors) {
            cumulativePercentage += (contributor.contributions / totalContributions) * 100;
            busFactor++;
            // If top contributors account for 50% or more, bus factor is the count
            if (cumulativePercentage >= 50)
                break;
            // Cap at reasonable maximum
            if (busFactor >= 10)
                break;
        }
        return Math.min(busFactor, contributors.length);
    }
    /**
     * Enhanced quality score calculation
     */
    calculateQualityScore(avgMaintainability, avgComplexity, testCoverage, securityScore, technicalDebtScore) {
        // Weight different factors
        const maintainabilityWeight = 0.3;
        const complexityWeight = 0.25;
        const testCoverageWeight = 0.2;
        const securityWeight = 0.15;
        const debtWeight = 0.1;
        // Normalize complexity (lower is better)
        const normalizedComplexity = Math.max(0, 100 - (avgComplexity * 5));
        const qualityScore = (avgMaintainability * maintainabilityWeight +
            normalizedComplexity * complexityWeight +
            testCoverage * testCoverageWeight +
            securityScore * securityWeight +
            technicalDebtScore * debtWeight) / 10; // Convert to 0-10 scale
        return Math.round(qualityScore * 10) / 10;
    }
}
exports.BackendAnalysisService = BackendAnalysisService;
