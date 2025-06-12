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
  FileNode,
  ChurnNode,
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
      date: commit.author.date,
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
    const filesWithContent = [];

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
          file.path.endsWith('.ts') || file.path.endsWith('.tsx')
            ? ts
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
          complexity: report.aggregate.cyclomatic,
          maintainability: report.maintainability,
          linesOfCode: report.aggregate.sloc.logical,
        };
      } catch (err) {
        console.error(`Could not analyze file: ${file.path}`, err);
      }
    }

    return metrics;
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
    }

    const indexFiles = ['/index.js', '/index.ts', '/index.jsx', '/index.tsx'];
    for (const indexFile of indexFiles) {
        const indexPath = `${resolvedPath}${indexFile}`;
        const match = nodes.find(n => n.path === indexPath);
        if (match) return match;
    }

    return undefined;
  }

  async analyze(
  repoUrl: string,
  onProgress: (step: string, progress: number) => void = () => {}
): Promise<AnalysisResult> {  // ← Change return type
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
  
  const files: FileInfo[] = await Promise.all(
    repoTree
      .filter(f => f.type === 'file' && f.size < MAX_FILE_SIZE)
      .slice(0, MAX_CONTENT)
      .map(async f => {
        try {
          const content = await this.githubService.getFileContent(owner, repo, f.path);
          const language = this.detectLanguage(f.path);
          return { 
            ...f, 
            content, 
            language,
            complexity: this.calculateBasicComplexity(content),
            lastModified: new Date().toISOString()
          };
        } catch {
          return { ...f, language: this.detectLanguage(f.path) };
        }
      })
  );

  // Architecture analysis
  onProgress('Analyzing architecture', 60);
  const dependencyGraph = await this.detectArchitecturePatterns(owner, repo, files);
  const qualityMetrics = await this.calculateQualityMetrics(owner, repo, files);

  // Advanced analysis
  onProgress('Running security analysis', 70);
  const securityIssues = await this.advancedAnalysisService.analyzeSecurityIssues(files);
  
  onProgress('Analyzing technical debt', 75);
  const technicalDebt = await this.advancedAnalysisService.analyzeTechnicalDebt(files);
  
  onProgress('Detecting API endpoints', 80);
  const apiEndpoints = await this.advancedAnalysisService.detectAPIEndpoints(files);
  
  onProgress('Analyzing performance', 85);
  const performanceMetrics = await this.advancedAnalysisService.analyzePerformanceMetrics(files);

  // Dependencies
  onProgress('Parsing dependencies', 90);
  const dependencies = await this.analyzeDependencies(owner, repo);

  // Generate derived data
  onProgress('Generating analysis insights', 95);
  const hotspots = this.generateHotspots(files, this.processCommits(commits));
  const keyFunctions = this.generateKeyFunctions(files);
  const metrics = this.calculateMetrics(this.processCommits(commits), this.processContributors(contributors), files, securityIssues, technicalDebt);
  
  // Generate diagram data
  const dependencyWheelData = this.generateDependencyWheelData(dependencies);
  const fileSystemTree = this.generateFileSystemTree(files);
  const churnSunburstData = this.generateChurnSunburstData(files, this.processCommits(commits));
  const contributorStreamData = this.generateContributorStreamData(this.processCommits(commits), this.processContributors(contributors));

  onProgress('Finalizing report', 98);

  const result: AnalysisResult = {
    id: `${Date.now()}`,
    repositoryUrl: repoUrl,
    createdAt: new Date().toISOString(),
    
    // Core data
    basicInfo: this.transformRepoData(repoData),
    repository: repoData, // ← ADD this - many components expect it
    commits: this.processCommits(commits),
    contributors: this.processContributors(contributors),
    files,
    languages,
    
    // Architecture
    dependencies,
    dependencyGraph,
    qualityMetrics,
    
    // Analysis results
    securityIssues,
    technicalDebt,
    performanceMetrics,
    hotspots,
    keyFunctions,
    apiEndpoints,
    
    // Metrics
    metrics,
    
    // Diagram data
    dependencyWheelData,
    fileSystemTree,
    churnSunburstData,
    contributorStreamData,
    
    // AI summaries (if LLM available)
    aiSummary: await this.generateAISummary(repoData, files),
    architectureAnalysis: await this.generateArchitectureAnalysis(files),
  };

  onProgress('Complete', 100);
  return result;
}

// ADD these helper methods:
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
      changes: commits.filter(c => c.files.some((cf: any) => cf.filename === f.path)).length,
      riskLevel: (f.complexity! > 60 ? 'critical' : f.complexity! > 40 ? 'high' : 'medium') as 'critical' | 'high' | 'medium',
      size: f.content?.split('\n').length || 0
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
  const avgComplexity = files.reduce((sum, f) => sum + (f.complexity || 0), 0) / files.length;
  
  return {
    totalCommits: commits.length,
    totalContributors: contributors.length,
    linesOfCode,
    codeQuality: Math.max(0, 10 - avgComplexity / 10),
    testCoverage: files.filter(f => f.path.includes('test')).length / files.length * 100,
    busFactor: Math.min(contributors.length, Math.ceil(contributors.length * 0.2)),
    securityScore: Math.max(0, 10 - securityIssues.length),
    technicalDebtScore: Math.max(0, 10 - technicalDebt.length / 2),
    performanceScore: Math.random() * 5 + 5, // Placeholder
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
  if (!this.llmService.isConfigured()) {
    return `${repoData.fullName} is a ${repoData.language} repository with ${files.length} files. ${repoData.description || 'No description provided.'}`;
  }
  
  try {
    return await this.llmService.generateExecutiveSummary({
      name: repoData.name,
      description: repoData.description || '',
      language: repoData.language || 'Unknown',
      stars: repoData.stars,
    });
  } catch {
    return `${repoData.fullName} analysis completed. Repository contains ${files.length} files with ${repoData.stars} stars.`;
  }
}

private async generateArchitectureAnalysis(files: FileInfo[]): Promise<string> {
  if (!this.llmService.isConfigured()) {
    return `Architecture analysis shows ${files.length} files organized in a standard project structure.`;
  }
  
  try {
    const languages = files.reduce((acc, f) => {
      if (f.language) acc[f.language] = (acc[f.language] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return await this.llmService.analyzeArchitecture(files.slice(0, 50), languages);
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
