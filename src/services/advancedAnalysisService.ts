import {
  SecurityIssue,
  PerformanceMetric,
  TechnicalDebt,
  APIEndpoint,
  FileInfo,
  LLMConfig
} from '../types';
import { AnalysisService } from './analysisService';

// Custom error types for better error handling
export class AnalysisError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'AnalysisError';
  }
}

export class LLMError extends Error {
  constructor(message: string, public readonly response?: string) {
    super(message);
    this.name = 'LLMError';
  }
}

interface SecretPattern {
  pattern: RegExp;
  type: string;
  severity: SecurityIssue['severity'];
}

export class AdvancedAnalysisService {
  private analysisService: AnalysisService;
  private llmConfig?: LLMConfig;
  
  private readonly secretPatterns: SecretPattern[] = [
    { 
      pattern: /(?:api[_-]?key|apikey)\s*[:=]\s*['"]([^'"]+)['"]/gi,
      type: 'API Key',
      severity: 'high'
    },
    { 
      pattern: /(?:password|pwd)\s*[:=]\s*['"]([^'"]+)['"]/gi,
      type: 'Password',
      severity: 'critical'
    },
    { 
      pattern: /(?:secret|token)\s*[:=]\s*['"]([^'"]+)['"]/gi,
      type: 'Secret Token',
      severity: 'high'
    },
    { 
      pattern: /(?:aws[_-]?access[_-]?key[_-]?id)\s*[:=]\s*['"]([^'"]+)['"]/gi,
      type: 'AWS Access Key',
      severity: 'critical'
    },
    { 
      pattern: /(?:private[_-]?key)\s*[:=]\s*['"]([^'"]+)['"]/gi,
      type: 'Private Key',
      severity: 'critical'
    }
  ];

  constructor(analysisService: AnalysisService, llmConfig?: LLMConfig) {
    this.analysisService = analysisService;
    this.llmConfig = llmConfig;
  }

  // Helper to clean and parse JSON from LLM text responses
  private _cleanAndParseJson<T>(jsonString: string): T | null {
    if (!jsonString || typeof jsonString !== 'string') {
      throw new LLMError('Invalid JSON string input');
    }

    let cleanedString = jsonString.trim();
    
    // Handle markdown code blocks
    if (cleanedString.startsWith('```')) {
      const endIndex = cleanedString.lastIndexOf('```');
      if (endIndex === -1) {
        throw new LLMError('Malformed markdown code block');
      }
      cleanedString = cleanedString.substring(
        cleanedString.startsWith('```json') ? 7 : 3,
        endIndex
      ).trim();
    }

    try {
      return JSON.parse(cleanedString) as T;
    } catch {
      // Try to fix common JSON formatting issues
      try {
        const fixedJson = cleanedString
          .replace(/,\s*([}\]])/g, '$1')
          .replace(/([{[,:])\s*([^"{[0-9-].*?)([},\]])/g, '$1"$2"$3');
        return JSON.parse(fixedJson) as T;
      } catch {
        throw new LLMError('Failed to parse JSON response', cleanedString);
      }
    }
  }

  async analyzeSecurityIssues(files: FileInfo[]): Promise<SecurityIssue[]> {
    const issues: SecurityIssue[] = [];

    for (const file of files) {
      if (!file.content) continue;

      const lines = file.content.split('\n');

      // Check for secrets in each line
      lines.forEach((line, index) => {
        this.secretPatterns.forEach(({ pattern, type, severity }) => {
          if (pattern.test(line)) {
            issues.push({
              type: 'secret',
              severity,
              file: file.path,
              line: index + 1,
              description: `Potential ${type} found in source code`,
              recommendation: `Move ${type} to environment variables or secure configuration`
            });
          }
          pattern.lastIndex = 0; // Reset regex state for next use
        });
      });

      // Check for common security vulnerabilities
      this.checkCodeVulnerabilities(file, issues);
    }

    return issues;
  }

  private checkCodeVulnerabilities(file: FileInfo, issues: SecurityIssue[]): void {
    const vulnerabilityChecks: Array<{
      check: (content: string) => boolean;
      createIssue: () => SecurityIssue;
    }> = [
      {
        check: (content) => content.includes('eval(') || content.includes('Function('),
        createIssue: () => ({
          type: 'vulnerability',
          severity: 'high',
          file: file.path,
          description: 'Use of eval() or Function() constructor detected',
          recommendation: 'Avoid dynamic code execution, use safer alternatives'
        })
      },
      {
        check: (content) => content.includes('innerHTML') && content.includes('user'),
        createIssue: () => ({
          type: 'vulnerability',
          severity: 'medium',
          file: file.path,
          description: 'Potential XSS vulnerability with innerHTML',
          recommendation: 'Use textContent or proper sanitization'
        })
      }
    ];

    if (!file.content) return;

    vulnerabilityChecks.forEach(({ check, createIssue }) => {
      if (check(file.content!)) {
        issues.push(createIssue());
      }
    });
  }

  async analyzePerformanceMetrics(files: FileInfo[]): Promise<PerformanceMetric[]> {
    const metrics: PerformanceMetric[] = [];

    const codeFileExtensions = ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cpp', '.c', '.cs', '.php', '.rb', '.go', '.rs', '.kt', '.scala', '.swift'];
    const codeFiles = files.filter(file => {
      const extension = file.path.toLowerCase().substring(file.path.lastIndexOf('.'));
      return codeFileExtensions.includes(extension) && file.content;
    });

    for (const file of codeFiles) {
      if (file.content && this.llmConfig && this.analysisService) {
        try {
          const performancePrompt = `Analyze the algorithmic complexity of the following code snippet from "${file.name}".
Respond with a JSON object containing:
- "complexity": string (e.g., "O(n)", "O(n log n)")
- "runtime": string (e.g., "Likely fast for typical inputs", "May be slow for large N")
- "recommendation": string (e.g., "Consider optimizing loop for better performance", "No major concerns")

Code Snippet (entire file content provided for context, but focus on dominant complexities):
\`\`\`
${file.content.substring(0, 2000)}
\`\`\`
Return ONLY the JSON object.`;

          const perfResponse = await this.analysisService.fetchFromApi<{ generatedText: string }>(
            '/llm/generate-text',
            undefined,
            'POST',
            {
              llmConfig: this.llmConfig,
              prompt: performancePrompt,
              maxTokens: 300
            }
          );

          type LLMPerformanceAnalysis = { complexity: string; runtime: string; recommendation: string };
          const parsedPerf = this._cleanAndParseJson<LLMPerformanceAnalysis>(perfResponse.generatedText);

          if (parsedPerf) {
            metrics.push({
              function: (file.content ? this.extractMainFunction(file.content) : undefined) || file.name,
              file: file.path,
              complexity: parsedPerf.complexity,
              estimatedRuntime: parsedPerf.runtime,
              recommendation: parsedPerf.recommendation
            });
          } else {
            console.warn(`Could not parse performance analysis JSON for ${file.path}. Raw: ${perfResponse.generatedText}`);
          }
        } catch (error) {
          console.error(`Failed to analyze performance for ${file.path} via API:`, error);
        }
      }
    }

    return metrics;
  }

  async analyzeTechnicalDebt(files: FileInfo[]): Promise<TechnicalDebt[]> {
    const debt: TechnicalDebt[] = [];

    for (const file of files) {
      if (file.content) {
        const lines = file.content.split('\n');

        const functionMatches = file.content.match(/function\s+\w+[^{]*{[^}]*}/g) || [];
        functionMatches.forEach(func => {
          const lineCount = func.split('\n').length;
          if (lineCount > 50) {
            debt.push({
              type: 'complexity',
              severity: 'medium',
              file: file.path,
              description: `Function is too long (${lineCount} lines)`,
              effort: '2-4 hours',
              impact: 'Improves maintainability and readability'
            });
          }
        });

        lines.forEach((line, index) => {
          if (line.includes('TODO') || line.includes('FIXME')) {
            debt.push({
              type: 'smell',
              severity: 'low',
              file: file.path,
              description: `Unresolved TODO/FIXME at line ${index + 1}`,
              effort: '30 minutes - 2 hours',
              impact: 'Completes intended functionality'
            });
          }
        });

        const duplicateThreshold = 5;
        const codeBlocks = this.extractCodeBlocks(file.content);
        const duplicates = this.findDuplicates(codeBlocks, duplicateThreshold);

        if (duplicates.length > 0) {
          debt.push({
            type: 'duplication',
            severity: 'medium',
            file: file.path,
            description: `${duplicates.length} duplicate code blocks found`,
            effort: '1-3 hours',
            impact: 'Reduces code duplication and maintenance burden'
          });
        }
      }
    }

    return debt;
  }

  async detectAPIEndpoints(files: FileInfo[]): Promise<APIEndpoint[]> {
    const endpoints: APIEndpoint[] = [];

    for (const file of files) {
      if (file.content) {
        const expressRoutes = file.content.match(/(app|router)\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g) || [];

        expressRoutes.forEach(route => {
          const match = route.match(/(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/);
          if (match && typeof match[1] === 'string' && typeof match[2] === 'string') {
            endpoints.push({
              method: match[1].toUpperCase(),
              path: match[2],
              file: file.path,
              parameters: this.extractRouteParameters(match[2]),
              documentation: this.extractRouteDocumentation(file.content, route) || ''
            });
          }
        });

        const fastApiRoutes = file.content.match(/@app\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g) || [];

        fastApiRoutes.forEach(route => {
          const match = route.match(/@app\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/);
          if (match && typeof match[1] === 'string' && typeof match[2] === 'string') {
            endpoints.push({
              method: match[1].toUpperCase(),
              path: match[2],
              file: file.path,
              parameters: this.extractRouteParameters(match[2]),
              documentation: '' // Add default empty string for documentation
            });
          }
        });
      }
    }

    return endpoints;
  }

  async generateRefactoringRoadmap(
    technicalDebt: TechnicalDebt[],
    hotspots: Array<{ file: string; complexity: number; changes: number; explanation?: string; size?: number; riskLevel: 'low' | 'medium' | 'high' | 'critical'; }> | undefined,
    files: FileInfo[]
  ): Promise<Array<{
    priority: number;
    title: string;
    description: string;
    effort: string;
    impact: string;
    files: string[];
  }>> {
    if (!this.llmConfig || !this.analysisService) return [];

    const llmConfigForApi: LLMConfig = this.llmConfig;

    const technicalDebtText = technicalDebt.slice(0, 10).map(td => `- ${td.file}: ${td.description} (Severity: ${td.severity})`).join('\n') || 'N/A';

    const hotspotsText = (hotspots || []).slice(0, 10).map(h => {
      const explanationText = h.explanation ? h.explanation.substring(0, 100) + '...' : 'N/A';
      return `- ${h.file}: Complexity ${h.complexity}, Risk ${h.riskLevel}, Explanation: ${explanationText}`;
    }).join('\n') || 'N/A';

    const totalFilesText = String(files.length);

    const promptParts: string[] = [
      `Generate a refactoring roadmap based on the following inputs.`,
      `Respond with a JSON array of objects, where each object has:`,
      `- "priority": number (1-5, 1 being highest)`,
      `- "title": string (concise title for the refactoring task)`,
      `- "description": string (detailed explanation of the task and why it's needed)`,
      `- "effort": string (e.g., "Small", "Medium", "Large", or time estimate)`,
      `- "impact": string (e.g., "High", "Medium", "Low", or description of benefits)`,
      `- "files": array of strings (relevant file paths)`,
      ``,
      `Technical Debt Items:`,
      technicalDebtText,
      ``,
      `Code Hotspots (Complex/Risky Files):`,
      hotspotsText,
      ``,
      `Total files in project: ${totalFilesText}`,
      ``,
      `Prioritize tasks that address high-severity debt, critical hotspots, or offer significant impact.`,
      `Return ONLY the JSON array.`
    ];
    const roadmapPrompt: string = promptParts.join('\n');

    const apiRequestBody: { llmConfig: LLMConfig; prompt: string; maxTokens: number } = {
      llmConfig: llmConfigForApi,
      prompt: roadmapPrompt,
      maxTokens: 1500
    };

    try {
      const roadmapResponse = await this.analysisService.fetchFromApi<{ generatedText: string }>(
        '/llm/generate-text',
        undefined,
        'POST',
        apiRequestBody
      );

      type RoadmapItem = { priority: number; title: string; description: string; effort: string; impact: string; files: string[] };
      const parsedRoadmap = this._cleanAndParseJson<RoadmapItem[]>(roadmapResponse.generatedText);

      if (parsedRoadmap) {
        return parsedRoadmap;
      } else {
        console.warn(`Could not parse refactoring roadmap JSON. Raw: ${roadmapResponse.generatedText}`);
        return [];
      }
    } catch (error) {
      console.error('Failed to generate refactoring roadmap:', error);
      return [];
    }
  }

  private extractMainFunction(content: string): string | undefined {
    const functionMatch = content.match(/(?:function\s+(\w+)|const\s+(\w+)\s*=|(\w+)\s*:\s*function)/);
    return functionMatch ? (functionMatch[1] || functionMatch[2] || functionMatch[3]) : undefined;
  }

  private extractCodeBlocks(content: string): string[] {
    return content.split('\n').filter(line => line.trim().length > 10);
  }

  private findDuplicates(blocks: string[], threshold: number): string[] {
    const duplicates: string[] = [];
    const seen = new Map<string, number>();

    blocks.forEach(block => {
      const normalized = block.trim().replace(/\s+/g, ' ');
      if (normalized.length > 20) {
        seen.set(normalized, (seen.get(normalized) || 0) + 1);
      }
    });

    seen.forEach((count, block) => {
      if (count >= threshold) {
        duplicates.push(block);
      }
    });

    return duplicates;
  }

  private extractRouteParameters(path: string): string[] {
    const params = path.match(/:(\w+)/g) || [];
    return params.map(param => param.substring(1));
  }

  private extractRouteDocumentation(content: string, route: string): string | undefined {
    const routeIndex = content.indexOf(route);
    if (routeIndex === -1) return undefined;

    const beforeRoute = content.substring(0, routeIndex);
    const lines = beforeRoute.split('\n');

    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i].trim();
      if (line.startsWith('//') || line.startsWith('*') || line.startsWith('/*')) {
        return line.replace(/^\/\*|\*\/|\/\/|\*/g, '').trim();
      }
      if (line && !line.startsWith('//') && !line.startsWith('*')) {
        break;
      }
    }

    return undefined;
  }
}