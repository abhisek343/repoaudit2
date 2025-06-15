"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdvancedAnalysisService = exports.AnalysisError = void 0;
const llmService_1 = require("./llmService");
// Custom error types for better error handling
class AnalysisError extends Error {
    code;
    constructor(message, code) {
        super(message);
        this.code = code;
        this.name = 'AnalysisError';
    }
}
exports.AnalysisError = AnalysisError;
class AdvancedAnalysisService {
    llmService;
    secretPatterns = [
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
    constructor(llmService) {
        this.llmService = llmService;
    }
    _cleanAndParseJson(jsonString) {
        if (!jsonString || typeof jsonString !== 'string') {
            throw new llmService_1.LLMError('Invalid JSON string input for parsing.');
        }
        const cleanedStringInitial = jsonString.trim();
        let finalJsonString = cleanedStringInitial;
        // Handle markdown code blocks
        if (finalJsonString.startsWith('```') && finalJsonString.endsWith('```')) {
            const endIndex = finalJsonString.lastIndexOf('```');
            if (endIndex === -1) {
                throw new llmService_1.LLMError('Malformed markdown code block (end marker not found where expected)');
            }
            const firstNewlineIndex = finalJsonString.indexOf('\n');
            if (firstNewlineIndex === -1 && endIndex > 3) {
                finalJsonString = finalJsonString.substring(finalJsonString.indexOf('```') + 3, endIndex).trim();
            }
            else if (firstNewlineIndex !== -1) {
                finalJsonString = finalJsonString.substring(firstNewlineIndex + 1, endIndex).trim();
            }
            else {
                finalJsonString = finalJsonString.substring(3, endIndex).trim();
            }
        }
        try {
            return JSON.parse(finalJsonString);
        }
        catch (e) {
            const fixedJsonAttempt = finalJsonString
                .replace(/,\s*([}\]])/g, '$1')
                .replace(/([{[,:])\s*([a-zA-Z0-9_]+)\s*:/g, '$1"$2":');
            try {
                return JSON.parse(fixedJsonAttempt);
            }
            catch (parseError) {
                throw new llmService_1.LLMError('Failed to parse JSON response, even after attempting fixes.', {
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
    matchPatternSafely(pattern, text, timeoutMs = 5000) {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error('Pattern matching timeout')), timeoutMs);
            const matches = [];
            let match;
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
            }
            catch (err) {
                clearTimeout(timer);
                reject(err);
            }
        });
    }
    async analyzeSecurityIssues(files) {
        const issues = [];
        const CODE_SNIPPET_CONTEXT_LINES = 2;
        let llmVulnCheckCounter = 0;
        const MAX_FILES_FOR_LLM_VULN_CHECK = 10;
        for (const file of files) {
            if (!file.content)
                continue;
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
                    }
                    catch (err) {
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
    async checkCodeVulnerabilitiesLLM(file, issues) {
        if (!this.llmService.isConfigured() || !file.content || file.content.length < 50)
            return;
        const analyzableExtensions = ['.js', '.ts', '.py', '.java', '.php', '.rb', '.go', '.cs', '.c', '.cpp', '.jsx', '.tsx', '.html', '.sql'];
        const fileExtension = `.${file.name.split('.').pop()?.toLowerCase()}`;
        if (!analyzableExtensions.includes(fileExtension))
            return;
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
            const parsedVulnerabilities = this._cleanAndParseJson(response);
            if (parsedVulnerabilities && Array.isArray(parsedVulnerabilities)) {
                parsedVulnerabilities.forEach(vuln => {
                    if (vuln.description && vuln.severity) {
                        issues.push({ ...vuln, file: file.path, type: 'vulnerability' });
                    }
                });
            }
        }
        catch (error) {
            if (error instanceof llmService_1.LLMError) {
                console.warn(`AdvancedAnalysisService: LLM error during vulnerability check for ${file.path}: ${error.message}`, error.details);
            }
            else {
                console.error(`AdvancedAnalysisService: Unexpected error during LLM vulnerability check for ${file.path}:`, error);
            }
        }
    }
    async analyzePerformanceMetrics(files) {
        const metrics = [];
        if (!this.llmService.isConfigured())
            return metrics;
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
                }
                catch (error) {
                    if (error instanceof llmService_1.LLMError) {
                        console.warn(`AdvancedAnalysisService: LLM error during performance analysis for ${file.path}: ${error.message}`, error.details);
                    }
                    else {
                        console.error(`AdvancedAnalysisService: Unexpected error during performance analysis for ${file.path}:`, error);
                    }
                }
            }
        }
        return metrics;
    }
    async analyzeTechnicalDebt(files) {
        const debt = [];
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
            const contentToAnalyze = file.content.substring(0, 4000);
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
                const parsedDebt = this._cleanAndParseJson(response);
                if (parsedDebt && Array.isArray(parsedDebt)) {
                    parsedDebt.forEach(item => {
                        if (item.description && item.severity) {
                            debt.push({ ...item, file: file.path });
                        }
                    });
                }
            }
            catch (error) {
                if (error instanceof llmService_1.LLMError) {
                    console.warn(`AdvancedAnalysisService: LLM error during tech debt analysis for ${file.path}: ${error.message}`, error.details);
                }
                else {
                    console.error(`AdvancedAnalysisService: Unexpected error during tech debt analysis for ${file.path}:`, error);
                }
            }
        }
        return debt;
    }
    async detectAPIEndpoints(files) {
        const endpoints = [];
        if (!this.llmService.isConfigured()) {
            files.forEach(file => {
                if (file.content) {
                    const expressRoutes = file.content.match(/(app|router)\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g) || [];
                    expressRoutes.forEach(route => {
                        const match = route.match(/(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/);
                        if (match && match[1] && match[2]) {
                            endpoints.push({
                                method: match[1].toUpperCase(),
                                path: match[2],
                                file: file.path,
                                handlerFunction: "Unknown (Regex detected)",
                            });
                        }
                    });
                }
            });
            return endpoints;
        }
        const apiEndpointFileLimit = Number(process.env.API_ENDPOINT_FILE_LIMIT) || 5;
        const eligibleFilesForApi = files.filter(f => (f.path.includes('route') || f.path.includes('controller') || f.path.includes('api') || f.name.match(/\.(?:js|ts|py|go|java|rb)$/i)) &&
            f.content && f.content.length > 100);
        const filesToProcessApi = eligibleFilesForApi.slice(0, apiEndpointFileLimit);
        if (eligibleFilesForApi.length > apiEndpointFileLimit) {
            console.warn(`AdvancedAnalysisService (detectAPIEndpoints): Processing limited to ${apiEndpointFileLimit} of ${eligibleFilesForApi.length} eligible files. Set API_ENDPOINT_FILE_LIMIT to adjust.`);
        }
        for (const file of filesToProcessApi) {
            const contentToAnalyze = file.content.substring(0, 4000);
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
                const parsedEndpoints = this._cleanAndParseJson(response);
                if (parsedEndpoints && Array.isArray(parsedEndpoints)) {
                    parsedEndpoints.forEach(ep => {
                        if (ep.method && ep.path) {
                            endpoints.push({ ...ep, file: file.path });
                        }
                    });
                }
            }
            catch (error) {
                if (error instanceof llmService_1.LLMError) {
                    console.warn(`AdvancedAnalysisService: LLM error during API endpoint detection for ${file.path}: ${error.message}`, error.details);
                }
                else {
                    console.error(`AdvancedAnalysisService: Unexpected error during API endpoint detection for ${file.path}:`, error);
                }
            }
        }
        return endpoints;
    }
    async generateRefactoringRoadmap(technicalDebt, hotspots, fileCount) {
        if (!this.llmService.isConfigured())
            return [];
        const debtText = technicalDebt.slice(0, 10).map(td => `- ${td.file}: ${td.description} (Severity: ${td.severity}, Effort: ${td.effort})`).join('\n') || 'N/A';
        const hotspotsText = (hotspots || []).slice(0, 5).map(h => `- ${h.path}: Risk ${h.riskLevel}, Complexity ${h.complexity}%, Changes ${h.changes}`).join('\n') || 'N/A';
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
            const parsedRoadmap = this._cleanAndParseJson(response);
            return parsedRoadmap || [];
        }
        catch (error) {
            if (error instanceof llmService_1.LLMError) {
                console.warn(`AdvancedAnalysisService: LLM error during refactoring roadmap generation: ${error.message}`, error.details);
            }
            else {
                console.error(`AdvancedAnalysisService: Unexpected error during refactoring roadmap generation:`, error);
            }
            return [];
        }
    }
    async parseFunctions(fileContent, language) {
        const functions = [];
        if (!fileContent)
            return functions;
        let regex;
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
        while ((match = regex.exec(fileContent)) !== null) {
            const functionName = match[1] || match[3] || match[5] || 'anonymous';
            const paramsString = match[2] || match[4] || match[6] || '';
            const parameters = paramsString
                .split(',')
                .map(param => param.trim())
                .filter(param => param.length > 0)
                .map(param => {
                const parts = param.split(/[:=?]/).map(p => p.trim());
                const name = parts[0];
                let type = undefined;
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
            const matchIndex = match.index;
            let currentChars = 0;
            let startLine = 0;
            for (let i = 0; i < lines.length; i++) {
                currentChars += lines[i].length + 1;
                if (currentChars >= matchIndex) {
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
}
exports.AdvancedAnalysisService = AdvancedAnalysisService;
