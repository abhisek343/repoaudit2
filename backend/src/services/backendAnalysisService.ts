import { GitHubService } from './githubService';
import { LLMService } from './llmService';
import {
  AnalysisResult, FileInfo, LLMConfig, Repository, Commit, Contributor, BasicRepositoryInfo,
  ProcessedCommit, ProcessedContributor, DependencyInfo, ArchitectureData, QualityMetrics,
  Hotspot, KeyFunction, SecurityIssue, TechnicalDebt, PerformanceMetric, APIEndpoint,
  AnalysisWarning,  // ADDED: Import new types for advanced diagrams
  TemporalCoupling, SankeyData, SankeyNode, SankeyLink, PullRequestData, GitGraphData, GitGraphLink, GitGraphNode
} from '../types';
import * as parser from '@babel/parser';
import * as path from 'path';

export class BackendAnalysisService {
  private githubService: GitHubService;
  private llmService: LLMService;
  private analysisWarnings: AnalysisWarning[]; // Added to store warnings
  constructor(githubToken?: string, llmConfig?: LLMConfig) {
    this.githubService = new GitHubService(githubToken);
    this.analysisWarnings = []; // Initialize warnings

    let finalLlmConfig: LLMConfig;
    
    console.log('LLM Config received by BackendAnalysisService constructor:', llmConfig);

    if (llmConfig?.apiKey?.trim()) {
      finalLlmConfig = llmConfig;
      console.log('LLM Config: Using user-provided configuration.');
    } else {
      // No API key provided - LLM features will be disabled
      console.log('LLM Config: No API key provided. LLM features will be disabled.');
      finalLlmConfig = { 
        provider: 'openai', 
        apiKey: '', 
          model: llmConfig?.model 
      };
    }
    
    this.llmService = new LLMService(finalLlmConfig);
    
    // Final debug logging
    console.log('Final LLM Config used for LLMService:', finalLlmConfig);
    console.log('LLM Service isConfigured() check:', this.llmService.isConfigured());
  }

  private addWarning(step: string, message: string, error?: any) {
    this.analysisWarnings.push({
      step,
      message,
      error: error ? (error instanceof Error ? error.message : String(error)) : undefined,
    });
    console.warn(`Analysis Warning [${step}]: ${message}`, error ? error : '');
  }

  public async validateGithubToken(token: string): Promise<{ isValid: boolean; error?: string }> {
    const githubService = new GitHubService(token);
    try {
      const isValid = await githubService.verifyToken();
      if (isValid) {
        return { isValid: true };
      } else {
        return { isValid: false, error: 'Invalid GitHub token.' };
      }
    } catch (error: any) {
      return { isValid: false, error: error.message || 'Failed to validate GitHub token.' };
    }
  }

  public async validateLlmKey(llmConfig: LLMConfig): Promise<{ isValid: boolean; error?: string }> {
    const llmService = new LLMService(llmConfig);
    try {
      const isValid = await llmService.verifyKey();
      if (isValid) {
        return { isValid: true };
      } else {
        return { isValid: false, error: `Invalid API key for ${llmConfig.provider}.` };
      }
    } catch (error: any) {
      return { isValid: false, error: error.message || `Failed to validate API key for ${llmConfig.provider}.` };
    }
  }

  private isValidRepoUrl(url: string): boolean {
    return url.includes('github.com/');
  }

  private extractRepoParts(repoUrl: string): [string, string] {
    const parts = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (!parts || parts.length < 3) {
      throw new Error('Could not extract owner and repo from URL');
    }
    return [parts[1], parts[2].replace(/\.git$/, '')];
  }

  private transformRepoData(repoData: Repository): BasicRepositoryInfo {
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
  private processCommits(commits: Commit[]): ProcessedCommit[] {
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

  private processContributors(contributors: Contributor[]): ProcessedContributor[] {
    return contributors.map(c => ({
      login: c.login,
      avatarUrl: c.avatarUrl,
      contributions: c.contributions,
      profileUrl: c.html_url || `https://github.com/${c.login}`,
    }));
  }

  private parseDependencies(packageJsonContent: string): DependencyInfo {
    try {
      const parsed = JSON.parse(packageJsonContent);
      return {
        dependencies: parsed.dependencies || {},
        devDependencies: parsed.devDependencies || {},
      };
    } catch (e) {
      this.addWarning("Dependency Parsing", "Failed to parse package.json content", e);
      return { dependencies: {}, devDependencies: {} };
    }
  }  private async detectArchitecturePatterns(filesInput: FileInfo[]): Promise<ArchitectureData> {
    // Quick fallback for large repositories to avoid long processing
    if (filesInput.length > 200) {
      console.warn('[Architecture Analysis] Large repo detected; using enhanced fallback architecture analysis');
      this.addWarning('detectArchitecturePatterns', `Repository has ${filesInput.length} files; using fallback analysis`);
      return this.createEnhancedFallbackArchitecture(filesInput);
    }
    console.log(`[Architecture Analysis] Starting analysis of ${filesInput.length} files`);
    
    const nodes = filesInput.map(file => ({
      id: file.path,
      name: path.basename(file.path),
      type: this.inferModuleType(file.path),
      path: file.path,
    }));

    const links: { source: string; target: string }[] = [];
    const sourceFiles = filesInput.filter(file => this.isSourceFile(file.path));
    const filesWithContent: Array<{ file: FileInfo; content: string }> = [];

    console.log(`[Architecture Analysis] Found ${sourceFiles.length} source files out of ${filesInput.length} total files`);

    for (const file of sourceFiles) {
      if (file.content !== undefined) { // Check if content already exists
        filesWithContent.push({ file, content: file.content });
      } else {
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
           } else if (importedPath.startsWith('.')) {
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
  private async safeDetectArchitecturePatterns(filesInput: FileInfo[]): Promise<ArchitectureData> {
    const timeout = new Promise<ArchitectureData>((_, reject) =>
      setTimeout(() => reject(new Error('Architecture analysis timeout')), 45000) // Increased timeout
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
    } catch (error) {
      console.error('[Architecture Analysis] Failed:', error);
      this.addWarning('Architecture Analysis', 'Architecture analysis failed or timed out. Using enhanced fallback data.', error);
      
      // Create a more comprehensive fallback
      return this.createEnhancedFallbackArchitecture(filesInput);
    }
  }

  private createFallbackLinks(nodes: Array<{ id: string; name: string; type: string; path: string }>): Array<{ source: string; target: string }> {
    const links: Array<{ source: string; target: string }> = [];
    
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

  private createEnhancedFallbackArchitecture(filesInput: FileInfo[]): ArchitectureData {
    // Take more files for analysis, focusing on source files
    const sourceFiles = filesInput.filter(f => this.isSourceFile(f.path));
    const relevantFiles = sourceFiles.slice(0, 50); // Increased from 10
    
    const nodes = relevantFiles.map(f => ({
      id: f.path,
      name: path.basename(f.path),
      type: this.inferModuleType(f.path),
      path: f.path,
    }));

    const links = this.createFallbackLinks(nodes);
    
    console.log(`[Architecture Analysis] Enhanced fallback: ${nodes.length} nodes, ${links.length} links`);
    return { nodes, links };
  }

  /**
   * Safe wrapper for ESComplex quality metrics with robust error handling and fallback
   */
  private async safeCalculateQualityMetrics(
    repoTree: FileInfo[],
    sendProgress?: (step: string, progress: number) => void
  ): Promise<QualityMetrics> {
    const metrics: QualityMetrics = {};
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
            } catch (analysisErr) {
              this.addWarning('Quality Metrics', `Babel parser failed for ${file.path}. Using fallback.`, analysisErr);
              metrics[file.path] = {
                complexity: this.calculateFallbackComplexity(content),
                maintainability: 50,
                linesOfCode: content.split('\n').length,
              };
            }
          } else {
            metrics[file.path] = {
              complexity: this.calculateFallbackComplexity(content),
              maintainability: 75, // Higher for non-code files
              linesOfCode: content.split('\n').length,
            };
          }
        } catch (err) {
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

  private calculateFallbackComplexity(content: string): number {
    const keywords = ['if', 'else', 'for', 'while', 'switch', 'case', 'catch'];
    let complexity = 1;
    for (const kw of keywords) {
      const matches = content.match(new RegExp(`\\b${kw}\\b`, 'g'));
      complexity += matches ? matches.length : 0;
    }
    return Math.min(100, complexity);
  }
  
  private calculateComplexity(node: any): number {
    let complexity = 0;
    const visitor = (node: any) => {
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
            } else {
              visitor(child);
            }
          }
        }
      }
    };
    visitor(node);
    return complexity + 1; // Start with a base complexity of 1 for the function/file
  }

  private isSourceFile(filePath: string): boolean {
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
  private isJavaScriptFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    const fileName = path.basename(filePath).toLowerCase();
    const dirPath = path.dirname(filePath);

    // Reuse directory exclusion logic
    const pathParts = dirPath.split(path.sep);
    if (pathParts.some(part => BackendAnalysisService.EXCLUDED_DIRECTORIES.has(part))) {
      return false;
    }
    
    // Stricter extension check for JS/TS files
    const supportedExtensions = ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'];
    if (!supportedExtensions.includes(ext)) {
      return false;
    }

    // Reuse filename exclusion logic
    const excludedFilePatterns = [
      /^\./,
      /vite-env\.d\.ts$/,
      /\.config\.(js|ts|mjs|cjs)$/,
      /eslint\.config\.(js|ts|mjs|cjs)$/,
      /\.min\.js$/,
      /\.bundle\.js$/,
      /\.chunk\.js$/,
      /\.test\.(js|ts|jsx|tsx)$/,
      /\.spec\.(js|ts|jsx|tsx)$/,
      /\.d\.ts$/,
    ];

    if (excludedFilePatterns.some(pattern => pattern.test(fileName))) {
      return false;
    }

    return true;
  }

  private inferModuleType(filePath: string): string {
    const lowerPath = filePath.toLowerCase();
    if (lowerPath.includes('component')) return 'component';
    if (lowerPath.includes('service')) return 'service';
    if (lowerPath.includes('api')) return 'api';
    if (lowerPath.includes('page')) return 'page';
    if (lowerPath.includes('hook')) return 'hook';
    if (lowerPath.includes('util')) return 'utility';
    return 'module';
  }  private parseImports(fileContent: string): string[] {
    // Enhanced regex patterns to catch more import patterns
    const importPatterns = [
      // ES6 imports: import ... from '...'
      /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+)?['"]([^'"]+)['"]/g,
      // CommonJS require: require('...')
      /require\(['"]([^'"]+)['"]\)/g,
      // Dynamic imports: import('...')
      /import\(['"]([^'"]+)['"]\)/g,
      // Type imports: import type ... from '...'
      /import\s+type\s+(?:\{[^}]*\}|\w+)\s+from\s+['"]([^'"]+)['"]/g,
      // Re-exports: export ... from '...'
      /export\s+(?:(?:\{[^}]*\}|\*(?:\s+as\s+\w+)?)\s+from\s+)?['"]([^'"]+)['"]/g
    ];
    
    const imports = new Set<string>();
    const allMatches: string[] = [];
    
    for (const pattern of importPatterns) {
      let match;
      pattern.lastIndex = 0; // Reset regex state
      while ((match = pattern.exec(fileContent)) !== null) {
        const importPath = match[1];
        if (importPath) {
          allMatches.push(importPath);
          imports.add(importPath);
        }
        // Prevent infinite loop on global regex
        if (!pattern.global) break;
      }
    }

    const importsArray = Array.from(imports);
    
    // Only log if there are imports to avoid spam
    if (importsArray.length > 0) {
      console.log(`[Import Parser] Found ${importsArray.length} unique imports (${allMatches.length} total): ${importsArray.slice(0, 5).join(', ')}${importsArray.length > 5 ? '...' : ''}`);
      
      // Log relative imports specifically
      const relativeImports = importsArray.filter(imp => imp.startsWith('.'));
      if (relativeImports.length > 0) {
        console.log(`[Import Parser] Relative imports (${relativeImports.length}): ${relativeImports.join(', ')}`);
      }
    }

    return importsArray;
  }private findNodeByPath(nodes: Array<{ id: string; path: string }>, importedPath: string, currentFilePath: string): { id: string; path: string } | undefined {
    // Only process relative imports (internal dependencies)
    if (!importedPath.startsWith('.')) {
      return undefined;
    }

    const currentFileDir = path.dirname(currentFilePath);
    
    // Try to resolve the path with various extensions
    const potentialExtensions = ['.ts', '.tsx', '.js', '.jsx', '.json', '.mjs', '.cjs'];
    let resolvedPath: string | undefined;

    // Case 1: Direct path with extension
    let tempPath = path.resolve(currentFileDir, importedPath);
    if (nodes.some(n => n.path === tempPath)) {
      resolvedPath = tempPath;
    }

    // Case 2: Path without extension
    if (!resolvedPath) {
      for (const ext of potentialExtensions) {
        tempPath = path.resolve(currentFileDir, `${importedPath}${ext}`);
        if (nodes.some(n => n.path === tempPath)) {
          resolvedPath = tempPath;
          break;
        }
      }
    }

    // Case 3: Index file in a directory
    if (!resolvedPath) {
      for (const ext of potentialExtensions) {
        tempPath = path.resolve(currentFileDir, importedPath, `index${ext}`);
        if (nodes.some(n => n.path === tempPath)) {
          resolvedPath = tempPath;
          break;
        }
      }
    }
    
    // Normalize path separators for consistent matching
    if (resolvedPath) {
      resolvedPath = resolvedPath.replace(/\\/g, '/');
      const targetNode = nodes.find(n => n.path.replace(/\\/g, '/') === resolvedPath);
      if (targetNode) {
        return targetNode;
      }
    }

    // Fallback for partial matches if direct resolution fails
    const partialMatches = nodes.filter(n => {
      const normalizedNodePath = n.path.replace(/\\/g, '/');
      const normalizedImport = importedPath.replace(/\\/g, '/');
      return normalizedNodePath.endsWith(normalizedImport) || normalizedNodePath.endsWith(`${normalizedImport}.js`) || normalizedNodePath.endsWith(`${normalizedImport}.ts`);
    });

    if (partialMatches.length > 0) {
      // Prefer the shortest match as it's likely more specific
      partialMatches.sort((a, b) => a.path.length - b.path.length);
      return partialMatches[0];
    }

    return undefined;
  }
  async analyze(
    repoUrl: string,
    options: {
      useCache?: boolean;
      branch?: string;
      dependencies?: boolean;
      architecture?: boolean;
      quality?: boolean;
      security?: boolean;
      technicalDebt?: boolean;
      performance?: boolean;
      hotspots?: boolean;
      keyFunctions?: boolean;
      prAnalysis?: boolean;
      contributorAnalysis?: boolean;
      aiSummary?: boolean;
      aiArchitecture?: boolean;
      temporalCoupling?: boolean;
      dataTransformation?: boolean;
      gitGraph?: boolean;
      sendProgress?: (step: string, progress: number) => void;
    }
  ): Promise<AnalysisResult> {
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

    const sendProgress = (stage: keyof typeof progressStages, step: string, stageProgress: number) => {
      if (!options.sendProgress) return;

      progressStages[stage].progress = Math.max(0, Math.min(100, stageProgress));

      let totalProgress = 0;
      for (const s in progressStages) {
        totalProgress += progressStages[s as keyof typeof progressStages].weight * (progressStages[s as keyof typeof progressStages].progress / 100);
      }
      
      const finalProgress = Math.round(totalProgress);

      if (finalProgress > lastProgress) {
        lastProgress = finalProgress;
        options.sendProgress(step, finalProgress);
      } else {
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

    sendProgress('repoInfo', 'Fetching repository metadata', 50);
    // Step 1: Fetch repository metadata
    const repoData = await this.githubService.getRepository(owner, repo);
    const basicInfo = this.transformRepoData(repoData);
    console.log(`[Backend Analysis] DONE: Fetched basic repo info for ${basicInfo.fullName}`);
    sendProgress('repoInfo', 'Fetched repository metadata', 100);

    sendProgress('files', 'Fetching repository tree', 0);
    // Step 2: Fetch repository file tree
    console.log(`[Backend Analysis] START: Fetching repo tree for branch: ${branch}`);
    const files = await this.githubService.getRepoTree(owner, repo, branch);
    console.log(`[Backend Analysis] DONE: Fetched ${files.length} files from the repository tree`);
    sendProgress('files', 'Fetched repository tree', 10);

    // Step 3: Fetch commits
    console.log(`[Backend Analysis] START: Fetching commit history`);
    sendProgress('commits', 'Fetching commit history', 0);
    const commitsData = await this.githubService.getCommits(owner, repo, branch, 2000, (_step, progress) => sendProgress('commits', 'Fetching commit history', progress));
    const commits = this.processCommits(commitsData);
    console.log(`[Backend Analysis] DONE: Fetched and processed ${commits.length} commits`);
    sendProgress('commits', 'Fetched commit history', 100);

    // Step 4: Fetch contributors
    let contributors: ProcessedContributor[] = [];
    if (options.contributorAnalysis) {
      console.log(`[Backend Analysis] START: Fetching contributors`);
      sendProgress('contributors', 'Fetching contributors', 0);
      const contributorsData = await this.githubService.getContributors(owner, repo);
      contributors = this.processContributors(contributorsData);
      console.log(`[Backend Analysis] DONE: Fetched and processed ${contributors.length} contributors`);
     sendProgress('contributors', 'Fetched contributor data', 100);
    }

    // Step 5: Fetch dependencies from package.json
    let dependencies: DependencyInfo = { dependencies: {}, devDependencies: {} };
    if (options.dependencies) {
      console.log(`[Backend Analysis] START: Analyzing dependencies`);
      sendProgress('dependencies', 'Analyzing dependencies', 0);
      const packageJsonFile = files.find(f => f.path === 'package.json');
      if (packageJsonFile?.content) {
        dependencies = this.parseDependencies(packageJsonFile.content);
        console.log(`[Backend Analysis] DONE: Parsed ${Object.keys(dependencies.dependencies).length} dependencies and ${Object.keys(dependencies.devDependencies).length} dev dependencies`);
       sendProgress('dependencies', 'Parsed dependencies', 100);
      } else {
        this.addWarning("Dependencies", "package.json not found or content is missing.");
      }
    }

    // Step 6: Analyze architecture
    let architecture: ArchitectureData = { nodes: [], links: [] };
    sendProgress('architecture', 'Detecting architecture patterns', 0);
    if (options.architecture) {
      console.log(`[Backend Analysis] START: Detecting architecture patterns`);
      architecture = await this.safeDetectArchitecturePatterns(files);
      console.log(`[Backend Analysis] DONE: Analyzed architecture, found ${architecture.nodes.length} nodes and ${architecture.links.length} links`);
     sendProgress('architecture', 'Detected architecture patterns', 100);
    }

    // Step 7: Calculate quality metrics
    let quality: QualityMetrics = {};
    sendProgress('quality', 'Calculating quality metrics', 0);
    if (options.quality) {
      console.log(`[Backend Analysis] START: Calculating quality metrics`);
      quality = await this.safeCalculateQualityMetrics(files, (step, progress) => sendProgress('quality', step, progress));
      console.log(`[Backend Analysis] DONE: Calculated quality metrics for ${Object.keys(quality).length} files`);
     sendProgress('quality', 'Calculated quality metrics', 100);
    }

    // Step 8: Generate hotspots
    let hotspots: Hotspot[] = [];
    if (options.hotspots) {
      hotspots = this.generateHotspots(files, commits);
      console.log(`[Backend Analysis] Generated ${hotspots.length} hotspots`);
     sendProgress('finalizing', 'Generated hotspots', 5);
    }

    // Step 9: Generate key functions
    let keyFunctions: KeyFunction[] = [];
    if (options.keyFunctions) {
      keyFunctions = this.generateKeyFunctions(files);
      console.log(`[Backend Analysis] Generated ${keyFunctions.length} key functions`);
     sendProgress('finalizing', 'Generated key functions', 10);
    }

    // Step 10: Generate security issues (fallback)
    let securityIssues: SecurityIssue[] = [];
    if (options.security) {
      securityIssues = this.generateFallbackSecurityIssues(files);
      console.log(`[Backend Analysis] Generated ${securityIssues.length} fallback security issues`);
     sendProgress('finalizing', 'Generated security issues', 15);
    }

    // Step 11: Generate technical debt (fallback)
    let technicalDebt: TechnicalDebt[] = [];
    if (options.technicalDebt) {
      technicalDebt = this.generateFallbackTechnicalDebt(files, quality);
      console.log(`[Backend Analysis] Generated ${technicalDebt.length} fallback technical debt items`);
     sendProgress('finalizing', 'Generated technical debt', 20);
    }

    // Step 12: Generate performance metrics (fallback)
    let performanceMetrics: PerformanceMetric[] = [];
    if (options.performance) {
      performanceMetrics = this.generateFallbackPerformanceMetrics(files);
      console.log(`[Backend Analysis] Generated ${performanceMetrics.length} fallback performance metrics`);
     sendProgress('finalizing', 'Generated performance metrics', 25);
    }

    // Step 13: Generate API endpoints (fallback)
    const apiEndpoints = this.generateFallbackAPIEndpoints(files);
    console.log(`[Backend Analysis] Generated ${apiEndpoints.length} fallback API endpoints`);
   sendProgress('finalizing', 'Generated API endpoints', 30);

    // Step 14: Generate AI Summary
    let aiSummary: string | undefined;
    if (options.aiSummary && this.llmService.isConfigured()) {
      try {
        aiSummary = await this.generateAISummary(repoData, files);
        console.log('[Backend Analysis] Generated AI summary');
       sendProgress('finalizing', 'Generated AI summary', 50);
      } catch (e) {
        this.addWarning('AI Summary', 'Failed to generate AI summary', e);
      }
    }

    // Step 15: Generate AI Architecture Description
    let aiArchitecture: string | undefined;
    if (options.aiArchitecture && this.llmService.isConfigured()) {
      try {
        aiArchitecture = await this.generateAIArchitectureDescription(repoData, files, architecture);
        console.log('[Backend Analysis] Generated AI architecture description');
       sendProgress('finalizing', 'Generated AI architecture description', 70);
      } catch (e) {
        this.addWarning('AI Architecture', 'Failed to generate AI architecture description', e);
      }
    }
    
    // Step 16: Temporal Coupling Analysis
    let temporalCouplingData: TemporalCoupling[] = [];
    if (options.temporalCoupling) {
      try {
        temporalCouplingData = this.generateTemporalCouplings(commits, files);
        console.log(`[Backend Analysis] Generated ${temporalCouplingData.length} temporal coupling pairs`);
       sendProgress('finalizing', 'Generated temporal coupling data', 75);
      } catch (e) {
        this.addWarning('Temporal Coupling', 'Failed to generate temporal coupling data', e);
      }
    }
    
    // Step 17: Data Transformation Flow
    let dataTransformationData: SankeyData = { nodes: [], links: [] };
    if (options.dataTransformation) {
      try {
        dataTransformationData = this.generateDataTransformationFlow(files, commits);
        console.log(`[Backend Analysis] Generated data transformation flow with ${dataTransformationData.nodes.length} nodes and ${dataTransformationData.links.length} links`);
       sendProgress('finalizing', 'Generated data transformation flow', 80);
      } catch (e) {
        this.addWarning('Data Transformation', 'Failed to generate data transformation flow', e);
      }
    }
    
    // Step 18: Pull Request Analysis
    let prData: PullRequestData[] = [];
    if (options.prAnalysis) {
      try {
        sendProgress('pr', 'Analyzing pull requests', 0);
        prData = await this.githubService.getPullRequests(owner, repo);
        console.log(`[Backend Analysis] Fetched ${prData.length} pull requests`);
       sendProgress('pr', 'Fetched pull requests', 100);
      } catch (e) {
        this.addWarning('Pull Request Analysis', 'Failed to fetch pull request data', e);
      }
    }

    // Step 19: Git Graph Data
    let gitGraphData: GitGraphData = { nodes: [], links: [] };
    if (options.gitGraph) {
      try {
        gitGraphData = this.generateGitGraphData(commits, contributors);
        console.log(`[Backend Analysis] Generated git graph with ${gitGraphData.nodes.length} nodes and ${gitGraphData.links.length} links`);
       sendProgress('finalizing', 'Generated git graph data', 85);
      } catch (e) {
        this.addWarning('Git Graph', 'Failed to generate git graph data', e);
      }
    }

   sendProgress('finalizing', 'Finalizing report', 99);
    console.log('[Backend Analysis] Analysis complete.');
    
    // Calculate metrics for AnalysisResult
    const sourceFiles = files.filter(f => this.isSourceFile(f.path));
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const recentCommits = commits.filter(commit => new Date(commit.date) > thirtyDaysAgo).length;
    const avgComplexity = Object.values(quality).length > 0
      ? Object.values(quality).reduce((sum, q) => sum + q.complexity, 0) / Object.values(quality).length
      : 0;
    const avgMaintainability = Object.values(quality).length > 0
      ? Object.values(quality).reduce((sum, q) => sum + q.maintainability, 0) / Object.values(quality).length
      : 0;
    
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
      languages: await this.githubService.getLanguages(owner, repo),
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
        linesOfCode: sourceFiles.reduce((sum, f) => {
          if (quality[f.path]) return sum + quality[f.path].linesOfCode;
          return sum + (f.content?.split('\n').length || 0);
        }, 0),
        codeQuality: avgMaintainability,
        testCoverage: 0, // Default value - would need actual test analysis
        busFactor: Math.min(contributors.length, 5),
        securityScore: Math.max(0, 100 - securityIssues.length * 5),
        technicalDebtScore: Math.max(0, 100 - technicalDebt.length * 2),
        performanceScore: Math.max(0, 100 - performanceMetrics.length * 3),
        criticalVulnerabilities: securityIssues.filter(s => s.severity === 'critical').length,
        highVulnerabilities: securityIssues.filter(s => s.severity === 'high').length,
        mediumVulnerabilities: securityIssues.filter(s => s.severity === 'medium').length,
        lowVulnerabilities: securityIssues.filter(s => s.severity === 'low').length,
        totalPRs: prData.length,
        mergedPRs: prData.filter(pr => pr.mergedAt).length,
        prMergeRate: prData.length > 0 ? prData.filter(pr => pr.mergedAt).length / prData.length * 100 : 0,
        avgPRMergeTime: 0, // Would need actual PR analysis
        recentActivity: recentCommits,
        avgCommitsPerWeek: commits.length > 0 ? commits.length / Math.max(1, Math.ceil((new Date().getTime() - new Date(commits[commits.length - 1].date).getTime()) / (7 * 24 * 60 * 60 * 1000))) : 0,
        avgComplexity,
        filesWithComplexity: Object.keys(quality).length,
      },
      analysisWarnings: this.analysisWarnings,
    };
  }
  private static EXTENSION_LANGUAGE_MAP: Record<string, string> = {
    // JavaScript/TypeScript
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.mjs': 'javascript',
    '.cjs': 'javascript',
    
    // Python
    '.py': 'python',
    '.pyw': 'python',
    '.pyi': 'python',
    
    // Java ecosystem
    '.java': 'java',
    '.kt': 'kotlin',
    '.kts': 'kotlin',
    '.scala': 'scala',
    '.groovy': 'groovy',
    
    // C/C++
    '.c': 'c',
    '.cpp': 'cpp',
    '.cxx': 'cpp',
    '.cc': 'cpp',
    '.h': 'c',
    '.hpp': 'cpp',
    '.hxx': 'cpp',
    
    // C#/.NET
    '.cs': 'csharp',
    '.vb': 'vbnet',
    '.fs': 'fsharp',
    
    // Web languages
    '.php': 'php',
    '.rb': 'ruby',
    '.go': 'go',
    '.rs': 'rust',
    '.swift': 'swift',
    '.dart': 'dart',
    '.lua': 'lua',
    '.r': 'r',
    '.m': 'objectivec',
    '.mm': 'objectivec',
    
    // Functional languages
    '.hs': 'haskell',
    '.elm': 'elm',
    '.clj': 'clojure',
    '.cljs': 'clojure',
    '.ml': 'ocaml',
    '.ex': 'elixir',
    '.exs': 'elixir',
    
    // Shell scripting
    '.sh': 'bash',
    '.bash': 'bash',
    '.zsh': 'zsh',
    '.fish': 'fish',
    '.ps1': 'powershell',
    '.bat': 'batch',
    '.cmd': 'batch',
    
    // Database
    '.sql': 'sql',
    '.plsql': 'plsql',
    '.psql': 'postgresql',
    
    // Configuration/Data
    '.json': 'json',
    '.yaml': 'yaml',
    '.yml': 'yaml',
    '.toml': 'toml',
    '.xml': 'xml',
    '.ini': 'ini',
    '.cfg': 'ini',
    '.conf': 'conf',
    
    // Markup/Styling
    '.html': 'html',
    '.htm': 'html',
    '.css': 'css',
    '.scss': 'scss',
    '.sass': 'sass',
    '.less': 'less',
    '.md': 'markdown',
    '.mdx': 'mdx',
    '.tex': 'latex',
      // Mobile
    // Note: .java and .kt already defined above for general use
    // .swift already defined above
    // .dart already defined above
    
    // Infrastructure
    '.tf': 'terraform',
    '.hcl': 'hcl',
    '.dockerfile': 'dockerfile',
    '.dockerignore': 'dockerignore',
    '.k8s': 'kubernetes',
    // Note: .yaml already defined above
  };

  // Comprehensive exclusion list for non-source files
  private static EXCLUDED_EXTENSIONS = new Set([
    // Images
    '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp', '.bmp', '.tiff',
    // Media files
    '.mp3', '.wav', '.mp4', '.avi', '.mov', '.wmv', '.flv', '.ogg', '.webm',
    // Fonts
    '.ttf', '.woff', '.woff2', '.eot', '.otf',
    // Documents
    '.pdf', '.docx', '.doc', '.pptx', '.ppt', '.xlsx', '.xls',
    // Build artifacts & minified files
    '.map', '.min.js', '.min.css', '.bundle.js', '.chunk.js',
    // Type declarations & test files
    '.d.ts', '.test.js', '.test.ts', '.test.jsx', '.test.tsx',
    '.spec.js', '.spec.ts', '.spec.jsx', '.spec.tsx',
    // Logs, temp, lock files
    '.log', '.tmp', '.temp', '.bak', '.swp', '.swo', '.lock',
    // Binaries & archives
    '.exe', '.dll', '.so', '.dylib', '.bin', '.obj', '.o',
    '.zip', '.tar', '.gz', '.rar', '.7z', '.bz2', '.xz',
    // IDE & system files
    '.DS_Store', '.thumbs.db', '.gitkeep', '.gitignore',
    // Package manager files
    'package-lock.json', 'yarn.lock', 'composer.lock', 'Pipfile.lock',
  ]);

  // Excluded directory patterns
  private static EXCLUDED_DIRECTORIES = new Set([
    'node_modules', '.git', '.svn', '.hg',
    'dist', 'build', 'out', 'target', 'bin',
    'coverage', '.nyc_output', '.coverage',
    '.cache', '.temp', '.tmp',
    '__pycache__', '.pytest_cache',
    '.idea', '.vscode', '.vs',
    'vendor', 'third_party',
  ]);
  // detectLanguage method removed - was unused


  private generateHotspots(files: FileInfo[], commits: ProcessedCommit[]): Hotspot[] {
    const fileChangeCounts = new Map<string, number>();
    commits.forEach(commit => {
      commit.files.forEach((file: any) => {
        fileChangeCounts.set(file.filename, (fileChangeCounts.get(file.filename) || 0) + 1);
      });
    });

    return files
      .map(f => ({
        file: f.path,
        path: f.path,
        complexity: 0, // Placeholder
        changes: fileChangeCounts.get(f.path) || 0,
        riskLevel: 'low' as "low" | "medium" | "high" | "critical", // Placeholder
      }))
      .filter(h => h.changes > 0)
      .sort((a, b) => b.changes - a.changes)
      .slice(0, 20);
  }

  private generateKeyFunctions(files: FileInfo[]): KeyFunction[] {
    const keyFunctions: KeyFunction[] = [];
    const sourceFiles = files.filter(f => this.isSourceFile(f.path));

    for (const file of sourceFiles) {
      if (!file.content) continue;

      const lines = file.content.split('\n');
      // Simple function detection (can be improved with AST)
      const functionRegex = /(function\s+\w+|\w+\s*=\s*function|\w+\s*=\s*\(.*\)\s*=>)/g;
      
      for (let i = 0; i < lines.length; i++) {
        if (functionRegex.test(lines[i])) {
          keyFunctions.push({
            name: lines[i].trim().substring(0, 50), // Basic name extraction
            file: file.path,
            complexity: 0, // Placeholder
            explanation: 'Function identified by simple regex.',
            startLine: i + 1,
            endLine: i + 1,
          });
        }
      }
    }
    
    // Sort by file and line number
    keyFunctions.sort((a, b) => {
      if (a.file < b.file) return -1;
      if (a.file > b.file) return 1;
      return (a.startLine || 0) - (b.startLine || 0);
    });

    return keyFunctions.slice(0, 50); // Limit to a reasonable number
  }
  // calculateMetrics method removed - was unused

    private generateFallbackAPIEndpoints(files: FileInfo[]): APIEndpoint[] {
      const endpoints: APIEndpoint[] = [];
      const apiFiles = files.filter(f => 
        this.isSourceFile(f.path) &&
        (f.path.includes('controller') || f.path.includes('route') || f.path.includes('api'))
      );

      apiFiles.forEach(file => {
        if (!file.content) return;
        const lines = file.content.split('\n');
        
        // Pattern for decorators like @Get("/users")
        const patterns = [
          { regex: /@(Get|Post|Put|Delete|Patch)\("([^"]+)"\)/, methodIndex: 1, pathIndex: 2 },
          { regex: /(app|router)\.(get|post|put|delete|patch)\(['"]([^'"]+)['"]/, methodIndex: 2, pathIndex: 3 }
        ];

        lines.forEach((line) => {
          patterns.forEach(pattern => {
            const match = line.match(pattern.regex);
            if (match) {
              endpoints.push({
                path: match[pattern.pathIndex],
                method: match[pattern.methodIndex].toUpperCase(),
                file: file.path,
                handlerFunction: 'unknown',
              });
            }
          });
        });

        // Pattern for resource-based routes (e.g., users.controller.ts)
        const resourcePatterns = [
          /(\w+)\.controller\./,
          /(\w+)\.routes\./,
          /routes\/(\w+)\.js/
        ];
        
        resourcePatterns.forEach(resource => {
          const match = file.path.match(resource);
          if (match) {
            const resourceName = match[1];
            if (!endpoints.some(e => e.path.includes(resourceName))) {
              endpoints.push({
                path: `/${resourceName}`,
                method: 'GET',
                file: file.path,
                handlerFunction: 'unknown',
              });
            }
          }
        });
      });

      return endpoints.slice(0, 50); // Limit results
    }

    // inferArchitecturePattern method removed - was unused

    // generateDependencyWheelData method removed - was unused

    // generateFileSystemTree method removed - was unused

    // generateChurnSunburstData method removed - was unused

    // generateContributorStreamData method removed - was unused

  private async generateAISummary(repoData: Repository, files: FileInfo[]): Promise<string> {
    if (!this.llmService.isConfigured()) {
      this.addWarning('AI Summary', 'LLM service not configured, skipping AI summary.');
      return "AI summary not available.";
    }
    try {
      const prompt = `
        Analyze the following repository and provide a concise executive summary.
        Repository: ${repoData.fullName}
        Description: ${repoData.description}
        Language: ${repoData.language}
        
        Key files:
        ${files.slice(0, 5).map(f => `- ${f.path} (${f.size} bytes)`).join('\n')}
        
        Focus on the project's purpose, main technologies, and overall structure.
      `;
      const summary = await this.llmService.generateText(prompt);
      return summary;
    } catch (error) {
      this.addWarning('AI Summary', 'Failed to generate AI summary', error);
      return "Error generating AI summary.";
    }
  }

  private async generateAIArchitectureDescription(repoData: Repository, files: FileInfo[], dependencyGraph: ArchitectureData): Promise<string> {
    if (!this.llmService.isConfigured()) {
      this.addWarning('AI Architecture', 'LLM service not configured, skipping AI architecture description.');
      return "AI architecture description not available.";
    }
    try {
      const prompt = `
        Analyze the architecture of the repository "${repoData.fullName}".
        
        Description: ${repoData.description}
        Primary Language: ${repoData.language}
        
        File structure overview:
        ${files.slice(0, 10).map(f => `- ${f.path}`).join('\n')}
        
        Dependency Graph (top 5 nodes and their connections):
        ${dependencyGraph.nodes.slice(0, 5).map(node => {
          const connections = dependencyGraph.links.filter(l => l.source === node.id).map(l => l.target).join(', ');
          return `- ${node.name}: connects to [${connections || 'none'}]`;
        }).join('\n')}
        
        Based on this information, describe the likely software architecture pattern (e.g., Monolith, Microservices, MVC, Layered, etc.) and explain your reasoning. Identify key components and their interactions.
      `;
      const description = await this.llmService.generateText(prompt);
      return description;
    } catch (error) {
      this.addWarning('AI Architecture', 'Failed to generate AI architecture description', error);
      return "Error generating AI architecture description.";
    }
  }

    async analyzeDependencyVulnerabilities(dependencies: DependencyInfo): Promise<any> {
      const allDeps = { ...dependencies.dependencies, ...dependencies.devDependencies };
      const totalDeps = Object.keys(allDeps).length;
      
      if (totalDeps === 0) {
        return {
          vulnerabilityScore: 100,
          vulnerabilityData: {},
          dependencyGraph: { nodes: [], links: [] },
          vulnerabilityDistribution: {},
        };
      }

      // In a real scenario, you would call an API like Snyk, NPM audit, etc.
      // For this example, we'll simulate the analysis.
      const vulnerabilityData = this.simulateVulnerabilityAnalysis(allDeps);
      const vulnerabilityScore = this.calculateDependencyScore(vulnerabilityData, totalDeps);
      const dependencyGraph = this.generateDependencyGraph(allDeps);
      const vulnerabilityDistribution = this.generateVulnerabilityDistribution(vulnerabilityData);

      return {
        vulnerabilityScore,
        vulnerabilityData,
        dependencyGraph,
        vulnerabilityDistribution,
      };
    }

    private simulateVulnerabilityAnalysis(dependencies: Record<string, string>) {
      const vulnerabilities: any = {};
      const severities = ['low', 'medium', 'high', 'critical'];
      
      Object.keys(dependencies).forEach(dep => {
        if (Math.random() < 0.2) { // 20% chance of having a vulnerability
          vulnerabilities[dep] = {
            severity: severities[Math.floor(Math.random() * severities.length)],
            summary: `Simulated vulnerability in ${dep}`,
            vulnerableVersions: `< ${dependencies[dep]}`,
          };
        }
      });
      return vulnerabilities;
    }

    private calculateDependencyScore(vulnerabilityData: any, totalDeps: number): number {
      const vulnerableCount = Object.keys(vulnerabilityData).length;
      const score = Math.max(0, 100 - (vulnerableCount / totalDeps) * 100);
      return Math.round(score);
    }

    private generateDependencyGraph(dependencies: Record<string, string>) {
      const nodes = Object.keys(dependencies).map(name => ({
        id: name,
        label: name,
        value: 1, // Can be adjusted based on usage, etc.
      }));
      
      // In a real scenario, you'd parse package-lock.json or similar for inter-dependencies
      // For now, we'll create some random links for visualization
      const links = Object.keys(dependencies).map(name => ({
        source: name,
        target: Object.keys(dependencies)[Math.floor(Math.random() * Object.keys(dependencies).length)],
      })).filter(link => link.source !== link.target);

      return { nodes, links };
    }

     /**
      * Generates a distribution of vulnerabilities by severity.
      */  private generateVulnerabilityDistribution(vulnerabilityData: any) {
      const distribution = { low: 0, medium: 0, high: 0, critical: 0 };
      Object.values(vulnerabilityData).forEach((vuln: any) => {
        const severity = vuln.severity as keyof typeof distribution;
        if (distribution[severity] !== undefined) {
          distribution[severity]++;
        }
      });
      return distribution;
    }

    private generateTemporalCouplings(commits: ProcessedCommit[], files?: FileInfo[]): TemporalCoupling[] {
      const commitBasedCouplings = this.generateCommitBasedCouplings(commits);
      
      let structureBasedCouplings: TemporalCoupling[] = [];
      if (files) {
        structureBasedCouplings = this.generateEnhancedStructureCouplings(files);
      }
      
      // Merge and weigh the results
      const allCouplings = [...commitBasedCouplings, ...structureBasedCouplings];
      return this.mergeCouplingResults(allCouplings);
    }

    private generateCommitBasedCouplings(commits: ProcessedCommit[]): TemporalCoupling[] {
      const filePairs = new Map<string, { count: number; dates: Date[] }>();
      const fileCommitCounts = new Map<string, number>();

      // Limit to recent commits for performance and relevance
      const recentCommits = commits.slice(0, 500);

      recentCommits.forEach(commit => {
        const files = commit.files.map((f: any) => f.filename).sort();
        if (files.length > 1 && files.length < 20) { // Ignore very large commits
          for (let i = 0; i < files.length; i++) {
            fileCommitCounts.set(files[i], (fileCommitCounts.get(files[i]) || 0) + 1);
            for (let j = i + 1; j < files.length; j++) {
              const key = `${files[i]}|||${files[j]}`;
              const pairData = filePairs.get(key) || { count: 0, dates: [] };
              pairData.count++;
              pairData.dates.push(new Date(commit.date));
              filePairs.set(key, pairData);
            }
          }
        }
      });

      const couplings: TemporalCoupling[] = [];
      // Could track recent changes: const ninetyDaysAgo = new Date(new Date().setDate(new Date().getDate() - 90));

      filePairs.forEach((data, key) => {
        const [file1, file2] = key.split('|||');
        const totalCommits1 = fileCommitCounts.get(file1) || 1;
        const totalCommits2 = fileCommitCounts.get(file2) || 1;
        
        // Jaccard index style metric
        const strength = data.count / (totalCommits1 + totalCommits2 - data.count);

        if (strength > 0.1) { // Threshold to reduce noise
            // Could track recent changes for instability: const recentChanges = data.dates.filter(date => date > ninetyDaysAgo).length;

            couplings.push({
                source: file1,
                target: file2,
                weight: Math.round(strength * 100) / 100,
            });
        }
      });

      return couplings.sort((a, b) => b.weight - a.weight).slice(0, 100); // Limit results
    }

    private generateEnhancedStructureCouplings(files: FileInfo[]): TemporalCoupling[] {
      const couplings: TemporalCoupling[] = [];
      const sourceFiles = files.filter(f => this.isSourceFile(f.path));
      
      // 1. Directory-based coupling
      const dirGroups = new Map<string, FileInfo[]>();
      sourceFiles.forEach(file => {
        const dir = path.dirname(file.path);
        if (!dirGroups.has(dir)) {
          dirGroups.set(dir, []);
        }
        dirGroups.get(dir)!.push(file);
      });

      dirGroups.forEach((filesInDir, _dir) => {
        if (filesInDir.length > 1 && filesInDir.length < 15) {
          for (let i = 0; i < filesInDir.length; i++) {
            for (let j = i + 1; j < filesInDir.length; j++) {
              couplings.push({
                source: filesInDir[i].path,
                target: filesInDir[j].path,
                weight: 0.3, // Base strength for directory coupling
              });
            }
          }
        }
      });

      // 2. Component-based coupling (e.g., Button.tsx, Button.css, Button.test.tsx)
      const componentMap = this.buildComponentMap(sourceFiles);
      componentMap.forEach((relatedFiles, _componentName) => {
        if (relatedFiles.length > 1) {
          for (let i = 0; i < relatedFiles.length; i++) {
            for (let j = i + 1; j < relatedFiles.length; j++) {
              couplings.push({
                source: relatedFiles[i].path,
                target: relatedFiles[j].path,
                weight: 0.5, // Higher strength for component coupling
              });
            }
          }
        }
      });

      // 3. Index file coupling (e.g., index.ts imports and exports from siblings)
      const indexFiles = sourceFiles.filter(f => 
        path.basename(f.path).match(/index\.(js|ts|jsx|tsx)$/)
      );
      indexFiles.forEach(indexFile => {
        const dir = path.dirname(indexFile.path);
        const siblingFiles = sourceFiles.filter(f => path.dirname(f.path) === dir && f.path !== indexFile.path);
        
        siblingFiles.forEach(sibling => {
          if (indexFile.content && indexFile.content.includes(path.basename(sibling.path, path.extname(sibling.path)))) {
            couplings.push({
              source: indexFile.path,
              target: sibling.path,
              weight: 0.6,
            });
          }
        });
      });

      return couplings;
    }

    private mergeCouplingResults(allCouplings: TemporalCoupling[]): TemporalCoupling[] {
      const merged = new Map<string, TemporalCoupling>();

      allCouplings.forEach(coupling => {
        const key = [coupling.source, coupling.target].sort().join('|||');
        const existing = merged.get(key);

        if (existing) {
          existing.weight = Math.min(1, existing.weight + coupling.weight);
        } else {
          merged.set(key, { ...coupling });
        }
      });

      return Array.from(merged.values()).sort((a, b) => b.weight - a.weight).slice(0, 150);
    }

    private buildComponentMap(files: FileInfo[]): Map<string, FileInfo[]> {
      const componentMap = new Map<string, FileInfo[]>();
      files.forEach(file => {
        const componentName = this.extractComponentName(file.path);
        if (componentName) {
          if (!componentMap.has(componentName)) {
            componentMap.set(componentName, []);
          }
          componentMap.get(componentName)!.push(file);
        }
      });
      return componentMap;
    }

    private extractComponentName(fileName: string): string | null {
      const baseName = path.basename(fileName, path.extname(fileName));
      // Handles cases like Button.stories.tsx, Button.test.tsx
      const match = baseName.match(/^([A-Z][a-zA-Z0-9]+)/);
      return match ? match[1] : null;
    }

    // haveSimilarNames and areTestAndSource methods removed - were unused

    private generateDataTransformationFlow(files: FileInfo[], _commits: ProcessedCommit[]): SankeyData {
      const nodes: SankeyNode[] = [];
      const links: SankeyLink[] = [];
      const dataKeywords = ['api', 'service', 'store', 'database', 'repository', 'client'];
      
      const dataFiles = files.filter(f => 
        this.isSourceFile(f.path) &&
        (dataKeywords.some(kw => f.path.includes(kw)) || f.path.endsWith('.sql'))
      );

      if (dataFiles.length < 2) {
        return { nodes: [], links: [] };
      }

      // Create nodes
      dataFiles.slice(0, 15).forEach(file => {
        nodes.push({ id: file.path });
      });

      // Create links based on import analysis (simplified)
      dataFiles.slice(0, 15).forEach((file, idx) => {
        if (file.content) {
          const imports = this.parseImports(file.content);
          imports.forEach(importedPath => {
            const targetNode = this.findNodeByPath(nodes.map(n => ({...n, path: n.id})), importedPath, file.path);
            if (targetNode && targetNode.id !== file.path) {
              links.push({
                source: file.path,
                target: targetNode.id,
                value: 10 // Default value
              });
            }
          });
        }
        // Create a fallback link to the next file if no imports found
        if (idx > 0 && !links.some(l => l.source === file.path || l.target === file.path)) {
            links.push({ source: dataFiles[idx - 1].path, target: file.path, value: 5 });
        }
      });

      return { nodes, links };
    }

    private generateGitGraphData(commits: ProcessedCommit[], _contributors: ProcessedContributor[]): GitGraphData {
      const nodes: GitGraphNode[] = [];
      const links: GitGraphLink[] = [];
      // Future: could track branch heads: const branchHeads = new Map<string, string>();

      // Simplified: assume linear history for now
      commits.slice(0, 20).forEach((commit, idx) => {
        nodes.push({
          id: commit.sha,
          message: commit.message.split('\n')[0].substring(0, 30),
          author: commit.author,
          date: commit.date,
          parents: idx > 0 ? [commits[idx - 1].sha] : [],
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

  private generateFallbackSecurityIssues(files: FileInfo[]): SecurityIssue[] {
    const issues: SecurityIssue[] = [];
    const patterns = [
      { pattern: /dangerouslySetInnerHTML/g, severity: 'high', description: 'Potential XSS vulnerability via dangerouslySetInnerHTML.' },
      { pattern: /eval\(/g, severity: 'high', description: 'Use of eval can lead to arbitrary code execution.' },
      { pattern: /new Buffer/g, severity: 'medium', description: 'new Buffer() is deprecated and can be insecure.' },
      { pattern: /process.env\./g, severity: 'low', description: 'Direct access to environment variables can expose sensitive data.' },
      { pattern: /<a target="_blank"/g, severity: 'medium', description: 'Missing rel="noopener noreferrer" on target="_blank" links.' },
    ] as const;

    const sourceFiles = files.filter(f => this.isSourceFile(f.path));

    sourceFiles.forEach(file => {
      if (!file.content) return;
      const lines = file.content.split('\n');
      lines.forEach((line, index) => {
        patterns.forEach(pattern => {
          if (pattern.pattern.test(line)) {
            issues.push({
              type: 'vulnerability',
              severity: pattern.severity as 'low' | 'medium' | 'high' | 'critical',
              file: file.path,
              line: index + 1,
              description: pattern.description,
              recommendation: 'Review and fix security issue',
            });
          }
        });
      });
    });

    return issues.slice(0, 100); // Limit results
  }

  private generateFallbackTechnicalDebt(files: FileInfo[], _quality: QualityMetrics): TechnicalDebt[] {
    const debt: TechnicalDebt[] = [];
    const patterns = [
      { pattern: /\/\/\s*TODO/gi, effort: '2', type: 'documentation', description: 'TODO comment found.' },
      { pattern: /\/\/\s*FIXME/gi, effort: '3', type: 'smell', description: 'FIXME comment found.' },
      { pattern: /\/\/\s*HACK/gi, effort: '5', type: 'smell', description: 'HACK comment found.' },
      { pattern: /console\.log/g, effort: '1', type: 'smell', description: 'console.log statement found.' },
    ] as const;

    const sourceFiles = files.filter(f => this.isSourceFile(f.path));

    sourceFiles.forEach(file => {
      if (!file.content) return;
      const lines = file.content.split('\n');
      lines.forEach((line, index) => {
        patterns.forEach(pattern => {
          if (pattern.pattern.test(line)) {
            debt.push({
              file: file.path,
              line: index + 1,
              type: pattern.type as 'complexity' | 'duplication' | 'smell' | 'outdated' | 'documentation',
              severity: 'medium',
              effort: pattern.effort,
              impact: 'Low',
              description: pattern.description,
            });
          }
        });
      });
    });
    
    // Debt from duplicated code (simple check)
    const codeBlocks = new Map<string, { file: string, line: number }[]>();
    files.forEach(file => {
      if (!file.content) return;
      const lines = file.content.split('\n');
      lines.forEach((line, index) => {
        if (line.trim().length > 20) { // Only check substantial lines
          const trimmed = line.trim();
          if (!codeBlocks.has(trimmed)) {
            codeBlocks.set(trimmed, []);
          }
          codeBlocks.get(trimmed)!.push({ file: file.path, line: index + 1 });
        }
      });
    });

    codeBlocks.forEach((locations) => {
      if (locations.length > 1) {
        locations.forEach(loc => {
          debt.push({
            file: loc.file,
            line: loc.line,
            type: 'duplication',
            severity: 'medium',
            effort: '3',
            impact: 'Medium',
            description: `Duplicate code found in ${locations.length} locations`,
          });
        });
      }
    });

    return debt.slice(0, 100);
  }

  private generateFallbackPerformanceMetrics(files: FileInfo[]): PerformanceMetric[] {
    const metrics: PerformanceMetric[] = [];
    const patterns = [
      { pattern: /for\s*\(.*\.length/g, fileTypes: ['.js', '.ts'], suggestion: 'Cache array length' },
      { pattern: /document\.getElementById/g, fileTypes: ['.js', '.ts'], suggestion: 'Consider caching DOM elements' },
      { pattern: /\+\s*["']/g, fileTypes: ['.js', '.ts'], suggestion: 'Use template literals instead of string concatenation' },
      { pattern: /new\s+Date\(\)/g, fileTypes: ['.js', '.ts'], suggestion: 'Consider using Date.now() for timestamps' },
    ];

    const sourceFiles = files.filter(f => this.isSourceFile(f.path));

    sourceFiles.forEach(file => {
      const ext = path.extname(file.path);
      if (!file.content) return;
      const lines = file.content.split('\n');
      lines.forEach((line) => {
        patterns.forEach(p => {
          if (p.fileTypes.includes(ext) && p.pattern.test(line)) {
            metrics.push({
              file: file.path,
              function: 'unknown',
              complexity: 'N/A',
              estimatedRuntime: 'N/A',
              recommendation: p.suggestion,
            });
          }
        });
      });
    });

    return metrics.slice(0, 100);
  }
}
