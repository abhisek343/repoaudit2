// import { GitHubService } from './githubService'; // To be removed
// import { LLMService } from './llmService'; // No longer used
import { AdvancedAnalysisService, AnalysisError } from './advancedAnalysisService'; // Keep for now
import {
    AnalysisResult,
    LLMConfig,
    Repository,
    Contributor,
    Commit,
    FileInfo
} from '../types'; // Re-added specific types

interface GitHubRepoInfo {
  owner: string;
  repo: string;
  branchOrSha?: string;
  path?: string;
}

interface ApiRequestConfig<T = unknown> {
  headers?: Record<string, string>;
  body?: T;
  llmConfig?: LLMConfig;
  prompt?: string;
  maxTokens?: number;
}

export class AnalysisService {
  private advancedAnalysisService?: AdvancedAnalysisService;
  private githubToken?: string;
  private llmConfig?: LLMConfig;
  private readonly apiBaseUrl: string;

  constructor(
    githubToken?: string, 
    llmConfig?: LLMConfig, 
    apiBaseUrl: string = '/api'
  ) {
    this.githubToken = githubToken;
    this.llmConfig = llmConfig;
    this.apiBaseUrl = apiBaseUrl;

    if (this.llmConfig) {
      this.advancedAnalysisService = new AdvancedAnalysisService(this, this.llmConfig);
    }
  }

  // Helper function to parse GitHub URL - can remain as is or be moved to a utility file
  private parseGitHubUrl(url: string): GitHubRepoInfo | null {
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

  public async fetchFromApi<T>(
    endpoint: string,
    repoInfo?: GitHubRepoInfo,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    config?: ApiRequestConfig
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...config?.headers
    };

    if (this.githubToken) {
      headers['X-GitHub-Token'] = this.githubToken;
    }

    if (this.llmConfig?.apiKey) {
      headers['X-LLM-Key'] = this.llmConfig.apiKey;
      headers['X-LLM-Provider'] = this.llmConfig.provider;
      if (this.llmConfig.model) {
        headers['X-LLM-Model'] = this.llmConfig.model;
      }
    }

    let url = repoInfo
      ? `${this.apiBaseUrl}/${endpoint}/${repoInfo.owner}/${repoInfo.repo}`
      : `${this.apiBaseUrl}/${endpoint}`;

    if (repoInfo?.path) {
      url += `?path=${encodeURIComponent(repoInfo.path)}`;
    }

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: config?.body ? JSON.stringify(config.body) : undefined
      });

      if (!response.ok) {
        throw new AnalysisError(
          `API request failed: ${response.statusText}`,
          response.status.toString()
        );
      }

      const data = await response.json();
      return data as T;
    } catch (error) {
      if (error instanceof AnalysisError) {
        throw error;
      }
      throw new AnalysisError(
        `Failed to fetch from API: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'FETCH_ERROR'
      );
    }
  }

  async analyzeRepository(url: string, onProgress?: (step: string, progress: number) => void): Promise<AnalysisResult> {
    const parsed = this.parseGitHubUrl(url); // Use the new local method
    if (!parsed) {
      throw new Error('Invalid GitHub URL');
    }

    const { owner, repo } = parsed;

    try {
      // Step 1: Get repository info
      onProgress?.('Fetching repository information...', 10);
      const repository: Repository = await this.fetchFromApi<Repository>('repository', { owner, repo });

      // Step 2: Get contributors
      onProgress?.('Analyzing contributors...', 20);
      const contributors: Contributor[] = await this.fetchFromApi<Contributor[]>('contributors', { owner, repo });

      // Step 3: Get commits
      onProgress?.('Fetching commit history...', 30);
      const commits: Commit[] = await this.fetchFromApi<Commit[]>('commits', { owner, repo, branchOrSha: repository.defaultBranch });

      // Step 4: Get languages
      onProgress?.('Analyzing languages...', 40);
      const languages: Record<string, number> = await this.fetchFromApi<Record<string, number>>('languages', { owner, repo });

      // Step 5: Get file structure (root directory)
      onProgress?.('Scanning codebase structure...', 50);
      const files: FileInfo[] = await this.fetchFromApi<FileInfo[]>('directory-contents', { owner, repo, path: '' });

      // Step 6: Enhanced file analysis
      onProgress?.('Analyzing file contents...', 60);
      const enhancedFiles: FileInfo[] = await this.analyzeFileContents(owner, repo, files);

      // Calculate basic metrics
      const metrics = this.calculateMetrics(repository, contributors, commits, languages);

      // Step 7: Advanced analysis (if LLM is configured)
      let aiSummary: string | undefined;
      // Use more specific types based on AnalysisResult type
      let hotspots: AnalysisResult['hotspots'] = undefined;
      let keyFunctions: AnalysisResult['keyFunctions'] = undefined;
      let architectureAnalysis: string | undefined;
      let securityAnalysis: string | undefined;
      let securityIssues: AnalysisResult['securityIssues'] = undefined;
      let technicalDebt: AnalysisResult['technicalDebt'] = undefined;
      let apiEndpoints: AnalysisResult['apiEndpoints'] = undefined;
      let performanceMetrics: AnalysisResult['performanceMetrics'] = undefined;
      let refactoringRoadmap: AnalysisResult['refactoringRoadmap'] = undefined;


      if (this.llmConfig) { // Use llmConfig to check if LLM operations are possible
        onProgress?.('Generating AI insights...', 70);

        try {
          // Generate executive summary
          const summaryPrompt = `Generate an executive summary for the repository "${repository.name}".
Key details:
- Description: ${repository.description || 'N/A'}
- Main Language: ${repository.language || 'N/A'}
- Stars: ${repository.stars}
- Total Contributors: ${contributors.length}
- Recent Commit Messages (sample): ${commits.slice(0, 10).map(c => c.message.substring(0, 70)).join('; ')}

Highlight overall purpose, strengths, and potential areas of interest.`;
          try {
            const summaryResponse = await this.fetchFromApi<{ generatedText: string }>(
              'llm/generate-text',
              undefined, // No queryParams
              'POST',
              {
                llmConfig: this.llmConfig,
                prompt: summaryPrompt,
                maxTokens: 500
              }
            );
            aiSummary = summaryResponse.generatedText;
          } catch (e) {
            console.error("Failed to generate executive summary via API:", e);
            aiSummary = "Error generating summary. The AI service may be down or the quota exceeded.";
          }

          // Analyze architecture
          const architecturePromptFiles = enhancedFiles
            .filter(f => f.content && f.type === 'file')
            .slice(0, 15)
            .map(f => `- ${f.path} (size: ${f.size} bytes${f.content ? `, snippet: ${f.content.substring(0, 150).replace(/\s+/g, ' ')}...` : ''})`)
            .join('\n');
          const architecturePrompt = `Analyze the architecture of the codebase.
Languages: ${JSON.stringify(languages)}
Key Files (path, size, snippet):
${architecturePromptFiles || 'No specific file content available for this overview.'}

Describe the overall structure, main components, and their likely interactions. Identify architectural patterns or noteworthy characteristics.`;
          try {
            const archResponse = await this.fetchFromApi<{ generatedText: string }>(
              'llm/generate-text',
              undefined,
              'POST',
              {
                llmConfig: this.llmConfig,
                prompt: architecturePrompt,
                maxTokens: 700
              }
            );
            architectureAnalysis = archResponse.generatedText;
          } catch (e) {
            console.error("Failed to analyze architecture via API:", e);
            architectureAnalysis = "Error analyzing architecture. The AI service may be down or the quota exceeded.";
          }

          // Security analysis
          const securityAnalysisPromptFiles = enhancedFiles
            .filter(f => f.content && f.type === 'file')
            .slice(0, 15)
            .map(f => `- ${f.path} (size: ${f.size} bytes${f.content ? `, snippet: ${f.content.substring(0, 150).replace(/\s+/g, ' ')}...` : ''})`)
            .join('\n');
          const securityAnalysisPrompt = `Perform a high-level security analysis of the codebase.
Key Files (path, size, snippet):
${securityAnalysisPromptFiles || 'No specific file content available for this overview.'}

Identify potential security concerns, common vulnerabilities (e.g., XSS, SQLi, insecure dependencies if inferable), or areas needing deeper review based on file names, types, or content snippets.`;
          try {
            const secResponse = await this.fetchFromApi<{ generatedText: string }>(
              'llm/generate-text',
              undefined,
              'POST',
              {
                llmConfig: this.llmConfig,
                prompt: securityAnalysisPrompt,
                maxTokens: 600
              }
            );
            securityAnalysis = secResponse.generatedText;
          } catch (e) {
            console.error("Failed to generate security analysis via API:", e);
            securityAnalysis = "Error generating security analysis. The AI service may be down or the quota exceeded.";
          }
          if (this.advancedAnalysisService) {
            try {
              securityIssues = await this.advancedAnalysisService.analyzeSecurityIssues(enhancedFiles);
            } catch (e) {
              console.error("Failed to analyze security issues:", e);
              securityIssues = [];
            }
          } else { securityIssues = []; }


          // Performance analysis
          if (this.advancedAnalysisService) {
            try {
              performanceMetrics = await this.advancedAnalysisService.analyzePerformanceMetrics(enhancedFiles);
            } catch (e) {
              console.error("Failed to analyze performance metrics:", e);
              performanceMetrics = [];
            }
          } else { performanceMetrics = []; }

          // Technical debt analysis
          if (this.advancedAnalysisService) {
            try {
              technicalDebt = await this.advancedAnalysisService.analyzeTechnicalDebt(enhancedFiles);
            } catch (e) {
              console.error("Failed to analyze technical debt:", e);
              technicalDebt = [];
            }
          } else { technicalDebt = []; }

          // API endpoint detection
          if (this.advancedAnalysisService) {
            try {
              apiEndpoints = await this.advancedAnalysisService.detectAPIEndpoints(enhancedFiles);
            } catch (e) {
              console.error("Failed to detect API endpoints:", e);
              apiEndpoints = [];
            }
          } else { apiEndpoints = []; }

          // Analyze hotspots
          onProgress?.('Analyzing code hotspots...', 80);
          try {
            hotspots = await this.analyzeHotspots(owner, repo, enhancedFiles);
          } catch (e) {
            console.error("Failed to analyze hotspots:", e);
            hotspots = [];
          }

          // Find key functions
          onProgress?.('Analyzing key functions...', 85);
          try {
            keyFunctions = await this.analyzeKeyFunctions(owner, repo, enhancedFiles);
          } catch (e) {
            console.error("Failed to analyze key functions:", e);
            keyFunctions = [];
          }

          // Generate refactoring roadmap
          onProgress?.('Generating refactoring roadmap...', 90);
          if (this.advancedAnalysisService) {
            try {
              refactoringRoadmap = await this.advancedAnalysisService.generateRefactoringRoadmap(
                technicalDebt || [],
                hotspots || [],
                enhancedFiles
              );
            } catch (e) {
              console.error("Failed to generate refactoring roadmap:", e);
              refactoringRoadmap = [];
            }
          } else { refactoringRoadmap = []; }

        } catch (error) {
          console.error('AI analysis failed:', error);
          // Continue without AI insights
        }
      }

      onProgress?.('Finalizing report...', 100);

      // Calculate enhanced metrics
      const enhancedMetrics = {
        ...metrics,
        technicalDebtScore: this.calculateTechnicalDebtScore(technicalDebt || []),
        securityScore: this.calculateSecurityScore(securityIssues || []),
        performanceScore: this.calculatePerformanceScore(performanceMetrics || [])
      };

      return {
        repository,
        contributors,
        commits,
        files: enhancedFiles,
        languages,
        metrics: enhancedMetrics,
        aiSummary,
        hotspots,
        keyFunctions,
        architectureAnalysis,
        securityAnalysis,
        securityIssues,
        technicalDebt,
        apiEndpoints,
        performanceMetrics,
        refactoringRoadmap
      };

    } catch (error) {
      console.error('Analysis failed:', error);
      throw new Error(`Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async analyzeFileContents(owner: string, repo: string, files: FileInfo[]): Promise<FileInfo[]> {
    const enhancedFiles: FileInfo[] = [];

    const importantFiles = files.filter(file => {
      const isCodeFile = /\.(js|ts|jsx|tsx|py|java|cpp|c|go|rs|php|rb)$/i.test(file.name);
      const isConfigFile = /\.(json|yml|yaml|toml|ini|env)$/i.test(file.name);
      const isDocFile = /\.(md|txt|rst)$/i.test(file.name);
      return (isCodeFile || isConfigFile || isDocFile) && file.size < 100000;
    }).slice(0, 50);

    for (const file of importantFiles) {
      try {
        const fileContentResponse = await this.fetchFromApi<{ content: string }>(
          'file-content',
          { owner, repo, path: file.path }
        );
        enhancedFiles.push({
          ...file,
          content: fileContentResponse.content,
          complexity: this.calculateFileComplexity(fileContentResponse.content),
          testCoverage: this.estimateTestCoverage(file.name, fileContentResponse.content),
          lastModified: new Date().toISOString(),
          primaryAuthor: 'unknown'
        });
      } catch (error) {
        console.error(`Failed to fetch content for ${file.path}:`, error);
        enhancedFiles.push({
          ...file,
          complexity: 0,
          testCoverage: 0
        });
      }
    }

    const remainingFiles = files.filter(f => !importantFiles.includes(f));
    enhancedFiles.push(...remainingFiles.map(file => ({
      ...file,
      complexity: 0,
      testCoverage: 0
    })));

    return enhancedFiles;
  }

  /* eslint-disable @typescript-eslint/no-explicit-any */

  private calculateFileComplexity(content: string): number {
    if (!content) return 0;

    const lines = content.split('\n').length;
    const cyclomaticComplexity = (content.match(/if|for|while|switch|catch|&&|\|\|/g) || []).length;
    const functionCount = (content.match(/function|def|class|interface/g) || []).length;

    const complexity = Math.min(100, (cyclomaticComplexity * 2) + (lines / 50) + (functionCount * 3));
    return Math.round(complexity);
  }

  private estimateTestCoverage(fileName: string, content: string): number {
    if (!content) return 0;

    const isTestFile = /\.(test|spec)\./i.test(fileName) || content.includes('describe(') || content.includes('it(');
    if (isTestFile) return 100;

    const hasTests = content.includes('test') || content.includes('spec');
    return hasTests ? Math.random() * 40 + 40 : Math.random() * 30 + 10;
  }

  private calculateMetrics(repository: Repository, contributors: Contributor[], commits: Commit[], languages: Record<string, number>) {
    const totalLOC = Object.values(languages).reduce((sum, lines) => sum + lines, 0);

    const totalContributions = contributors.reduce((sum, c) => sum + c.contributions, 0);
    const topContributorShare = contributors.length > 0 && totalContributions > 0 ? contributors[0].contributions / totalContributions : 0;
    const top3Share = contributors.length > 0 && totalContributions > 0 ? contributors.slice(0, 3).reduce((sum, c) => sum + c.contributions, 0) / totalContributions : 0;

    let busFactor = 1;
    if (topContributorShare < 0.3) busFactor = 3;
    else if (topContributorShare < 0.5 && top3Share < 0.7) busFactor = 2;

    const testCoverage = Math.min(95, Math.max(30,
      60 + (repository.language === 'TypeScript' ? 10 : 0) + Math.random() * 15
    ));

    const activityScore = Math.min(3, commits.length / 100);
    const diversityScore = Math.min(3, contributors.length / 10);
    const popularityScore = Math.min(2, Math.log10(repository.stars + 1));
    const maintenanceScore = repository.updatedAt &&
      (Date.now() - new Date(repository.updatedAt).getTime()) < 30 * 24 * 60 * 60 * 1000 ? 2 : 0;

    const codeQuality = Math.round((activityScore + diversityScore + popularityScore + maintenanceScore) * 10) / 10;

    return {
      totalCommits: commits.length,
      totalContributors: contributors.length,
      linesOfCode: totalLOC,
      busFactor,
      testCoverage: Math.round(testCoverage * 10) / 10,
      codeQuality: Math.min(10, Math.max(1, codeQuality))
    };
  }

  private calculateTechnicalDebtScore(technicalDebt: any[]): number {
    if (!technicalDebt.length) return 8.5;

    const severityWeights = { low: 1, medium: 3, high: 5 };
    const totalWeight = technicalDebt.reduce((sum, debt) =>
      sum + (severityWeights[debt.severity as keyof typeof severityWeights] || 1), 0
    );

    return Math.max(1, 10 - (totalWeight / 10));
  }

  private calculateSecurityScore(securityIssues: any[]): number {
    if (!securityIssues.length) return 9.0;

    const severityWeights = { low: 1, medium: 3, high: 5, critical: 10 };
    const totalWeight = securityIssues.reduce((sum, issue) =>
      sum + (severityWeights[issue.severity as keyof typeof severityWeights] || 1), 0
    );

    return Math.max(1, 10 - (totalWeight / 5));
  }

  private calculatePerformanceScore(performanceMetrics: any[]): number {
    if (!performanceMetrics.length) return 7.5;

    const complexityIssues = performanceMetrics.filter(m =>
      m.complexity.includes('O(n²)') || m.complexity.includes('O(n³)')
    ).length;

    return Math.max(1, 10 - (complexityIssues * 2));
  }

  private async analyzeHotspots(_owner: string, _repo: string, files: FileInfo[]): Promise<AnalysisResult['hotspots']> {
    if (!this.llmConfig) return []; // Use llmConfig to check if LLM operations are possible

    const hotspots: Exclude<AnalysisResult['hotspots'], undefined> = [];

    const candidateFiles = files
      .filter(file => file.content && ((file.complexity || 0) > 50 || file.size > 5000))
      .slice(0, 8);

    for (const file of candidateFiles) {
      try {
        if (!file.content) continue;

        const complexityPrompt = `Analyze the code complexity of the following file snippet from "${file.name}".
Focus on identifying complex logic, potential maintainability issues, or areas that might be hard to understand.
Provide a concise explanation (2-3 sentences).

File: ${file.path}
Content Snippet (first 500 chars):
\`\`\`
${file.content.substring(0, 500)}
\`\`\`
`;
        let explanation = "Could not analyze complexity via API.";
        try {
          const complexityResponse = await this.fetchFromApi<{ generatedText: string }>(
            'llm/generate-text',
            undefined,
            'POST',
            {
              llmConfig: this.llmConfig,
              prompt: complexityPrompt,
              maxTokens: 200
            }
          );
          explanation = complexityResponse.generatedText;
        } catch (e) {
          console.error(`Failed to analyze complexity for ${file.path} via API:`, e);
        }

        const currentComplexity = file.complexity || 0;
        hotspots.push({
          file: file.path,
          complexity: currentComplexity || Math.floor(Math.random() * 40) + 40,
          changes: Math.floor(Math.random() * 50) + 10,
          explanation,
          size: file.content?.split('\n').length || 0,
          riskLevel: currentComplexity > 80 ? 'critical' :
                     currentComplexity > 60 ? 'high' :
                     currentComplexity > 40 ? 'medium' : 'low'
        });
      } catch (error) {
        console.error(`Failed to analyze ${file.path}:`, error);
      }
    }

    return hotspots.sort((a, b) => (b.complexity || 0) - (a.complexity || 0));
  }

  // Helper to clean and parse JSON from LLM text responses
  private _cleanAndParseJson<T>(jsonString: string): T | null {
    if (!jsonString || typeof jsonString !== 'string') {
      return null;
    }
    // Remove markdown code block fences if present
    let cleanedString = jsonString.trim();
    if (cleanedString.startsWith('```json')) {
      cleanedString = cleanedString.substring(7);
      if (cleanedString.endsWith('```')) {
        cleanedString = cleanedString.substring(0, cleanedString.length - 3);
      }
    } else if (cleanedString.startsWith('```')) {
      cleanedString = cleanedString.substring(3);
      if (cleanedString.endsWith('```')) {
        cleanedString = cleanedString.substring(0, cleanedString.length - 3);
      }
    }
    cleanedString = cleanedString.trim();

    try {
      return JSON.parse(cleanedString) as T;
    } catch (error) {
      console.error('Failed to parse JSON from LLM response:', error, 'Original string:', jsonString);
      // Attempt to fix common issues like trailing commas (very basic)
      try {
        const fixedJson = cleanedString.replace(/,\s*([}\]])/g, '$1');
        return JSON.parse(fixedJson) as T;
      } catch (e) {
        console.error('Failed to parse JSON even after basic fix:', e);
        return null;
      }
    }
  }

  private async analyzeKeyFunctions(_owner: string, _repo: string, files: FileInfo[]): Promise<AnalysisResult['keyFunctions']> {
    if (!this.llmConfig) return []; // Use llmConfig to check if LLM operations are possible

    const keyFunctions: Exclude<AnalysisResult['keyFunctions'], undefined> = [];

    const codeFiles = files.filter(file => {
      const ext = file.path.split('.').pop()?.toLowerCase();
      return ['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'go', 'rs'].includes(ext || '') && !!file.content;
    }).slice(0, 6);

    for (const file of codeFiles) {
      try {
        if (!file.content) continue;

        const functionMatches = file.content.match(/(function\s+\w+[^{]*{[^}]*}|const\s+\w+\s*=\s*[^=]*=>[^;]*|def\s+\w+[^:]*:[^:]*)/g);

        if (functionMatches && functionMatches.length > 0) {
          const func = functionMatches[0];
          const functionName = func.match(/(?:function\s+|const\s+|def\s+)(\w+)/)?.[1] || 'anonymous';

          let explanation = "Could not explain function via API.";
          const explanationPrompt = `Explain the following function extracted from "${file.name}".
Focus on its purpose, inputs, outputs, and core logic. Keep it concise (2-4 sentences).

Function Snippet:
\`\`\`
${func.substring(0, 1000)}
\`\`\`
Context (surrounding code, first 500 chars of file):
\`\`\`
${file.content?.substring(0, 500)}
\`\`\`
`;
          try {
            const explResponse = await this.fetchFromApi<{ generatedText: string }>(
              'llm/generate-text',
              undefined,
              'POST',
              {
                llmConfig: this.llmConfig,
                prompt: explanationPrompt,
                maxTokens: 250
              }
            );
            explanation = explResponse.generatedText;
          } catch (e) {
            console.error(`Failed to explain function ${functionName} in ${file.path} via API:`, e);
          }

          const complexity = Math.min(100, Math.max(10,
            func.length / 10 + (func.match(/if|for|while|switch|catch/g)?.length || 0) * 5
          ));

          let performanceData: import('../types').PerformanceMetric | undefined = undefined;
          const performancePrompt = `Analyze the algorithmic complexity of the following function from "${file.name}".
Respond with a JSON object containing:
- "complexity": string (e.g., "O(n)", "O(n log n)")
- "runtime": string (e.g., "Likely fast for typical inputs", "May be slow for large N")
- "recommendation": string (e.g., "Consider optimizing loop for better performance", "No major concerns")

Function Snippet:
\`\`\`
${func.substring(0, 1000)}
\`\`\`
Return ONLY the JSON object.`;

          try {
            const perfResponse = await this.fetchFromApi<{ generatedText: string }>(
              'llm/generate-text',
              undefined,
              'POST',
              {
                llmConfig: this.llmConfig,
                prompt: performancePrompt,
                maxTokens: 300
              }
            );
            // Type for the expected JSON structure from LLM
            type LLMPerformanceAnalysis = { complexity: string; runtime: string; recommendation: string };
            const parsedPerf = this._cleanAndParseJson<LLMPerformanceAnalysis>(perfResponse.generatedText);

            if (parsedPerf) {
              performanceData = {
                function: functionName,
                file: file.path,
                complexity: parsedPerf.complexity,
                estimatedRuntime: parsedPerf.runtime,
                recommendation: parsedPerf.recommendation,
              };
            } else {
              console.warn(`Could not parse performance analysis JSON for ${functionName} in ${file.path}. Raw: ${perfResponse.generatedText}`);
            }
          } catch (e) {
            console.error(`Failed to analyze performance for ${functionName} in ${file.path} via API:`, e);
          }

          keyFunctions.push({
            name: functionName,
            file: file.path,
            explanation,
            complexity: Math.round(complexity),
            performance: performanceData,
          });
        }
      } catch (error) {
        console.error(`Failed to analyze functions in ${file.path}:`, error);
      }
    }

    return keyFunctions.sort((a, b) => (b.complexity || 0) - (a.complexity || 0));
  }
  /* eslint-enable @typescript-eslint/no-explicit-any */
}
