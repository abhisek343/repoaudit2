import { LLMService } from './llmService';
import { GitHubService } from './githubService';
import { 
  SecurityIssue, 
  PerformanceMetric, 
  TechnicalDebt, 
  APIEndpoint,
  FileInfo 
} from '../types';

export class AdvancedAnalysisService {
  private llmService?: LLMService;
  private githubService: GitHubService;

  constructor(githubToken?: string, llmService?: LLMService) {
    this.githubService = new GitHubService(githubToken);
    this.llmService = llmService;
  }

  async analyzeSecurityIssues(files: FileInfo[]): Promise<SecurityIssue[]> {
    const issues: SecurityIssue[] = [];

    // Secret detection patterns
    const secretPatterns = [
      { pattern: /(?:api[_-]?key|apikey)\s*[:=]\s*['"]([^'"]+)['"]/gi, type: 'API Key' },
      { pattern: /(?:password|pwd)\s*[:=]\s*['"]([^'"]+)['"]/gi, type: 'Password' },
      { pattern: /(?:secret|token)\s*[:=]\s*['"]([^'"]+)['"]/gi, type: 'Secret Token' },
      { pattern: /(?:aws[_-]?access[_-]?key[_-]?id)\s*[:=]\s*['"]([^'"]+)['"]/gi, type: 'AWS Access Key' },
      { pattern: /(?:private[_-]?key)\s*[:=]\s*['"]([^'"]+)['"]/gi, type: 'Private Key' }
    ];

    for (const file of files) {
      if (file.content) {
        const lines = file.content.split('\n');
        
        lines.forEach((line, index) => {
          secretPatterns.forEach(({ pattern, type }) => {
            const matches = line.match(pattern);
            if (matches) {
              issues.push({
                type: 'secret',
                severity: 'high',
                file: file.path,
                line: index + 1,
                description: `Potential ${type} found in source code`,
                recommendation: `Move ${type} to environment variables or secure configuration`
              });
            }
          });
        });

        // Check for other security issues
        if (file.content.includes('eval(') || file.content.includes('Function(')) {
          issues.push({
            type: 'vulnerability',
            severity: 'high',
            file: file.path,
            description: 'Use of eval() or Function() constructor detected',
            recommendation: 'Avoid dynamic code execution, use safer alternatives'
          });
        }

        if (file.content.includes('innerHTML') && file.content.includes('user')) {
          issues.push({
            type: 'vulnerability',
            severity: 'medium',
            file: file.path,
            description: 'Potential XSS vulnerability with innerHTML',
            recommendation: 'Use textContent or proper sanitization'
          });
        }
      }
    }

    return issues;
  }

  async analyzePerformanceMetrics(files: FileInfo[]): Promise<PerformanceMetric[]> {
    const metrics: PerformanceMetric[] = [];

    // Filter files to only include code files that can be analyzed for algorithmic complexity
    const codeFileExtensions = ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cpp', '.c', '.cs', '.php', '.rb', '.go', '.rs', '.kt', '.scala', '.swift'];
    const codeFiles = files.filter(file => {
      const extension = file.path.toLowerCase().substring(file.path.lastIndexOf('.'));
      return codeFileExtensions.includes(extension) && file.content;
    });

    for (const file of codeFiles) {
      if (file.content && this.llmService) {
        try {
          // Analyze algorithmic complexity
          const complexityAnalysis = await this.llmService.analyzeAlgorithmicComplexity(file.content, file.name);
          
          if (complexityAnalysis) {
            metrics.push({
              function: this.extractMainFunction(file.content),
              file: file.path,
              complexity: complexityAnalysis.complexity,
              estimatedRuntime: complexityAnalysis.runtime,
              recommendation: complexityAnalysis.recommendation
            });
          }
        } catch (error) {
          console.error(`Failed to analyze performance for ${file.path}:`, error);
        }
      }
    }

    return metrics;
  }

  async analyzeTechnicalDebt(files: FileInfo[]): Promise<TechnicalDebt[]> {
    const debt: TechnicalDebt[] = [];

    for (const file of files) {
      if (file.content) {
        // Check for code smells
        const lines = file.content.split('\n');
        
        // Long functions
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

        // TODO/FIXME comments
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

        // Duplicated code patterns
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
        // Express.js route patterns
        const expressRoutes = file.content.match(/(app|router)\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g) || [];
        
        expressRoutes.forEach(route => {
          const match = route.match(/(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/);
          if (match) {
            endpoints.push({
              method: match[1].toUpperCase(),
              path: match[2],
              file: file.path,
              parameters: this.extractRouteParameters(match[2]),
              documentation: this.extractRouteDocumentation(file.content, route)
            });
          }
        });

        // FastAPI route patterns
        const fastApiRoutes = file.content.match(/@app\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g) || [];
        
        fastApiRoutes.forEach(route => {
          const match = route.match(/@app\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/);
          if (match) {
            endpoints.push({
              method: match[1].toUpperCase(),
              path: match[2],
              file: file.path,
              parameters: this.extractRouteParameters(match[2])
            });
          }
        });
      }
    }

    return endpoints;
  }

  async generateRefactoringRoadmap(
    technicalDebt: TechnicalDebt[],
    hotspots: any[],
    files: FileInfo[]
  ): Promise<Array<{
    priority: number;
    title: string;
    description: string;
    effort: string;
    impact: string;
    files: string[];
  }>> {
    if (!this.llmService) return [];

    try {
      const roadmap = await this.llmService.generateRefactoringRoadmap({
        technicalDebt,
        hotspots,
        fileCount: files.length
      });

      return roadmap;
    } catch (error) {
      console.error('Failed to generate refactoring roadmap:', error);
      return [];
    }
  }

  private extractMainFunction(content: string): string {
    const functionMatch = content.match(/(?:function\s+(\w+)|const\s+(\w+)\s*=|(\w+)\s*:\s*function)/);
    return functionMatch ? (functionMatch[1] || functionMatch[2] || functionMatch[3]) : 'anonymous';
  }

  private extractCodeBlocks(content: string): string[] {
    // Simple implementation - in production, use AST parsing
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

    // Look for comments above the route
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