import OpenAI from 'openai';
import { GoogleGenAI, GenerateContentResponse } from '@google/genai'; // Added GenerateContentResponse
import Anthropic from '@anthropic-ai/sdk';
import { LLMConfig, Contributor, Commit, FileInfo, TechnicalDebt, FunctionInfo } from '../types';

export class LLMError extends Error {
  constructor(message: string, public readonly details?: unknown) {
    super(message);
    this.name = 'LLMError';
  }
}

export class LLMProcessingError extends LLMError {
  constructor(message: string, public readonly details?: unknown) {
    super(message, details);
    this.name = 'LLMProcessingError';
  }
}

export class LLMService {
  private openai?: OpenAI;
  private googleAI?: GoogleGenAI;
  private claude?: Anthropic;
  private config: LLMConfig;

  constructor(config: LLMConfig) {
    this.config = {
      ...config,
      model: config.model || this.getDefaultModel(config.provider)
    };
    this.initializeProvider();
  }

  private initializeProvider() {
    if (!this.config.apiKey) {
      return;
    }
    try {
      switch (this.config.provider) {
        case 'openai':
          this.openai = new OpenAI({
            apiKey: this.config.apiKey,
            dangerouslyAllowBrowser: true
          });
          break;
        case 'gemini':
          this.googleAI = new GoogleGenAI(this.config.apiKey); // Ensure this is the correct constructor usage
          break;
        case 'claude':
          this.claude = new Anthropic({
            apiKey: this.config.apiKey,
          });
          break;
        default:
          console.warn(`LLMService: Unsupported provider: ${this.config.provider}`);
      }
    } catch (error) {
       console.error(`LLMService: Failed to initialize provider ${this.config.provider}:`, error);
       if (this.config.provider === 'openai') this.openai = undefined;
       if (this.config.provider === 'gemini') this.googleAI = undefined;
       if (this.config.provider === 'claude') this.claude = undefined;
     }
   }

   async checkAvailability(): Promise<boolean> {
    if (!this.isConfigured()) {
      return false;
    }
    try {
      // A simple test prompt
      await this.generateText("hello", 5);
      return true;
    } catch (error) {
      console.error("LLM availability check failed:", error);
      return false;
    }
  }

  async enhanceMermaidDiagram(diagramCode: string, fileInfo: FileInfo): Promise<{ enhancedCode: string }> {
    // Placeholder implementation
    return { enhancedCode: diagramCode };
  }

   public isConfigured(): boolean {
     return !!this.config.apiKey && (!!this.openai || !!this.googleAI || !!this.claude);
   }

  private getDefaultModel(provider: LLMConfig['provider']): string {
    if (provider === 'openai') return 'gpt-4o';
    if (provider === 'gemini') return 'gemini-1.5-flash-latest';
    if (provider === 'claude') return 'claude-3-5-sonnet-20240620';
    return '';
  }

  private cleanJsonResponse(response: string): string | null {
    if (typeof response !== 'string' || !response.trim()) {
      console.warn('[LLMService cleanJsonResponse] Input is not a valid string or is empty.');
      return null;
    }
    let cleaned = response.trim();
    const markdownMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (markdownMatch && markdownMatch[1]) {
      cleaned = markdownMatch[1].trim();
    }
    if (!((cleaned.startsWith('{') && cleaned.endsWith('}')) || (cleaned.startsWith('[') && cleaned.endsWith(']')))) {
        console.warn('[LLMService cleanJsonResponse] Cleaned string does not start/end with JSON delimiters:', cleaned.substring(0, 50) + "...");
    }
    try {
      JSON.parse(cleaned);
      return cleaned;
    } catch (initialError) {
      const fixedJson = cleaned.replace(/,\s*([}\]])/g, '$1'); // Use const
      try {
        JSON.parse(fixedJson);
        return fixedJson;
      } catch (fixError) {
        console.warn("[LLMService cleanJsonResponse] Failed to parse JSON even after attempting fixes.", {
          original: response.substring(0, 200) + "...",
          cleaned: cleaned.substring(0,200) + "...",
          attemptedFix: fixedJson.substring(0,200) + "...",
          initialError: initialError instanceof Error ? initialError.message : String(initialError),
          fixError: fixError instanceof Error ? fixError.message : String(fixError)
        });
        return null;
      }
    }
  }

  async generateText(prompt: string, maxTokens: number = 1000): Promise<string> {
    const modelName = this.config.model;
    if (!modelName) {
        throw new LLMError(`No model specified for provider ${this.config.provider}`);
    }
    try {
      switch (this.config.provider) {
        case 'openai': {
          if (!this.openai) throw new LLMError('OpenAI client not initialized.');
          const openaiResponse = await this.openai.chat.completions.create({
            model: modelName,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: maxTokens,
            temperature: 0.5,
          });
          return openaiResponse.choices[0]?.message?.content || '';
        }
        case 'gemini': {
          if (!this.googleAI) throw new LLMError('Google AI (Gemini) not initialized.');
          const geminiModel = this.googleAI.getGenerativeModel({ model: modelName });
          let retryCount = 0;
          const maxRetries = 4;
          const initialDelay = 2000;
          while (retryCount < maxRetries) {
            try {
              const result = await geminiModel.generateContent(prompt);
              // The 'result' object is GenerateContentResult, which has a 'response' property of type GenerateContentResponse.
              const genResponse: GenerateContentResponse = result.response;
              // Access text property, or fallback to candidates
              if (typeof genResponse.text === 'string') {
                return genResponse.text;
              } else {
                const candidateText = genResponse.candidates?.[0]?.content?.parts?.[0]?.text;
                if (typeof candidateText === 'string') return candidateText;
                // If genResponse.text is not a string and candidateText is not found, log and throw
                console.error("LLMService Gemini: genResponse.text is not a string and candidate text not found. Response:", genResponse);
                throw new LLMError("Unexpected Gemini response structure: text content not found.");
              }
            } catch (error) {
              retryCount++;
              if (retryCount >= maxRetries) {
                throw new LLMError(`Max retries exceeded for Gemini model ${modelName}. Last error: ${error instanceof Error ? error.message : String(error)}`, error);
              }
              if (error instanceof Error && (
                  error.message.includes('404') || 
                  error.message.toLowerCase().includes('model not found') || 
                  error.message.toLowerCase().includes('could not find model') || 
                  error.message.toLowerCase().includes("api key not valid") ||
                  error.message.toLowerCase().includes("permission denied") ||
                  error.message.toLowerCase().includes("invalid argument")
                 )) {
                throw new LLMError(`Non-retryable Gemini error: "${error.message}". Model: ${modelName}.`, error);
              }
              const delay = initialDelay * Math.pow(2, retryCount - 1);
              await new Promise(resolve => setTimeout(resolve, delay));
            }
          }
          throw new LLMError(`Max retries exceeded for Gemini model ${modelName}. This indicates a flaw in retry logic if reached.`);
        }
        case 'claude': {
          if (!this.claude) throw new LLMError('Anthropic Claude not initialized');
          const claudeResponse = await this.claude.messages.create({
            model: modelName,
            max_tokens: maxTokens,
            temperature: 0.5,
            messages: [{ role: 'user', content: prompt }],
          });
          return claudeResponse.content[0]?.type === 'text' 
              ? claudeResponse.content[0].text 
              : '';
        }
        default:
          throw new LLMError('Unsupported LLM provider configured.');
      }
    } catch (error) {
      console.error('LLM generation error:', error);
      if (error instanceof LLMError) throw error;
      if (error instanceof Error ) {
        if (error.message.includes('context') || 
            error.message.includes('token limit') || 
            error.message.includes('exceeds maximum') ||
            error.message.includes('maximum context length')) {
          throw new Error('The input is too long for the model\'s context window. Please try with a shorter input or use a model with a larger context window.');
        } else if (error.message.toLowerCase().includes('api key')) {
          throw new LLMError(`Invalid or missing API key for ${this.config.provider}. Please check Settings.`, error);
        } else if (error.message.toLowerCase().includes('quota')) {
          throw new LLMError(`API quota exceeded for ${this.config.provider}. Please check your billing or wait for reset.`, error);
        }
        throw new LLMError(`LLM request failed for ${this.config.provider}: ${error.message}`, error);
      }
      throw new LLMError(`LLM request failed for ${this.config.provider}: Unknown error`, error);
    }
  }

  // --- Enhanced Summary Generation ---
  async generateSummary(codebaseContext: string): Promise<{ summary: string; keyPoints: string[]; recommendations: string[] }> {
    try {
      const prompt = this.createSummaryPrompt(codebaseContext);
      const responseString = await this.generateText(prompt, 800);
      
      let parsedResponse;
      try {
        const cleanedJsonString = this.cleanJsonResponse(responseString);
        if (!cleanedJsonString) {
            console.warn("LLMService.generateSummary: Cleaned response was null.");
            if(responseString && responseString.length > 20) { // Arbitrary length
                 return this.fallbackResponse(responseString);
            }
            throw new Error("Cleaned LLM response for summary was null.");
        }
        parsedResponse = JSON.parse(cleanedJsonString);
      } catch (parseError) { // Use the error variable
        console.warn("LLMService.generateSummary: Response from generateText was not valid JSON. Raw response:", responseString, "Parse error:", parseError);
        return this.fallbackResponse(responseString);
      }
      return this.validateResponse(parsedResponse);
    } catch (error) {
      console.error('LLM Service Error (generateSummary):', error);
      const summaryText = error instanceof Error && error.message.startsWith("Analysis unavailable") ? error.message : undefined;
      return this.fallbackResponse(summaryText);
    }
  }

  private createSummaryPrompt(codebaseContext: string): string {
    return `
Analyze the following codebase context and provide a structured summary.
Context (e.g., key file contents, structure overview):
${codebaseContext.substring(0, 3500)} 
Respond with a JSON object with three keys:
1.  "summary": A concise overall summary of the codebase (2-3 sentences).
2.  "keyPoints": An array of 3-5 bullet points highlighting key aspects (e.g., main functionality, technologies used, architectural style).
3.  "recommendations": An array of 2-3 actionable recommendations for improvement or further investigation.
Example JSON format:
{
  "summary": "This is a web application backend built with Node.js and Express, providing RESTful APIs for user management.",
  "keyPoints": [
    "Uses TypeScript for type safety.",
    "Implements JWT for authentication.",
    "Connects to a PostgreSQL database."
  ],
  "recommendations": [
    "Add more comprehensive unit tests.",
    "Consider implementing rate limiting for public APIs."
  ]
}
Return ONLY the JSON object.`;
  }

  private validateResponse(response: Record<string, unknown>): { summary: string; keyPoints: string[]; recommendations: string[] } { // Typed response
    if (typeof response !== 'object' || response === null) {
        throw new Error('Invalid LLM response type, expected object.');
    }
    const { summary, keyPoints, recommendations } = response;
    if (typeof summary !== 'string' || 
        !Array.isArray(keyPoints) || !keyPoints.every(item => typeof item === 'string') ||
        !Array.isArray(recommendations) || !recommendations.every(item => typeof item === 'string')) {
      throw new Error('Invalid LLM response structure. "summary" must be a string, "keyPoints" and "recommendations" must be arrays of strings.');
    }
    return { 
        summary: summary as string, 
        keyPoints: keyPoints as string[], 
        recommendations: recommendations as string[] 
    };
  }

  private fallbackResponse(summaryText?: string): { summary: string; keyPoints: string[]; recommendations: string[] } {
    return {
      summary: summaryText || "Analysis unavailable - AI service error",
      keyPoints: [],
      recommendations: []
    };
  }

  // --- Other existing specific analysis methods ---
  async generateExecutiveSummary(repoData: {
    name: string;
    description: string;
    language: string;
    stars: number;
    contributors?: Contributor[];
    commits?: Commit[];
  }): Promise<string> {
    if (!this.isConfigured()) return "LLM not configured. Summary unavailable.";
    const structuredSummary = await this.generateSummary(
        `Repository: ${repoData.name}, Description: ${repoData.description}, Language: ${repoData.language}, Stars: ${repoData.stars}`
    );
    return structuredSummary.summary; 
  }

  async explainFunction(functionCode: string, fileName: string, language?: string, context?: string): Promise<string> {
    if (!this.isConfigured()) return "LLM not configured. Function explanation unavailable.";
    const prompt = `
Analyze the following ${language || 'code'} function from the file "${fileName}":
${context ? `Context from the file:\n\`\`\`\n${context.substring(0, 1000)}\n\`\`\`\n` : ''}
Function code:
\`\`\`${language || ''}
${functionCode}
\`\`\`
Please provide a technical explanation covering:
1.  The function's primary purpose and what it achieves.
2.  Explanation of its parameters (if any) and their expected types/roles.
3.  Description of the return value (if any) and its meaning.
4.  A brief overview of its core logic or algorithm.
5.  Its role and importance in the larger codebase
6.  Any potential issues, edge cases, or improvement opportunities
Keep it technical but accessible to developers. Aim for 200-250 words. Return only the explanation text.`;
    return this.generateText(prompt, 500);
  }

  async analyzeCodeComplexity(fileInfo: FileInfo): Promise<string> {
    if (!this.isConfigured() || !fileInfo.content) return "LLM not configured or file content missing. Complexity analysis unavailable.";
    const prompt = `
Analyze the complexity and code quality of the file "${fileInfo.path}".
Language: ${fileInfo.language || 'Unknown'}
File content (first 2000 characters):
\`\`\`${fileInfo.language || ''}
${fileInfo.content.substring(0, 2000)}
\`\`\`
Provide a brief analysis (100-150 words) covering:
1.  Overall perceived complexity (e.g., low, moderate, high).
2.  Key factors contributing to complexity (e.g., nesting, function length, unclear logic).
3.  General code quality observations (e.g., readability, style).
4.  One or two high-level suggestions for improvement, if applicable.
Be specific and actionable. Aim for 150-200 words. Return only the analysis text.`;
    return this.generateText(prompt, 400);
  }

  async analyzeArchitecture(files: FileInfo[], languages: Record<string, number>): Promise<string> {
    if (!this.isConfigured()) return "LLM not configured. Architecture analysis unavailable.";
    const filePaths = files.slice(0, 20).map(f => `- ${f.path} (${f.size} bytes)`).join('\n');
    const languageSummary = Object.entries(languages || {}).map(([lang, bytes]) => `${lang}: ${bytes} bytes`).join(', ');
    const prompt = `
Analyze the architecture of this codebase:
Languages used: ${languageSummary}
Key files and directories:
${filePaths}
Provide a technical but concise analysis (200-250 words) covering:
1.  Probable architectural pattern(s) (e.g., Monolith, Microservices, MVC, Layered).
2.  Key modules/components and their apparent responsibilities.
3.  Data flow patterns if discernible.
4.  Observations on code organization, modularity, and separation of concerns.
5.  Scalability and maintainability considerations.
6.  Potential architectural improvements.
Provide a technical but concise analysis. Aim for 200-250 words. Return only the analysis text.`;
    return this.generateText(prompt, 500);
  }
  
  async generateSecurityAnalysis(files: FileInfo[], repoName: string): Promise<string> {
    if (!this.isConfigured()) return "LLM not configured. Security analysis unavailable.";
    const relevantFiles = files.filter(f => 
        f.path.includes('config') || 
        f.path.includes('util') ||
        f.path.includes('service') ||
        f.path.includes('auth') ||
        f.name.match(/\.(?:env|pem|key|secret|token|conf|cfg|xml|json|yaml|yml)/i) ||
        f.name.match(/^(?:config|settings|secret|credential|auth|token)/i)
    ).slice(0, 15).map(f => f.path);
    const prompt = `
Conduct a high-level security review of the repository "${repoName}" based on its file structure.
Potentially security-relevant files:
${relevantFiles.join('\n') || "No specific security-relevant files identified in the top sample."}
Consider common web application vulnerabilities and best practices. Provide a brief security analysis (150-200 words) highlighting:
1.  Potential areas of concern based on file names/paths (e.g., handling of secrets, authentication, input validation).
2.  General security posture observations.
3.  Configuration and secrets management.
4.  Recommended security improvements.
Focus on actionable insights. Return only the analysis text.`;
    return this.generateText(prompt, 400);
  }

   async analyzeAlgorithmicComplexity(content: string, fileName: string): Promise<{
    complexity: string; 
    runtime: string;    
    recommendation?: string;
  } | null> {
    if (!this.isConfigured()) return null;
    const prompt = `
Analyze the algorithmic complexity of the core logic in the following code snippet from "${fileName}".
Respond with a JSON object containing: "complexity" (Big O notation, e.g., "O(n)", "O(n log n)"), "runtime" (e.g., "Likely fast", "May be slow for large inputs"), and an optional "recommendation".
Code:
\`\`\`
${content.substring(0, 2000)} 
\`\`\`
Return ONLY the JSON object. Focus on the most significant complexity.`;
    try {
      const response = await this.generateText(prompt, 300);
      const cleanedResponse = this.cleanJsonResponse(response);
      if (!cleanedResponse) {
        console.warn(`[LLMService] Cleaned response for complexity was null or empty. Original: ${response}`);
        try {
            const rawParsed = JSON.parse(response);
            if (rawParsed && typeof rawParsed === 'object' && rawParsed.complexity && rawParsed.runtime) {
                return rawParsed as { complexity: string; runtime: string; recommendation?: string; };
            }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (e) { /* ignore, e is unused but catch requires a var */ }
        throw new LLMProcessingError('LLM response did not contain valid JSON for algorithmic complexity analysis after cleaning.', {rawResponse: response});
      }
      return JSON.parse(cleanedResponse);
    } catch (error) {
      console.error('Failed to parse complexity analysis:', error);
      throw new LLMProcessingError(`Failed to analyze algorithmic complexity: ${error instanceof Error ? error.message : 'Invalid response format or processing error'}`, {originalError: error, fileName});
    }
  }

  async generateRefactoringRoadmap(
    technicalDebt: TechnicalDebt[],
    hotspots: Array<{ file: string; path: string; complexity: number; changes: number; explanation?: string; size?: number; riskLevel: 'low' | 'medium' | 'high' | 'critical'; primaryContributors?: string[]; }> | undefined,
    fileCount: number
  ): Promise<Array<{
    priority: number;
    title: string;
    description: string;
    effort: string;
    impact: string;
    files: string[];
  }>> {
    if (!this.isConfigured()) return [];
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
Return ONLY a JSON array of roadmap items.`;
    try {
      const response = await this.generateText(prompt, 800);
      const parsedRoadmap = this.cleanJsonResponse(response);
      if (!parsedRoadmap) {
        throw new LLMError('LLM response did not contain valid JSON for refactoring roadmap');
      }
      return JSON.parse(parsedRoadmap);
    } catch (error) {
      console.error('Failed to parse refactoring roadmap:', error);
      throw new LLMError(`Failed to generate refactoring roadmap: ${error instanceof Error ? error.message : 'Invalid response format'}`, error);
    }
  }

  async parseFunctions(fileContent: string, language?: string): Promise<FunctionInfo[]> {
    const functions: FunctionInfo[] = [];
    if (!fileContent) return functions;
    let regex;
    switch (language?.toLowerCase()) {
        case 'javascript':
        case 'typescript':
            regex = /(?:async\s+)?function\s*([a-zA-Z0-9_]+)\s*\(([^)]*)\)\s*{|const\s+([a-zA-Z0-9_]+)\s*=\s*(?:async\s*)?\(([^)]*)\)\s*=>\s*{|(?:class\s+\w+\s*{(?:[\s\S]*?)(?:constructor\s*\(([^)]*)\)\s*{|([a-zA-Z0-9_]+)\s*\(([^)]*)\)\s*{))}/g;
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
        const functionName = match[1] || match[3] || match[6] || 'anonymous';
        const matchIndex = match.index;
        let currentChars = 0;
        let startLine = 0;
        for(let i=0; i<lines.length; i++) {
            currentChars += lines[i].length + 1;
            if(currentChars >= matchIndex) {
                startLine = i + 1;
                break;
            }
        }
            functions.push({
                name: functionName,
                complexity: 0, // Placeholder value
                dependencies: [],
                calls: [],
                description: `Function ${functionName}`,
                startLine: startLine,
                endLine: startLine + (match[0].split('\n').length -1)
            });
    }
    return functions;
  }
}
