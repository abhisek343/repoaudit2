import { GitHubService } from './githubService';
import { LLMService } from './llmService';
import { AdvancedAnalysisService } from './advancedAnalysisService';
import {
  AnalysisResult,
  FileInfo,
  LLMConfig,
  Repository,
  Commit,
  Contributor,
  BasicRepositoryInfo,
  ProcessedCommit,
  ProcessedContributor,
  DependencyInfo,
  ArchitectureData,
  QualityMetrics,
  Hotspot,
  KeyFunction,
  SecurityIssue,
  TechnicalDebt,
  PerformanceMetric,
  APIEndpoint,
  FileNode,
  ChurnNode,
  FunctionInfo, // Added import
  FileMetrics,  // Added import
} from '../types';
import { analyse } from 'escomplex';
import * as path from 'path';
import * as ts from 'typescript';

export class BackendAnalysisService {
  private githubService: GitHubService;
  private llmService: LLMService;
  private advancedAnalysisService: AdvancedAnalysisService;

  constructor(githubToken?: string, llmConfig?: LLMConfig) {
    this.githubService = new GitHubService(githubToken);
    this.llmService = new LLMService(llmConfig || { provider: 'openai', apiKey: process.env.OPENAI_API_KEY || '' });
    this.advancedAnalysisService = new AdvancedAnalysisService(this.llmService);
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
      description: repoData.description,
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
      console.error("Failed to parse package.json for dependencies", e);
      return { dependencies: {}, devDependencies: {} };
    }
  }

  private async detectArchitecturePatterns(owner: string, repo: string, repoTree: FileInfo[]): Promise<ArchitectureData> {
    const nodes = repoTree.map(file => ({
      id: file.path,
      name: path.basename(file.path),
      type: this.inferModuleType(file.path),
      path: file.path,
    }));

    const links: { source: string; target: string }[] = [];
    const sourceFiles = repoTree.filter(file => this.isSourceFile(file.path));
    const filesWithContent: Array<{ file: FileInfo; content: string }> = [];

    for (const file of sourceFiles) {
      try {
        const content = await this.githubService.getFileContent(owner, repo, file.path);
        filesWithContent.push({ file, content });
      } catch (err) {
        console.error(`Error fetching content for ${file.path}:`, err);
        filesWithContent.push({ file, content: '' });
      }
    }

    for (const { file, content } of filesWithContent) {
      const importedPaths = this.parseImports(content);
      for (const importedPath of importedPaths) {
        const targetNode = this.findNodeByPath(nodes, importedPath, file.path);
        if (targetNode) {
          links.push({
            source: file.path,
            target: targetNode.id,
          });
        }
      }
    }

    return { nodes, links };
  }

  // Safe wrapper for architecture analysis with timeout and minimal fallback
  private async safeDetectArchitecturePatterns(owner: string, repo: string, repoTree: FileInfo[]): Promise<ArchitectureData> {
    const timeout = new Promise<ArchitectureData>((_, reject) =>
      setTimeout(() => reject(new Error('Architecture analysis timeout')), 30000)
    );
    try {
      return await Promise.race([
        this.detectArchitecturePatterns(owner, repo, repoTree),
        timeout
      ]);
    } catch (error) {
      console.error('Architecture analysis failed:', error);
      // Fallback minimal nodes
      const nodes = repoTree.slice(0, 10).map(f => ({
        id: f.path,
        name: path.basename(f.path),
        type: this.inferModuleType(f.path),
        path: f.path,
      }));
      return { nodes, links: [] };
    }
  }

  // Fetch files with rate-limiting to avoid API abuse
  private async fetchFilesWithRateLimit(owner: string, repo: string, files: FileInfo[]): Promise<Array<{ file: FileInfo; content: string }>> {
    const result: Array<{ file: FileInfo; content: string }> = [];
    const BATCH_SIZE = 10;
    const DELAY_MS = Number(process.env.RATE_LIMIT_DELAY_MS) || 1000;
    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      const batch = files.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.allSettled(
        batch.map(async f => {
          try {
            const content = await this.githubService.getFileContent(owner, repo, f.path);
            return { file: f, content };
          } catch (e) {
            console.warn(`Failed to fetch ${f.path}:`, e);
            return { file: f, content: '' };
          }
        })
      );
      batchResults.forEach(res => {
        if (res.status === 'fulfilled') {
          result.push(res.value);
        }
      });
      if (i + BATCH_SIZE < files.length) {
        await new Promise(r => setTimeout(r, DELAY_MS));
      }
    }
    return result;
  }

  private async calculateQualityMetrics(
    owner: string,
    repo: string,
    repoTree: FileInfo[]
  ): Promise<QualityMetrics> {
    const metrics: QualityMetrics = {};
    const sourceFiles = repoTree.filter(f => this.isSourceFile(f.path));
    const filesWithContent: Array<{ file: FileInfo; content: string }> = [];

    for (const file of sourceFiles) {
      try {
        const content = await this.githubService.getFileContent(owner, repo, file.path);
        filesWithContent.push({ file, content });
      } catch (err) {
        console.error(`Error fetching content for ${file.path}:`, err);
        filesWithContent.push({ file, content: '' });
      }
    }

    for (const { file, content } of filesWithContent) {
      if (!content) continue;

      try {
        const jsForAnalysis =
          file.path.endsWith('.ts') || file.path.endsWith('.tsx')            ? ts
                .transpileModule(content, {
                  compilerOptions: {
                    target: ts.ScriptTarget.ES2020,
                    module: ts.ModuleKind.CommonJS,
                  },
                })
                .outputText
            : content;
        
        const report = analyse(jsForAnalysis);

        metrics[file.path] = {
          complexity: report.aggregate?.cyclomatic ?? 0,
          maintainability: report.maintainability ?? 0,
          linesOfCode: report.aggregate?.sloc?.logical ?? 0,
        };
      } catch (err) {
        console.error(`Could not analyze file: ${file.path}`, err);
        // Provide default metrics for files that can't be analyzed
        metrics[file.path] = {
          complexity: 1,
          maintainability: 50,
          linesOfCode: content.split('\n').length,
        };
      }
    }

    return metrics;
  }

  /**
   * Safe wrapper for ESComplex quality metrics with robust error handling and fallback
   */
  private async safeCalculateQualityMetrics(
    owner: string,
    repo: string,
    repoTree: FileInfo[]
  ): Promise<QualityMetrics> {
    const metrics: QualityMetrics = {};
    const sourceFiles = repoTree.filter(f => this.isSourceFile(f.path));
    for (const file of sourceFiles) {
      try {
        let content = '';
        try {
          content = await this.githubService.getFileContent(owner, repo, file.path) || '';
        } catch (fetchErr) {
          console.warn(`Failed to fetch content for ${file.path}:`, fetchErr);
        }
        if (!content) {
          metrics[file.path] = { complexity: 1, maintainability: 50, linesOfCode: 0 };
          continue;
        }
        let jsForAnalysis = content;
        if (/\.tsx?$/.test(file.path)) {
          try {
            jsForAnalysis = ts.transpileModule(content, {
              compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, allowJs: true }
            }).outputText;
          } catch (transpileErr) {
            console.warn(`Transpile error for ${file.path}:`, transpileErr);
          }
        }
        try {
          const report = analyse(jsForAnalysis);
          metrics[file.path] = {
            complexity: report.aggregate?.cyclomatic ?? this.calculateFallbackComplexity(content),
            maintainability: report.maintainability ?? 50,
            linesOfCode: report.aggregate?.sloc?.logical ?? content.split('\n').length,
          };
        } catch (analysisErr) {
          console.warn(`Analysis error for ${file.path}:`, analysisErr);
          metrics[file.path] = {
            complexity: this.calculateFallbackComplexity(content),
            maintainability: 50,
            linesOfCode: content.split('\n').length,
          };
        }
      } catch (err) {
        console.error(`Unexpected error for ${file.path}:`, err);
      }
    }
    return metrics;
  }

  /**
   * Estimate complexity by counting control keywords
   */
  private calculateFallbackComplexity(content: string): number {
    const keywords = ['if', 'else', 'for', 'while', 'switch', 'case', 'catch'];
    let complexity = 1;
    for (const kw of keywords) {
      const matches = content.match(new RegExp(`\\b${kw}\\b`, 'g'));
      complexity += matches ? matches.length : 0;
    }
    return Math.min(100, complexity);
  }

  private isSourceFile(filePath: string): boolean {
    const sourceExtensions = ['.js', '.ts', '.jsx', '.tsx'];
    const excludedPatterns = [/vite-env\.d\.ts$/, /\.config\.js$/, /eslint\.config\.js$/];

    if (excludedPatterns.some(pattern => pattern.test(filePath))) {
      return false;
    }

    return sourceExtensions.includes(path.extname(filePath));
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
  }

  private parseImports(fileContent: string): string[] {
    const importRegex = /from\s+['"]([^'"]+)['"]/g;
    const requireRegex = /require\(['"]([^'"]+)['"]\)/g;
    const imports = new Set<string>();
    let match;

    while ((match = importRegex.exec(fileContent)) !== null) {
      imports.add(match[1]);
    }

    while ((match = requireRegex.exec(fileContent)) !== null) {
      imports.add(match[1]);
    }

    return Array.from(imports);
  }

  private findNodeByPath(nodes: Array<{ id: string; path: string }>, importedPath: string, currentFilePath: string): { id: string; path: string } | undefined {
    if (!importedPath.startsWith('.')) return undefined;

    const resolvedPath = path.resolve(path.dirname(currentFilePath), importedPath).replace(/\\/g, '/').replace(/^\//, '');
    
    const extensions = ['.js', '.ts', '.jsx', '.tsx', ''];
    for (const ext of extensions) {
      const pathWithExt = `${resolvedPath}${ext}`;
      const match = nodes.find(n => n.path === pathWithExt);
      if (match) return match;
    }    const indexFiles = ['/index.js', '/index.ts', '/index.jsx', '/index.tsx'];
    for (const indexFile of indexFiles) {
      const indexPath = `${resolvedPath}${indexFile}`;
      const match = nodes.find(n => n.path === indexPath);
      if (match) return match;
    }

    return undefined;
  }
  private resolveImportPath(importedPath: string, currentFilePath: string, allFiles: { path: string }[]): string | undefined {
    if (!importedPath.startsWith('.')) {
      // This could be a node module, ignore for now
      return undefined;
    }

    const resolvedPath = path.resolve(path.dirname(currentFilePath), importedPath).replace(/\\/g, '/');
    
    const extensions = ['', '.js', '.ts', '.jsx', '.tsx', '/index.js', '/index.ts', '/index.jsx', '/index.tsx'];
    for (const ext of extensions) {
      const pathWithExt = `${resolvedPath}${ext}`.replace(/\.js(x?)$/, '.ts$1'); // Also try to resolve .js to .ts
      const match = allFiles.find(f => f.path === pathWithExt || f.path === `${resolvedPath}.ts` || f.path === `${resolvedPath}.tsx`);
      if (match) return match.path;
    }

    return undefined;
  }
  async analyze(
    repoUrl: string,
    onProgress: (step: string, progress: number) => void = () => {}
  ): Promise<AnalysisResult> {
  onProgress('Validating repository URL', 0);
  if (!this.isValidRepoUrl(repoUrl)) {
    throw new Error('Invalid repository URL format');
  }
  const [owner, repo] = this.extractRepoParts(repoUrl);

  // Token verification
  if (this.githubService.hasToken()) {
    onProgress('Verifying GitHub token', 5);
    const tokenIsValid = await this.githubService.verifyToken();
    if (!tokenIsValid) {
      throw new Error('GitHub token is invalid or has expired.');
    }
  }

  // Fetch basic data
  onProgress('Fetching repository data', 10);
  const repoData = await this.githubService.getRepository(owner, repo);

  onProgress('Fetching commits', 20);
  const commits = await this.githubService.getCommits(owner, repo);

  onProgress('Fetching contributors', 30);
  const contributors = await this.githubService.getContributors(owner, repo);

  onProgress('Fetching repository tree', 40);
  const repoTree = await this.githubService.getRepoTree(owner, repo, repoData.defaultBranch);

  onProgress('Fetching languages', 45);
  const languages = await this.githubService.getLanguages(owner, repo);

  // Enhanced file processing
  onProgress('Processing files with content', 50);
  const MAX_CONTENT = 200;
  const MAX_FILE_SIZE = 200 * 1024;

  const repoTreeWithPaths = repoTree.map(f => ({ path: f.path }));
  // Batch-fetch file contents with rate limiting
  const rawFiles = repoTree.filter(f => f.type === 'file' && f.size < MAX_FILE_SIZE).slice(0, MAX_CONTENT);
  const fetchedFiles = await this.fetchFilesWithRateLimit(owner, repo, rawFiles);

  const files: FileInfo[] = [];
  const qualityMetrics: QualityMetrics = {};

  for (const { file: f, content } of fetchedFiles) {
    const language = this.detectLanguage(f.path);
    let dependencies: string[] = [];
    if (this.isSourceFile(f.path) && content) {
      dependencies = this.parseImports(content)
        .map(p => this.resolveImportPath(p, f.path, repoTreeWithPaths))
        .filter((p): p is string => !!p);
    }

    let fileComplexity: number = this.calculateBasicComplexity(content);
    let functionInfos: FunctionInfo[] = [];
    let currentFileMetrics: FileMetrics = {
      complexity: content ? this.calculateFallbackComplexity(content) : 1,
      maintainability: 50,
      linesOfCode: content ? content.split('\n').length : 0,
    };

    if (this.isSourceFile(f.path) && content) {
      try {
        let jsForAnalysis = content;
        if (/\.tsx?$/.test(f.path)) {
          try {
            jsForAnalysis = ts.transpileModule(content, {
              compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, allowJs: true }
            }).outputText;
          } catch (transpileErr) {
            console.warn(`Transpile error for ${f.path} (falling back on original content for complexity):`, transpileErr);
          }
        }

        const report = analyse(jsForAnalysis);

        fileComplexity = report.aggregate?.cyclomatic ?? this.calculateFallbackComplexity(content);
        currentFileMetrics = {
          complexity: fileComplexity,
          maintainability: report.maintainability ?? 50,
          linesOfCode: report.aggregate?.sloc?.logical ?? content.split('\n').length,
        };

        if (report.functions && Array.isArray(report.functions)) {
          functionInfos = report.functions.map((fnRep: any) => ({
            name: fnRep.name,
            complexity: fnRep.cyclomatic,
            dependencies: [], // Placeholder - escomplex doesn't provide this directly
            calls: [],       // Placeholder - escomplex doesn't provide this directly
            description: undefined, // Placeholder
            startLine: fnRep.lineStart,
            endLine: fnRep.lineEnd,
          }));
        }
      } catch (analysisErr) {
        console.warn(`ESComplex analysis error for ${f.path}:`, analysisErr);
        // Fallback values are already set or re-affirmed here
        fileComplexity = this.calculateFallbackComplexity(content);
        currentFileMetrics.complexity = fileComplexity;
        currentFileMetrics.linesOfCode = content.split('\n').length;
        currentFileMetrics.maintainability = 50; // Reset maintainability on error
        functionInfos = []; // Ensure empty functions array on error
      }
    }
    
    qualityMetrics[f.path] = currentFileMetrics;

    files.push({
      ...f, // Original file properties from GitHub (name, path, size, type etc.)
      content,
      language,
      dependencies,
      complexity: fileComplexity,   // Overall file complexity
      functions: functionInfos,     // Populated function details
      lastModified: f.lastModified || new Date().toISOString(), // Use existing if available, else new
      // Other FileInfo properties like testCoverage, primaryAuthor, etc., are not set here
    });
  }
  // Architecture analysis with error handling
  onProgress('Analyzing architecture', 60);
  let dependencyGraph: ArchitectureData;

  try {
    dependencyGraph = await this.safeDetectArchitecturePatterns(owner, repo, files);
  } catch (error) {
    console.error('Architecture analysis failed unexpectedly:', error);
    dependencyGraph = { nodes: [], links: [] };
  }
  // Advanced analysis with error handling
  onProgress('Running security analysis', 70);
  let securityIssues: SecurityIssue[] = [];
  try {
    securityIssues = await this.advancedAnalysisService.analyzeSecurityIssues(files);
  } catch (error) {
    console.error('Security analysis failed:', error);
  }
  
  onProgress('Analyzing technical debt', 75);
  let technicalDebt: TechnicalDebt[] = [];
  try {
    technicalDebt = await this.advancedAnalysisService.analyzeTechnicalDebt(files);
  } catch (error) {
    console.error('Technical debt analysis failed:', error);
  }
  
  onProgress('Detecting API endpoints', 80);
  let apiEndpoints: APIEndpoint[] = [];
  try {
    apiEndpoints = await this.advancedAnalysisService.detectAPIEndpoints(files);
  } catch (error) {
    console.error('API endpoint detection failed:', error);
  }
  
  onProgress('Analyzing performance', 85);
  let performanceMetrics: PerformanceMetric[] = [];
  try {
    performanceMetrics = await this.advancedAnalysisService.analyzePerformanceMetrics(files);
  } catch (error) {
    console.error('Performance analysis failed:', error);
  }
  // Dependencies with error handling
  onProgress('Parsing dependencies', 90);
  let dependencies: DependencyInfo;
  try {
    dependencies = await this.analyzeDependencies(owner, repo);
  } catch (error) {
    console.error('Dependency analysis failed:', error);
    dependencies = { dependencies: {}, devDependencies: {} };
  }

  // Prepare advanced analysis datasets
  const processedCommits = this.processCommits(commits);
  const processedContributors = this.processContributors(contributors);
  const generatedHotspots = this.generateHotspots(files, processedCommits);
  const generatedKeyFunctions = this.generateKeyFunctions(files);
  const dependencyWheelData = this.generateDependencyWheelData(dependencies);

  let fileSystemTree: any;
  try {
    fileSystemTree = this.generateFileSystemTree(files);
  } catch (err) {
    console.error('File system tree generation failed:', err);
    fileSystemTree = { name: 'root', path: '', size: 0, type: 'directory', children: [] };
  }

  const churnSunburstData = this.generateChurnSunburstData(files, processedCommits);
  const contributorStreamData = this.generateContributorStreamData(processedCommits, processedContributors);

  let aiSummary = '';
  try {
    aiSummary = await this.generateAISummary(repoData, files);
  } catch (err) {
    console.warn('AI summary generation failed:', err);
  }

  // Overall metrics summary
  const summaryMetrics = this.calculateMetrics(
    processedCommits,
    processedContributors,
    files,
    securityIssues,
    technicalDebt
  );

  onProgress('Finalizing report', 95);
  onProgress('Complete', 100);

  const result: AnalysisResult = {
    id: `${repoData.fullName.replace('/', '_')}-${Date.now()}`, // Replace slash with underscore
    repositoryUrl: repoUrl,
    createdAt: new Date().toISOString(),

    basicInfo: this.transformRepoData(repoData),
    repository: repoData,
    commits: processedCommits,
    contributors: processedContributors,
    files,
    languages,
    dependencies,
    dependencyGraph,
    qualityMetrics,
    securityIssues,
    technicalDebt,
    performanceMetrics,
    hotspots: generatedHotspots,
    keyFunctions: generatedKeyFunctions,
    apiEndpoints,
    aiSummary,
    architectureAnalysis: JSON.stringify(dependencyGraph),
    metrics: summaryMetrics,

    // Diagram-specific data
    dependencyWheelData,
    fileSystemTree,
    churnSunburstData,
    contributorStreamData,
  };

  return result;
}

// Helper methods for analysis
private detectLanguage(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase();
  const languageMap: Record<string, string> = {
    'ts': 'typescript', 'tsx': 'typescript',
    'js': 'javascript', 'jsx': 'javascript',
    'py': 'python', 'java': 'java',
    'cpp': 'cpp', 'c': 'c', 'cs': 'csharp',
    'php': 'php', 'rb': 'ruby', 'go': 'go',
    'rs': 'rust', 'swift': 'swift', 'kt': 'kotlin'
  };
  return languageMap[ext || ''] || 'unknown';
}

private calculateBasicComplexity(content: string): number {
  if (!content) return 0;
  const complexityKeywords = ['if', 'else', 'for', 'while', 'switch', 'case', 'catch', '&&', '||'];
  let complexity = 1;
  complexityKeywords.forEach(keyword => {
    const matches = content.match(new RegExp(`\\b${keyword}\\b`, 'g'));
    complexity += matches ? matches.length : 0;
  });
  return Math.min(100, complexity * 2); // Cap at 100%
}

private generateHotspots(files: FileInfo[], commits: ProcessedCommit[]): Hotspot[] {
  return files
    .filter(f => f.complexity && f.complexity > 20)
    .map(f => ({
      file: f.name,
      path: f.path,
      complexity: f.complexity || 0,
      changes: commits.filter(c => c.files.some((cf: any) => cf.filename === f.path)).length,      riskLevel: (f.complexity! > 60 ? 'critical' : f.complexity! > 40 ? 'high' : 'medium') as 'critical' | 'high' | 'medium',
      size: f.content?.split('\n').length || f.size || 0
    }))
    .slice(0, 20);
}

private generateKeyFunctions(files: FileInfo[]): KeyFunction[] {
  return files
    .filter(f => f.functions && f.functions.length > 0)
    .flatMap(f => f.functions!.map(fn => ({
      name: fn.name,
      file: f.path,
      complexity: fn.complexity,
      explanation: fn.description || `Function ${fn.name} in ${f.name}`
    })))
    .slice(0, 10);
}

private calculateMetrics(
  commits: ProcessedCommit[], 
  contributors: ProcessedContributor[], 
  files: FileInfo[], 
  securityIssues: SecurityIssue[], 
  technicalDebt: TechnicalDebt[]
): AnalysisResult['metrics'] {
  const linesOfCode = files.reduce((sum, f) => sum + (f.content?.split('\n').length || 0), 0);
  const totalFileComplexity = files.reduce((sum, f) => sum + (f.complexity || 0), 0);
  
  const avgComplexity = files.length > 0 ? totalFileComplexity / files.length : 0;
  const codeQuality = files.length > 0 ? Math.max(0, 10 - avgComplexity / 10) : 0;
  const testCoverage = files.length > 0 ? (files.filter(f => f.path.includes('test')).length / files.length) * 100 : 0;
  
  return {
    totalCommits: commits.length,
    totalContributors: contributors.length,
    fileCount: files.length,
    linesOfCode,
    codeQuality: parseFloat(codeQuality.toFixed(2)), // Ensure it's a number, not NaN
    testCoverage: parseFloat(testCoverage.toFixed(2)), // Ensure it's a number, not NaN
    busFactor: Math.min(contributors.length, Math.ceil(contributors.length * 0.2)),
    securityScore: Math.max(0, 10 - securityIssues.length),
    technicalDebtScore: Math.max(0, 10 - technicalDebt.length / 2),
    performanceScore: 5.0, // Placeholder, changed from random to a fixed default
    criticalVulnerabilities: securityIssues.filter(s => s.severity === 'critical').length,
    highVulnerabilities: securityIssues.filter(s => s.severity === 'high').length,
    mediumVulnerabilities: securityIssues.filter(s => s.severity === 'medium').length,
    lowVulnerabilities: securityIssues.filter(s => s.severity === 'low').length,
  };
}

private generateDependencyWheelData(deps: DependencyInfo) {
  return Object.keys(deps.dependencies).map((dep) => ({
    source: 'main',
    target: dep,
    value: 1
  }));
}

private generateFileSystemTree(files: FileInfo[]): FileNode {
  const root: FileNode = { name: 'root', path: '', size: 0, type: 'directory', children: [] };
  
  files.forEach(file => {
    const parts = file.path.split('/');
    let current = root;
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      
      if (!current.children) current.children = [];
      
      let child = current.children.find(c => c.name === part);
      if (!child) {
        child = {
          name: part,
          path: parts.slice(0, i + 1).join('/'),
          size: isLast ? file.size : 0,
          type: isLast ? 'file' : 'directory',
          children: isLast ? undefined : []
        };
        current.children.push(child);
      }
      
      if (isLast) {
        child.size = file.size;
        child.type = 'file';
      }
      
      current = child;
    }
  });
  
  return root;
}

private generateChurnSunburstData(files: FileInfo[], commits: ProcessedCommit[]): ChurnNode {
  const root: ChurnNode = { name: 'root', path: '', churnRate: 0, type: 'directory', children: [] };
  
  files.forEach(file => {
    const churnRate = commits.filter(c => 
      c.files.some((cf: any) => cf.filename === file.path)
    ).length;
    
    if (churnRate > 0) {
      const parts = file.path.split('/');
      let current = root;
      
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isLast = i === parts.length - 1;
        
        if (!current.children) current.children = [];
        
        let child = current.children.find(c => c.name === part);
        if (!child) {
          child = {
            name: part,
            path: parts.slice(0, i + 1).join('/'),
            churnRate: isLast ? churnRate : 0,
            type: isLast ? 'file' : 'directory',
            children: isLast ? undefined : []
          };
          current.children.push(child);
        }
        
        if (isLast) {
          child.churnRate = churnRate;
          child.type = 'file';
        }
        
        current = child;
      }
    }
  });
  
  return root;
}

private generateContributorStreamData(commits: ProcessedCommit[], _contributors: ProcessedContributor[]) {
  const monthlyData: Record<string, Record<string, number>> = {};
  
  commits.forEach(commit => {
    const date = new Date(commit.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (!monthlyData[monthKey]) monthlyData[monthKey] = {};
    monthlyData[monthKey][commit.author] = (monthlyData[monthKey][commit.author] || 0) + 1;
  });
  
  return Object.entries(monthlyData).map(([date, contributors]) => ({
    date,
    contributors
  }));
}

private async generateAISummary(repoData: Repository, files: FileInfo[]): Promise<string> {
    // Create a context string from key file paths and snippets
    const contextParts = files.slice(0, 5).map(f => {
      const snippet = f.content ? f.content.substring(0, 200) : '';
      return `File: ${f.path}\n${snippet}`;
    });
    const context = `Repository: ${repoData.fullName}\n` + contextParts.join('\n---\n');
    try {
      const summaryResult = await this.llmService.generateSummary(context);
      return summaryResult.summary || '';
    } catch (error) {
      console.warn('generateAISummary failed:', error);
      return '';
    }
  }

private async generateArchitectureAnalysis(files: FileInfo[], languages: Record<string, number>): Promise<string> {
  if (!this.llmService.isConfigured()) {
    return `Architecture analysis shows ${files.length} files organized in a standard project structure.`;
  }
  
  try {
    return await this.llmService.analyzeArchitecture(files, languages);
  } catch {
    return `Architecture analysis indicates a well-structured codebase with multiple components.`;
  }
}

  private async analyzeDependencies(owner: string, repo: string): Promise<DependencyInfo> {
    try {
      const packageJsonString = await this.githubService.getFileContent(owner, repo, 'package.json');
      if (typeof packageJsonString !== 'string') {
        throw new Error('Invalid package.json content received');
      }
      return this.parseDependencies(packageJsonString);
    } catch (error) {
      console.warn('Dependency analysis failed:', error);
      return { dependencies: {}, devDependencies: {} };
    }
  }
}
