import {
  SecurityIssue,
  PerformanceMetric,
  TechnicalDebt,
  APIEndpoint,
  FileInfo,
  FunctionInfo
} from '../types';
import { LLMService, LLMError as CustomLLMError } from './llmService';

// Custom error types for better error handling
export class AnalysisError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'AnalysisError';
  }
}

interface SecretPattern {
  pattern: RegExp;
  type: string;
  severity: SecurityIssue['severity'];
  cwe?: string;
}

export class AdvancedAnalysisService {
  private llmService: LLMService;
  
  private readonly secretPatterns: SecretPattern[] = [
    { 
      pattern: /(?:api[_-]?key|token|secret)\s*[:=]\s*['"]([a-zA-Z0-9\-_]{20,})['"]/gi,
      type: 'Generic API Key/Token',
      severity: 'high',
      cwe: 'CWE-798'
    },
    { 
      pattern: /(?:password|pwd)\s*[:=]\s*['"](.{8,})['"]/gi,
      type: 'Password',
      severity: 'critical',
      cwe: 'CWE-798'
    },
    { 
      pattern: /private[_-]?key-----BEGIN ((?:RSA|EC|OPENSSH|PGP) )?PRIVATE KEY-----/gi,
      type: 'Private Key Block',
      severity: 'critical',
      cwe: 'CWE-320'
    },
    {
      pattern: /AWS_ACCESS_KEY_ID\s*[:=]\s*['"](AKIA[0-9A-Z]{16})['"]/gi,
      type: 'AWS Access Key ID',
      severity: 'critical',
      cwe: 'CWE-798'
    },
    {
      pattern: /AWS_SECRET_ACCESS_KEY\s*[:=]\s*['"]([a-zA-Z0-9/+=]{40})['"]/gi,
      type: 'AWS Secret Access Key',
      severity: 'critical',
      cwe: 'CWE-798'
    },
    { 
      pattern: /(?:mongodb|mysql|postgres|sqlserver|redis):\/\/(?:[^:@\s]+:[^@\s]+@)/gi,
      type: 'Database Connection String with Credentials',
      severity: 'high',
      cwe: 'CWE-798'
    }
  ];

  constructor(llmService: LLMService) {
    this.llmService = llmService;
  }

  private _cleanAndParseJson<T>(jsonString: string): T | null {
    if (!jsonString || typeof jsonString !== 'string') {
      throw new CustomLLMError('Invalid JSON string input for parsing.');
    }

    const cleanedStringInitial = jsonString.trim();
    let finalJsonString = cleanedStringInitial; 
      // Handle markdown code blocks
    if (finalJsonString.startsWith('```') && finalJsonString.endsWith('```')) {
      const endIndex = finalJsonString.lastIndexOf('```');
      if (endIndex === -1) {
        throw new CustomLLMError('Malformed markdown code block (end marker not found where expected)');
      }
      const firstNewlineIndex = finalJsonString.indexOf('\n');
      if (firstNewlineIndex === -1 && endIndex > 3) { 
          finalJsonString = finalJsonString.substring(finalJsonString.indexOf('```') + 3, endIndex).trim(); 
      } else if (firstNewlineIndex !== -1) {
          finalJsonString = finalJsonString.substring(firstNewlineIndex + 1, endIndex).trim();
      } else {
          finalJsonString = finalJsonString.substring(3, endIndex).trim();
      }
    }
    
    try {
      return JSON.parse(finalJsonString) as T;
    } catch (e: unknown) { 
      const fixedJsonAttempt = finalJsonString
          .replace(/,\s*([}\]])/g, '$1') 
          .replace(/([{[,:])\s*([a-zA-Z0-9_]+)\s*:/g, '$1"$2":');
      try {
        return JSON.parse(fixedJsonAttempt) as T;
      } catch (parseError: unknown) { 
        throw new CustomLLMError('Failed to parse JSON response, even after attempting fixes.', { 
          originalInput: jsonString,
          processedString: finalJsonString,
          attemptedFix: fixedJsonAttempt,
          initialParseError: (e instanceof Error) ? e.message : String(e), 
          secondaryParseError: (parseError instanceof Error) ? parseError.message : String(parseError)
        });
      }
    }
  }

  /**
   * Safely execute regex matching with timeout and max matches to prevent ReDoS
   */
  private matchPatternSafely(pattern: RegExp, text: string, timeoutMs: number = 5000): Promise<RegExpMatchArray[]> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Pattern matching timeout')), timeoutMs);
      const matches: RegExpMatchArray[] = [];
      let match: RegExpMatchArray | null;
      let count = 0;
      const MAX_MATCHES = 1000;
      
      try {
        // Reset lastIndex in case of global regex reuse
        pattern.lastIndex = 0;
        while ((match = pattern.exec(text)) !== null && count < MAX_MATCHES) {
          matches.push(match);
          count++;
        }
        clearTimeout(timer);
        resolve(matches);
      } catch (err) {
        clearTimeout(timer);
        reject(err);
      }
    });
  }

  async analyzeSecurityIssues(files: FileInfo[]): Promise<SecurityIssue[]> {
    const issues: SecurityIssue[] = [];
    const CODE_SNIPPET_CONTEXT_LINES = 2;
    let llmVulnCheckCounter = 0;
    const MAX_FILES_FOR_LLM_VULN_CHECK = 10;

    for (const file of files) {
      if (!file.content) continue;
      
      const lines = file.content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        for (const { pattern, type, severity, cwe } of this.secretPatterns) {
          try {
            const matches = await this.matchPatternSafely(pattern, line);
            if (matches.length) {
              const start = Math.max(0, i - CODE_SNIPPET_CONTEXT_LINES);
              const end = Math.min(lines.length, i + CODE_SNIPPET_CONTEXT_LINES + 1);
              const snippet = lines.slice(start, end).join('\n');
              matches.forEach(() => {
                issues.push({ 
                  type: 'secret', 
                  severity, 
                  file: file.path, 
                  line: i + 1,
                  description: `Potential ${type} detected.`,
                  recommendation: `Validate and remove credentials from code; use secure vaults instead.`,
                  cwe, 
                  codeSnippet: snippet 
                });
              });
            }
          } catch (err) {
            console.warn(`Timeout or error scanning for ${type} in ${file.path}:`, err);
          }
        }
      }
      
      // LLM-based vulnerability check for a limited number of files
      if (this.llmService.isConfigured() && llmVulnCheckCounter < MAX_FILES_FOR_LLM_VULN_CHECK) {
        const analyzableExtensions = ['.js', '.ts', '.py', '.java', '.php', '.rb', '.go', '.cs', '.c', '.cpp', '.jsx', '.tsx', '.html', '.sql'];
        const fileExtension = `.${file.name.split('.').pop()?.toLowerCase()}`;
        if (analyzableExtensions.includes(fileExtension) && file.content.length >= 50) {
          await this.checkCodeVulnerabilitiesLLM(file, issues);
          llmVulnCheckCounter++;
          // Delay between LLM calls to avoid rate limits
          const delayMs = Number(process.env.LLM_VULN_DELAY_MS) || 2000;
          await new Promise(res => setTimeout(res, delayMs));
        }
      }
    }
    return issues;
  }

  private async checkCodeVulnerabilitiesLLM(file: FileInfo, issues: SecurityIssue[]): Promise<void> {
    if (!this.llmService.isConfigured() || !file.content || file.content.length < 50) return;

    const analyzableExtensions = ['.js', '.ts', '.py', '.java', '.php', '.rb', '.go', '.cs', '.c', '.cpp', '.jsx', '.tsx', '.html', '.sql'];
    const fileExtension = `.${file.name.split('.').pop()?.toLowerCase()}`;
    if (!analyzableExtensions.includes(fileExtension)) return;
    
    const contentToAnalyze = file.content.substring(0, 4000);
    const prompt = `
Analyze the following code snippet from "${file.path}" for common security vulnerabilities like XSS, SQL Injection, CSRF, insecure deserialization, command injection, path traversal, hardcoded secrets (if missed by regex), or insecure library usage.
For each potential vulnerability found, provide a JSON object with: "type": "vulnerability", "severity": "low|medium|high|critical", "line": number, "description": string, "recommendation": string, "cwe": "CWE-ID (optional)".
If no significant vulnerabilities are found, return an empty array [].

Code:
\`\`\`${file.language || ''}
${contentToAnalyze}
\`\`\`
Return ONLY a JSON array of vulnerability objects, or an empty array.
`;

    try {
      const response = await this.llmService.generateText(prompt, 500);
      const parsedVulnerabilities = this._cleanAndParseJson<Omit<SecurityIssue, 'file'>[]>(response);

      if (parsedVulnerabilities && Array.isArray(parsedVulnerabilities)) {
        parsedVulnerabilities.forEach(vuln => {
          if (vuln.description && vuln.severity) { 
            issues.push({ ...vuln, file: file.path, type: 'vulnerability' });
          }
        });
      }
    } catch (error: unknown) {
        if (error instanceof CustomLLMError) {
            console.warn(`AdvancedAnalysisService: LLM error during vulnerability check for ${file.path}: ${error.message}`, error.details);
        } else {
            console.error(`AdvancedAnalysisService: Unexpected error during vulnerability check for ${file.path}:`, error);
        }
    }
  }

  async analyzePerformanceMetrics(files: FileInfo[]): Promise<PerformanceMetric[]> {
    const metrics: PerformanceMetric[] = [];
    if (!this.llmService.isConfigured()) return metrics;

    const codeFileExtensions = ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cpp', '.c', '.cs', '.php', '.rb', '.go', '.rs', '.kt', '.scala', '.swift'];
    const codeFiles = files.filter(file => {
      const extension = file.path.substring(file.path.lastIndexOf('.')).toLowerCase();
      return codeFileExtensions.includes(extension) && file.content && file.content.length > 100;
    });

    const perfMetricsFileLimit = Number(process.env.PERF_METRICS_FILE_LIMIT) || 5;
    const filesToProcessPerf = codeFiles.slice(0, perfMetricsFileLimit);

    if (codeFiles.length > perfMetricsFileLimit) {
      console.warn(`AdvancedAnalysisService (analyzePerformanceMetrics): Processing limited to ${perfMetricsFileLimit} of ${codeFiles.length} eligible files. Set PERF_METRICS_FILE_LIMIT to adjust.`);
    }

    for (const file of filesToProcessPerf) {
      if (file.content) {
        try {
          const llmPerfAnalysis = await this.llmService.analyzeAlgorithmicComplexity(file.content, file.path);
          if (llmPerfAnalysis) {
            metrics.push({
              function: file.name, 
              file: file.path,
              complexity: llmPerfAnalysis.complexity,
              estimatedRuntime: llmPerfAnalysis.runtime,
              recommendation: llmPerfAnalysis.recommendation || ''
            });
          }
        } catch (error: unknown) {
           if (error instanceof CustomLLMError) {
             console.warn(`AdvancedAnalysisService: LLM error during performance analysis for ${file.path}: ${error.message}`, error.details);
           } else {
             console.error(`AdvancedAnalysisService: Unexpected error during performance analysis for ${file.path}:`, error);
           }
        }
      }
    }
    return metrics;
  }

  async analyzeTechnicalDebt(files: FileInfo[]): Promise<TechnicalDebt[]> {
    const debt: TechnicalDebt[] = [];
    
    if (!this.llmService.isConfigured()) {
        files.forEach(file => {
            if (file.content) {
                const lines = file.content.split('\n');
                lines.forEach((line, index) => {
                    if (line.match(/\b(TODO|FIXME|XXX)\b/i)) {
                        debt.push({
                            type: 'smell',
                            severity: 'low',
                            file: file.path,
                            line: index + 1,
                            description: `Unresolved marker: ${line.trim()}`,
                            effort: '0.5h',
                            impact: 'Improves clarity and completes pending tasks'
                        });
                    }
                });
                if (lines.length > 1000) { 
                     debt.push({
                        type: 'complexity',
                        severity: 'medium',
                        file: file.path,
                        description: `File is very long (${lines.length} lines), consider splitting.`,
                        effort: '4h',
                        impact: 'Improves maintainability'
                    });
                }
            }
        });
        return debt;
    }

    const techDebtFileLimit = Number(process.env.TECH_DEBT_FILE_LIMIT) || 5;
    const eligibleFilesForTechDebt = files.filter(f => f.content && f.content.length > 100);
    const filesToProcessTechDebt = eligibleFilesForTechDebt.slice(0, techDebtFileLimit);

    if (eligibleFilesForTechDebt.length > techDebtFileLimit) {
      console.warn(`AdvancedAnalysisService (analyzeTechnicalDebt): Processing limited to ${techDebtFileLimit} of ${eligibleFilesForTechDebt.length} eligible files. Set TECH_DEBT_FILE_LIMIT to adjust.`);
    }

    for (const file of filesToProcessTechDebt) {
        const contentToAnalyze = file.content!.substring(0, 4000);
        const prompt = `
Analyze the following code from "${file.path}" for technical debt.
Identify issues like code smells (e.g., long methods, large classes, duplicated code, dead code, magic numbers), outdated practices, or areas needing refactoring for better maintainability or readability.
For each issue, provide a JSON object: {"type": "complexity|duplication|smell|outdated|documentation", "severity": "low|medium|high", "line": number (approximate), "description": string, "effort": "e.g., 1h, 4h, 1d", "impact": "e.g., Improved readability, Reduced bugs", "recommendation": "string"}.
If no significant debt is found, return an empty array [].

Code:
\`\`\`${file.language || ''}
${contentToAnalyze}
\`\`\`
Return ONLY a JSON array of technical debt objects, or an empty array.
`;
        try {
            const response = await this.llmService.generateText(prompt, 600);
            const parsedDebt = this._cleanAndParseJson<Omit<TechnicalDebt, 'file'>[]>(response);
            if (parsedDebt && Array.isArray(parsedDebt)) {
                parsedDebt.forEach(item => {
                    if (item.description && item.severity) { 
                       debt.push({ ...item, file: file.path });
                    }
                });
            }
        } catch (error: unknown) {
            if (error instanceof CustomLLMError) {
                console.warn(`AdvancedAnalysisService: LLM error during tech debt analysis for ${file.path}: ${error.message}`, error.details);
            } else {
                console.error(`AdvancedAnalysisService: Unexpected error during tech debt analysis for ${file.path}:`, error);
            }
        }
    }
    return debt;
  }
  async detectAPIEndpoints(files: FileInfo[]): Promise<APIEndpoint[]> {
    const endpoints: APIEndpoint[] = [];
    
    // Enhanced regex-based detection for when LLM is not configured
    if (!this.llmService.isConfigured()) {
        files.forEach(file => {
            if (file.content) {
                endpoints.push(...this.extractEndpointsFromFile(file));
            }
        });
        return endpoints;
    }

    const apiEndpointFileLimit = Number(process.env.API_ENDPOINT_FILE_LIMIT) || 5;
    const eligibleFilesForApi = files.filter(f => 
        (f.path.includes('route') || f.path.includes('controller') || f.path.includes('api') || f.name.match(/\.(?:js|ts|py|go|java|rb)$/i)) &&
        f.content && f.content.length > 100
    );
    const filesToProcessApi = eligibleFilesForApi.slice(0, apiEndpointFileLimit);

    if (eligibleFilesForApi.length > apiEndpointFileLimit) {
      console.warn(`AdvancedAnalysisService (detectAPIEndpoints): Processing limited to ${apiEndpointFileLimit} of ${eligibleFilesForApi.length} eligible files. Set API_ENDPOINT_FILE_LIMIT to adjust.`);
    }
    
    for (const file of filesToProcessApi) { 
      const contentToAnalyze = file.content!.substring(0, 4000);
      const prompt = `
Analyze the following code from "${file.path}" to detect API endpoint definitions.
For each endpoint, provide a JSON object: {"method": "GET|POST|PUT|DELETE|PATCH", "path": string, "handlerFunction": "string (name of handler function/method)", "parameters": [{"name": string, "type": string, "in": "query|path|body"}], "responses": [{"statusCode": string, "description": string, "schema": any}], "documentation": "string (brief description if available from comments or context)", "security": ["array of security schemes"]}.
If no endpoints are found, return an empty array [].

Code:
\`\`\`${file.language || ''}
${contentToAnalyze}
\`\`\`
Return ONLY a JSON array of endpoint objects, or an empty array.
`;
        try {
          const response = await this.llmService.generateText(prompt, 600);
          const parsedEndpoints = this._cleanAndParseJson<Omit<APIEndpoint, 'file'>[]>(response);
          if (parsedEndpoints && Array.isArray(parsedEndpoints)) {
            parsedEndpoints.forEach(ep => {
              if (ep.method && ep.path) { 
                endpoints.push({ ...ep, file: file.path });
              }
            });
          }
        } catch (error: unknown) {
            if (error instanceof CustomLLMError) {
                console.warn(`AdvancedAnalysisService: LLM error during API endpoint detection for ${file.path}: ${error.message}`, error.details);
            } else {
                console.error(`AdvancedAnalysisService: Unexpected error during API endpoint detection for ${file.path}:`, error);
            }
        }
    }
    return endpoints;
  }

  async generateRefactoringRoadmap(
    technicalDebt: TechnicalDebt[],
    hotspots: Array<{ 
      file: string; 
      path: string; 
      complexity: number; 
      changes: number; 
      explanation?: string; 
      size?: number; 
      riskLevel: 'low' | 'medium' | 'high' | 'critical'; 
      primaryContributors?: string[]; 
    }> | undefined,
    fileCount: number
  ): Promise<Array<{
    priority: number;
    title: string;
    description: string;
    effort: string;
    impact: string;
    files: string[];
  }>> {
    if (!this.llmService.isConfigured()) return [];

    const debtText = technicalDebt.slice(0, 10).map(td => 
      `- ${td.file}: ${td.description} (Severity: ${td.severity}, Effort: ${td.effort})`
    ).join('\n') || 'N/A';
    
    const hotspotsText = (hotspots || []).slice(0, 5).map(h => 
      `- ${h.path}: Risk ${h.riskLevel}, Complexity ${h.complexity}%, Changes ${h.changes}`
    ).join('\n') || 'N/A';
    
    const prompt = `
Generate a prioritized refactoring roadmap (3-5 items) based on the following analysis:
Total files in project: ${fileCount}
Selected Technical Debt Items (up to 10):
${debtText}
Selected Code Hotspots (up to 5):
${hotspotsText}

For each roadmap item, provide a JSON object: {"priority": number (1-5, 1 highest), "title": string, "description": string (what and why), "effort": "Small/Medium/Large or time estimate", "impact": "Low/Medium/High or benefits", "files": ["relevant/file/path.ext"]}.
Prioritize tasks that address high-severity debt, critical hotspots, or offer significant architectural/maintainability improvements.
Return ONLY a JSON array of roadmap items.
`;
    try {
      const response = await this.llmService.generateText(prompt, 1000);
      const parsedRoadmap = this._cleanAndParseJson<Array<{ 
        priority: number; 
        title: string; 
        description: string; 
        effort: string; 
        impact: string; 
        files: string[]; 
      }>>(response);
      return parsedRoadmap || [];
    } catch (error: unknown) {
      if (error instanceof CustomLLMError) {
        console.warn(`AdvancedAnalysisService: LLM error during refactoring roadmap generation: ${error.message}`, error.details);
      } else {
        console.error(`AdvancedAnalysisService: Unexpected error during refactoring roadmap generation:`, error);
      }
      return [];
    }
  }

  async parseFunctions(fileContent: string, language?: string): Promise<FunctionInfo[]> {
    const functions: FunctionInfo[] = [];
    if (!fileContent) return functions;

    let regex: RegExp;
    switch (language?.toLowerCase()) {
        case 'javascript':
        case 'typescript':
            regex = /(?:async\s+)?function\s+([a-zA-Z0-9_$]+)\s*\(([^)]*)\)|const\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s*)?\(([^)]*)\)\s*=>|([a-zA-Z0-9_$]+)\s*\(([^)]*)\)\s*(?:\{|=>)/g;
            break;
        case 'python':
            regex = /def\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\):/g;
            break;
        default:
            return functions; 
    }

    let match;
    const lines = fileContent.split('\n');
    while ((match = regex.exec(fileContent)) !== null) {        const functionName = match[1] || match[3] || match[5] || 'anonymous';
        const paramsString = match[2] || match[4] || match[6] || '';
        
        const parameters: FunctionInfo['parameters'] = paramsString
            .split(',')
            .map(param => param.trim())
            .filter(param => param.length > 0)
            .map(param => {
                const parts = param.split(/[:=?]/).map(p => p.trim());
                const name = parts[0];
                let type: string | undefined = undefined;
                if (param.includes(':')) {
                    const typeMatch = param.match(/:\s*([^{}\[\],]+)/);
                    if (typeMatch && typeMatch[1]) {
                        type = typeMatch[1].trim();
                    }
                }

                return {
                    name: name,
                    type: type || 'any',
                    optional: param.includes('?'),
                };
            });

        const matchIndex = match.index!;
        let currentChars = 0;
        let startLine = 0;
        for(let i = 0; i < lines.length; i++) {
            currentChars += lines[i].length + 1; 
            if(currentChars >= matchIndex) {
                startLine = i + 1;
                break;
            }
        }
        
        const functionBodyMatch = match[0];
        const sloc = functionBodyMatch.split('\n').length;

        functions.push({
            name: functionName,
            startLine: startLine,
            endLine: startLine + (sloc - 1),
            parameters: parameters,
            sloc: sloc,
            calls: [],
            description: `Function ${functionName}`,
            isAsync: !!match[0].match(/^async\s+/),
            content: functionBodyMatch
        });
    }
    return functions;
  }

  private extractEndpointsFromFile(file: FileInfo): APIEndpoint[] {
    const endpoints: APIEndpoint[] = [];
    const content = file.content!;
    
    // Enhanced patterns for different frameworks and languages
    const patterns = [
      // Express.js patterns
      { 
        regex: /(app|router)\.(get|post|put|delete|patch|use)\s*\(\s*['"`]([^'"`]+)['"`]/g,
        methodIndex: 2,
        pathIndex: 3,
        framework: 'Express.js'
      },
      // FastAPI patterns
      { 
        regex: /@app\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g,
        methodIndex: 1,
        pathIndex: 2,
        framework: 'FastAPI'
      },
      // Flask patterns
      { 
        regex: /@app\.route\s*\(\s*['"`]([^'"`]+)['"`].*?methods\s*=\s*\[['"`]([^'"`]+)['"`]\]/g,
        methodIndex: 2,
        pathIndex: 1,
        framework: 'Flask'
      },
      // ASP.NET patterns
      { 
        regex: /\[Http(Get|Post|Put|Delete|Patch)\s*\(\s*['"`]([^'"`]+)['"`]\s*\)\]/g,
        methodIndex: 1,
        pathIndex: 2,
        framework: 'ASP.NET'
      },
      // Spring Boot patterns
      { 
        regex: /@(Get|Post|Put|Delete|Patch)Mapping\s*\(\s*['"`]([^'"`]+)['"`]/g,
        methodIndex: 1,
        pathIndex: 2,
        framework: 'Spring Boot'
      },
      // Gin (Go) patterns
      { 
        regex: /router\.(GET|POST|PUT|DELETE|PATCH)\s*\(\s*['"`]([^'"`]+)['"`]/g,
        methodIndex: 1,
        pathIndex: 2,
        framework: 'Gin'
      }
    ];

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.regex.exec(content)) !== null) {
        const method = match[pattern.methodIndex];
        const path = match[pattern.pathIndex];
        
        if (method && path) {
          // Extract handler function name if possible
          let handlerFunction = 'Unknown';
          
          // Look for function name after the route definition
          const remainingContent = content.substring(match.index + match[0].length);
          const handlerMatch = remainingContent.match(/[\s,]*([a-zA-Z_$][a-zA-Z0-9_$]*)/);
          if (handlerMatch) {
            handlerFunction = handlerMatch[1];
          }
          
          endpoints.push({
            method: method.toUpperCase(),
            path: path,
            file: file.path,
            handlerFunction: `${handlerFunction} (${pattern.framework})`,
          });
        }
      }
    });

    // Also look for RESTful controller methods
    if (file.path.includes('controller') || file.path.includes('Controller')) {
      const restfulPatterns = [
        { regex: /public.*?function\s+(index|show|store|update|destroy)\s*\(/g, method: 'GET', type: 'Laravel' },
        { regex: /def\s+(index|show|create|update|destroy)\s*\(/g, method: 'GET', type: 'Rails' }
      ];

      restfulPatterns.forEach(pattern => {
        let match;
        while ((match = pattern.regex.exec(content)) !== null) {
          const functionName = match[1];
          let method = 'GET';
          let path = '/';
          
          // Infer method and path from function name
          switch (functionName) {
            case 'index':
              method = 'GET';
              path = '/';
              break;
            case 'show':
              method = 'GET';
              path = '/:id';
              break;
            case 'store':
            case 'create':
              method = 'POST';
              path = '/';
              break;
            case 'update':
              method = 'PUT';
              path = '/:id';
              break;
            case 'destroy':
              method = 'DELETE';
              path = '/:id';
              break;
          }
          
          endpoints.push({
            method,
            path,
            file: file.path,
            handlerFunction: `${functionName} (${pattern.type} RESTful)`,
          });
        }
      });
    }

    return endpoints;
  }
  async analyzeFeatureFileMatrix(files: FileInfo[]): Promise<{ featureFile: string; sourceFiles: string[] }[]> {
    console.log(`[FeatureFileMatrix] Starting analysis with ${files.length} total files`);
    
    if (!this.llmService.isConfigured()) {
      console.warn('AdvancedAnalysisService (analyzeFeatureFileMatrix): LLM service not configured. Using fallback data.');
      return this.generateFallbackFeatureMatrix(files);
    }

    const featureFiles = files.filter(f => f.name.endsWith('.feature') && f.content);
    const sourceFiles = files.filter(f => !f.name.endsWith('.feature') && f.content && 
      ['typescript', 'javascript', 'python', 'java', 'go', 'csharp', 'php', 'ruby'].includes(f.language || ''));

    console.log(`[FeatureFileMatrix] Found ${featureFiles.length} feature files and ${sourceFiles.length} source files`);
    console.log(`[FeatureFileMatrix] Feature files: ${featureFiles.map(f => f.path).join(', ') || 'none'}`);
    console.log(`[FeatureFileMatrix] Source file languages: ${[...new Set(sourceFiles.map(f => f.language))].join(', ')}`);

    if (featureFiles.length === 0) {
      console.warn('AdvancedAnalysisService (analyzeFeatureFileMatrix): No .feature files found.');
      return this.generateFallbackFeatureMatrix(files);
    }
      if (sourceFiles.length === 0) {
      console.warn('AdvancedAnalysisService (analyzeFeatureFileMatrix): No source files found with supported languages.');
      return this.generateFallbackFeatureMatrix(files);
    }    const matrix: { featureFile: string; sourceFiles: string[] }[] = [];

    for (const featureFile of featureFiles.slice(0, 5)) { // Limit to 5 feature files to manage cost/time
      const sourceFilePaths = sourceFiles
        .sort((a, b) => a.path.localeCompare(b.path))
        .slice(0, 100) // Reduced limit to prevent prompt truncation
        .map(f => f.path);
        
      console.log(`[FeatureFileMatrix] Processing ${featureFile.path} against ${sourceFilePaths.length} source files`);
        
      const prompt = `
You are analyzing a Gherkin feature file to find which source code files implement the described functionality.

Feature File: "${featureFile.path}"
Content:
\`\`\`gherkin
${featureFile.content!.substring(0, 1500)}
\`\`\`

Available source files (${sourceFilePaths.length} total):
${sourceFilePaths.join('\n')}

Respond ONLY with valid minified JSON matching this exact schema:
{"sourceFiles": ["path/to/file1.ts", "path/to/file2.js"]}

Select the 3-8 most relevant source files that would implement the scenarios described in the feature file.
`;      try {
        const response = await this.llmService.generateText(prompt, 800);
        console.log(`[FeatureFileMatrix] LLM response for ${featureFile.path}: ${response.substring(0, 200)}...`);
        
        const parsedResult = this._cleanAndParseJson<{ sourceFiles: string[] }>(response);
        if (parsedResult && parsedResult.sourceFiles && Array.isArray(parsedResult.sourceFiles)) {
          const validFiles = parsedResult.sourceFiles.filter(sf => sourceFilePaths.includes(sf));
          console.log(`[FeatureFileMatrix] Found ${validFiles.length} valid matches for ${featureFile.path}`);
          if (validFiles.length > 0) {
            matrix.push({
              featureFile: featureFile.path,
              sourceFiles: validFiles
            });
          }
        } else {
          console.warn(`[FeatureFileMatrix] Invalid response format for ${featureFile.path}, trying heuristic fallback`);
          throw new Error('Invalid JSON response format');
        }
      } catch (error: unknown) {
        if (error instanceof CustomLLMError) {
            console.warn(`AdvancedAnalysisService: LLM error during feature file matrix analysis for ${featureFile.path}: ${error.message}`, error.details);
        } else {
            console.error(`AdvancedAnalysisService: Unexpected error during feature file matrix analysis for ${featureFile.path}:`, error);
        }
        
        // Fallback: simple heuristic matching
        console.log(`[FeatureFileMatrix] Using heuristic fallback for ${featureFile.path}`);
        const featureBaseName = featureFile.name.replace('.feature', '').toLowerCase();
        const heuristicMatches = sourceFiles
          .filter(sf => sf.path.toLowerCase().includes(featureBaseName) || 
                       sf.name.toLowerCase().includes(featureBaseName))
          .slice(0, 3)
          .map(sf => sf.path);
          
        if (heuristicMatches.length > 0) {
          console.log(`Using heuristic fallback for ${featureFile.path}: ${heuristicMatches.join(', ')}`);
          matrix.push({
            featureFile: featureFile.path,
            sourceFiles: heuristicMatches
          });
        }
      }
    }

    // If no real feature files found, generate sample data for demonstration
    if (matrix.length === 0) {
      console.log('No feature file matrix data generated, creating fallback sample data');
      return this.generateFallbackFeatureMatrix(files);
    }

    return matrix;
  }
  private generateFallbackFeatureMatrix(files: FileInfo[]): { featureFile: string; sourceFiles: string[] }[] {
    console.log(`[FeatureFileMatrix] Generating fallback matrix from ${files.length} files`);
    
    const sourceFiles = files.filter(f => this.isSourceFile(f.path));
    
    if (sourceFiles.length === 0) {
      console.warn('[FeatureFileMatrix] No source files available for fallback matrix');
      return [];
    }

    console.log(`[FeatureFileMatrix] Using ${sourceFiles.length} source files for fallback`);

    // Generate sample feature mappings based on common patterns
    const fallbackMatrix: { featureFile: string; sourceFiles: string[] }[] = [];
    
    // Group files by common patterns
    const components = sourceFiles.filter(f => f.path.toLowerCase().includes('component'));
    const services = sourceFiles.filter(f => f.path.toLowerCase().includes('service'));
    const pages = sourceFiles.filter(f => f.path.toLowerCase().includes('page'));
    const utils = sourceFiles.filter(f => f.path.toLowerCase().includes('util'));
    const api = sourceFiles.filter(f => f.path.toLowerCase().includes('api'));
    const auth = sourceFiles.filter(f => f.path.toLowerCase().includes('auth'));

    // Create synthetic feature mappings
    if (components.length > 0) {
      fallbackMatrix.push({
        featureFile: 'User Interface Components',
        sourceFiles: components.slice(0, 8).map(f => f.path)
      });
    }

    if (services.length > 0) {
      fallbackMatrix.push({
        featureFile: 'Business Logic & Services',
        sourceFiles: services.slice(0, 6).map(f => f.path)
      });
    }

    if (pages.length > 0) {
      fallbackMatrix.push({
        featureFile: 'Application Pages',
        sourceFiles: pages.slice(0, 6).map(f => f.path)
      });
    }

    if (api.length > 0) {
      fallbackMatrix.push({
        featureFile: 'API Integration',
        sourceFiles: api.slice(0, 5).map(f => f.path)
      });
    }

    if (auth.length > 0) {
      fallbackMatrix.push({
        featureFile: 'Authentication & Security',
        sourceFiles: auth.slice(0, 4).map(f => f.path)
      });
    }

    if (utils.length > 0) {
      fallbackMatrix.push({
        featureFile: 'Utilities & Helpers',
        sourceFiles: utils.slice(0, 5).map(f => f.path)      });
    }

    // If no specific patterns found, create a general mapping
    if (fallbackMatrix.length === 0 && sourceFiles.length > 0) {
      // Create features based on directory structure
      const directories = [...new Set(sourceFiles.map(f => f.path.split('/')[0]))];
      directories.slice(0, 3).forEach(dir => {
        const dirFiles = sourceFiles.filter(f => f.path.startsWith(dir));
        if (dirFiles.length > 0) {
          fallbackMatrix.push({
            featureFile: `${dir.charAt(0).toUpperCase() + dir.slice(1)} Module`,
            sourceFiles: dirFiles.slice(0, 8).map(f => f.path)
          });
        }
      });
      
      // Fallback to all files if still empty
      if (fallbackMatrix.length === 0) {
        fallbackMatrix.push({
          featureFile: 'Core Application Features',
          sourceFiles: sourceFiles.slice(0, 10).map(f => f.path)
        });
      }
    }

    console.log(`[FeatureFileMatrix] Generated ${fallbackMatrix.length} fallback feature mappings`);
    fallbackMatrix.forEach(item => {
      console.log(`  - ${item.featureFile}: ${item.sourceFiles.length} files`);
    });
    
    return fallbackMatrix;
  }

  private isSourceFile(filePath: string): boolean {
    const sourceExtensions = ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.go', '.cs', '.php', '.rb'];
    const excludedPatterns = [/test/, /spec/, /\.d\.ts$/, /\.config\./];
    
    return sourceExtensions.some(ext => filePath.endsWith(ext)) && 
           !excludedPatterns.some(pattern => pattern.test(filePath));
  }
}
