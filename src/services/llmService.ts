import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Anthropic from '@anthropic-ai/sdk';
import { LLMConfig } from '../types';

export class LLMService {
  private openai?: OpenAI;
  private google?: GoogleGenerativeAI;
  private claude?: Anthropic;
  private config: LLMConfig;

  constructor(config: LLMConfig) {
    this.config = config;
    this.initializeProvider();
  }

  private initializeProvider() {
    switch (this.config.provider) {
      case 'openai':
        this.openai = new OpenAI({
          apiKey: this.config.apiKey
        });
        break;
      case 'google':
        this.google = new GoogleGenerativeAI(this.config.apiKey);
        break;
      case 'claude':
        this.claude = new Anthropic({
          apiKey: this.config.apiKey
        });
        break;
    }
  }

  private getValidModel(provider: string, configuredModel?: string): string {
    switch (provider) {
      case 'openai': {
        const valid = ['gpt-4.5', 'gpt-4.1', 'gpt-4.1-mini', 'gpt-4.1-nano'];
        const model = valid.includes(configuredModel || '') ? configuredModel! : 'gpt-4.5';
        if (configuredModel !== model) console.warn(`Invalid OpenAI model: ${configuredModel}. Using ${model}`);
        return model;
      }
      case 'google': {
        const valid = [
          'gemini-2.0-pro',
          'gemini-2.0-flash'
        ];
        const model = valid.includes(configuredModel || '') ? configuredModel! : 'gemini-2.0-flash';
        if (configuredModel !== model) console.warn(`Invalid Gemini model: ${configuredModel}. Using ${model}`);
        return model;
      }
      case 'claude': {
        const valid = ['claude-opus-4', 'claude-sonnet-4'];
        const model = valid.includes(configuredModel || '') ? configuredModel! : 'claude-opus-4';
        if (configuredModel !== model) console.warn(`Invalid Claude model: ${configuredModel}. Using ${model}`);
        return model;
      }
      default:
        throw new Error('Unsupported LLM provider');
    }
  }

  private cleanJsonResponse(response: string): string | null {
    // Remove markdown code block delimiters
    let cleaned = response
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    // Try to find and extract JSON structure
    let extractedJson = '';

    // Look for JSON array first
    const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      extractedJson = arrayMatch[0];
    } else {
      // Look for JSON object
      const objectMatch = cleaned.match(/\{[\s\S]*\}/);
      if (objectMatch) {
        extractedJson = objectMatch[0];
      }
    }

    // If no match found, try manual extraction
    if (!extractedJson) {
      const firstBrace = cleaned.indexOf('{');
      const lastBrace = cleaned.lastIndexOf('}');
      const firstBracket = cleaned.indexOf('[');
      const lastBracket = cleaned.lastIndexOf(']');
      
      // Determine if we should extract an object or array
      if (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) {
        // Extract array
        if (lastBracket !== -1 && lastBracket > firstBracket) {
          extractedJson = cleaned.substring(firstBracket, lastBracket + 1);
        }
      } else if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        // Extract object
        extractedJson = cleaned.substring(firstBrace, lastBrace + 1);
      }
    }

    // Validate that we have something that looks like JSON
    if (!extractedJson || (!extractedJson.startsWith('{') && !extractedJson.startsWith('['))) {
      return null;
    }

    // Try to parse to validate it's actually valid JSON
    try {
      JSON.parse(extractedJson);
      return extractedJson;
    } catch (error) {
      console.warn('Extracted JSON is invalid:', extractedJson);
      return null;
    }
  }

  async generateText(prompt: string, maxTokens: number = 1000): Promise<string> {
    try {
      switch (this.config.provider) {
        case 'openai':
          if (!this.openai) throw new Error('OpenAI not initialized');
          const openaiResponse = await this.openai.chat.completions.create({
            model: this.getValidModel('openai', this.config.model),
            messages: [{ role: 'user', content: prompt }],
            max_tokens: maxTokens,
            temperature: 0.7,
          });
          return openaiResponse.choices[0]?.message?.content || '';

        case 'google':
          if (!this.google) throw new Error('Google AI not initialized');
          const modelName = this.getValidModel('google', this.config.model);
          try {
            const model = this.google.getGenerativeModel({ 
              model: modelName,
              generationConfig: {
                maxOutputTokens: maxTokens,
                temperature: 0.7,
              }
            });
            const googleResponse = await model.generateContent(prompt);
            return googleResponse.response.text();
          } catch (error) {
            if (error instanceof Error) {
              if (error.message.includes('404')) {
                throw new Error(`Invalid Gemini model: ${modelName}. Please check your model configuration.`);
              } else if (error.message.includes('quota')) {
                throw new Error('Google AI quota exceeded. Please check your billing details or try again later.');
              } else if (error.message.includes('API key')) {
                throw new Error('Invalid Google AI API key. Please check your API key configuration.');
              } else if (error.message.includes('context') || error.message.includes('token limit') || error.message.includes('too long')) {
                throw new Error('The input is too long for the model\'s context window. Please try with a shorter input or use a model with a larger context window.');
              }
            }
            throw error;
          }

        case 'claude':
          if (!this.claude) throw new Error('Claude not initialized');
          try {
            const claudeResponse = await this.claude.messages.create({
              model: this.getValidModel('claude', this.config.model),
              max_tokens: maxTokens,
              temperature: 0.7,
              messages: [{ role: 'user', content: prompt }],
            });
            return claudeResponse.content[0]?.type === 'text' 
              ? claudeResponse.content[0].text 
              : '';
          } catch (error) {
            if (error instanceof Error) {
              if (error.message.includes('context') || error.message.includes('token limit') || error.message.includes('too long')) {
                throw new Error('The input is too long for the model\'s context window. Please try with a shorter input or use a model with a larger context window.');
              }
            }
            throw error;
          }

        default:
          throw new Error('Unsupported LLM provider');
      }
    } catch (error) {
      console.error('LLM generation error:', error);
      if (error instanceof Error) {
        // Check for context size errors in the error message
        if (error.message.includes('context') || 
            error.message.includes('token limit') || 
            error.message.includes('too long') ||
            error.message.includes('exceeds maximum') ||
            error.message.includes('maximum context length')) {
          throw new Error('The input is too long for the model\'s context window. Please try with a shorter input or use a model with a larger context window.');
        }
        throw new Error(`Failed to generate text: ${error.message}`);
      }
      throw new Error(`Failed to generate text: Unknown error`);
    }
  }

  async generateExecutiveSummary(repoData: any): Promise<string> {
    const prompt = `
Analyze this GitHub repository and provide a comprehensive executive summary in plain text (no markdown formatting):

Repository: ${repoData.name}
Description: ${repoData.description}
Language: ${repoData.language}
Stars: ${repoData.stars}
Contributors: ${repoData.contributors?.length || 0}
Recent commits: ${repoData.commits?.length || 0}

Recent commit messages (last 10):
${repoData.commits?.slice(0, 10).map((c: any) => `- ${c.message}`).join('\n') || 'No recent commits available'}

Top contributors:
${repoData.contributors?.slice(0, 5).map((c: any) => `- ${c.login}: ${c.contributions} contributions`).join('\n') || 'No contributor data available'}

Please provide a clear, professional summary that includes:
1. A brief overview of what this project does and its purpose
2. Assessment of project health, activity level, and maintenance status
3. Key strengths (code quality, community, documentation, etc.)
4. Potential concerns or areas for improvement
5. Overall recommendation for users, contributors, or organizations considering adoption

Keep it professional, insightful, and actionable. Use plain text formatting only - no markdown, no headers, no bullet points. Aim for 250-350 words.
`;

    return this.generateText(prompt, 600);
  }

  async explainFunction(functionCode: string, fileName: string, context?: string): Promise<string> {
    const prompt = `
Analyze this function from ${fileName} and provide a clear, technical explanation:

${context ? `File context: ${context}` : ''}

Function code:
\`\`\`
${functionCode}
\`\`\`

Please explain:
1. What this function does and its primary purpose
2. Key parameters, their types, and expected values
3. Return value and its significance
4. Main logic flow and algorithm used
5. Complexity analysis and potential performance considerations
6. Its role and importance in the larger codebase
7. Any potential issues, edge cases, or improvement opportunities

Keep it technical but accessible to developers. Aim for 200-250 words.
`;

    return this.generateText(prompt, 500);
  }

  async analyzeCodeComplexity(fileContent: string, fileName: string): Promise<string> {
    const prompt = `
Analyze the complexity and quality of this code file (${fileName}):

\`\`\`
${fileContent.substring(0, 3000)}${fileContent.length > 3000 ? '\n... (truncated)' : ''}
\`\`\`

Provide insights on:
1. Overall complexity level and maintainability score
2. Main complexity drivers (nested loops, conditionals, function length, etc.)
3. Code quality indicators (naming, structure, patterns used)
4. Potential refactoring opportunities and specific suggestions
5. Security or performance concerns if any
6. Adherence to best practices for the language/framework

Be specific and actionable. Aim for 150-200 words.
`;

    return this.generateText(prompt, 400);
  }

  async analyzeArchitecture(files: any[], languages: Record<string, number>): Promise<string> {
    const prompt = `
Analyze the architecture of this codebase:

Languages used: ${Object.entries(languages).map(([lang, bytes]) => `${lang}: ${bytes} bytes`).join(', ')}

Key files and directories:
${files.slice(0, 20).map(f => `- ${f.path} (${f.size} bytes)`).join('\n')}

Please analyze:
1. Overall architecture pattern (MVC, microservices, monolith, etc.)
2. Code organization and structure quality
3. Separation of concerns and modularity
4. Technology stack assessment
5. Scalability and maintainability considerations
6. Potential architectural improvements

Provide a technical but concise analysis. Aim for 200-250 words.
`;

    return this.generateText(prompt, 500);
  }

  async generateSecurityAnalysis(files: any[]): Promise<string> {
    const securityFiles = files.filter(f => 
      f.path.includes('auth') || 
      f.path.includes('security') || 
      f.path.includes('config') ||
      f.name.includes('.env') ||
      f.name.includes('package.json') ||
      f.name.includes('requirements.txt')
    );

    const prompt = `
Analyze potential security considerations for this codebase:

Security-relevant files found:
${securityFiles.map(f => `- ${f.path}`).join('\n')}

All files overview:
${files.slice(0, 15).map(f => `- ${f.path}`).join('\n')}

Please assess:
1. Potential security vulnerabilities or concerns
2. Authentication and authorization patterns
3. Data handling and privacy considerations
4. Dependency security (if package files are present)
5. Configuration and secrets management
6. Recommended security improvements

Focus on actionable insights. Aim for 150-200 words.
`;

    return this.generateText(prompt, 400);
  }

  async analyzeAlgorithmicComplexity(content: string, fileName: string): Promise<{
    complexity: string;
    runtime: string;
    recommendation?: string;
  } | null> {
    const prompt = `
Analyze the algorithmic complexity of this code from ${fileName}:

\`\`\`
${content.substring(0, 2000)}
\`\`\`

Provide a JSON response with:
{
  "complexity": "Big O notation (e.g., O(n), O(n²), O(log n))",
  "runtime": "Estimated runtime description",
  "recommendation": "Performance optimization suggestion if needed"
}

Focus on loops, recursive calls, and data structure operations.
`;

    try {
      const response = await this.generateText(prompt, 300);
      const cleanedResponse = this.cleanJsonResponse(response);
      
      if (!cleanedResponse) {
        throw new Error('LLM response did not contain valid JSON for algorithmic complexity analysis');
      }
      
      return JSON.parse(cleanedResponse);
    } catch (error) {
      console.error('Failed to parse complexity analysis:', error);
      throw new Error(`Failed to analyze algorithmic complexity: ${error instanceof Error ? error.message : 'Invalid response format'}`);
    }
  }

  async generateRefactoringRoadmap(data: {
    technicalDebt: any[];
    hotspots: any[];
    fileCount: number;
  }): Promise<Array<{
    priority: number;
    title: string;
    description: string;
    effort: string;
    impact: string;
    files: string[];
  }>> {
    const prompt = `
Based on this codebase analysis, generate a strategic refactoring roadmap:

Technical Debt Issues: ${data.technicalDebt.length}
Code Hotspots: ${data.hotspots.length}
Total Files: ${data.fileCount}

Technical Debt Summary:
${data.technicalDebt.slice(0, 5).map(debt => `- ${debt.type}: ${debt.description}`).join('\n')}

Code Hotspots:
${data.hotspots.slice(0, 5).map(hotspot => `- ${hotspot.file}: ${hotspot.complexity}% complexity`).join('\n')}

Generate a JSON array of 3-5 refactoring steps, ordered by priority:
[
  {
    "priority": 1,
    "title": "Step title",
    "description": "What to do and why",
    "effort": "Time estimate",
    "impact": "Expected benefits",
    "files": ["affected", "files"]
  }
]

Focus on high-impact, strategic improvements.
`;

    try {
      const response = await this.generateText(prompt, 800);
      const cleanedResponse = this.cleanJsonResponse(response);
      
      if (!cleanedResponse) {
        throw new Error('LLM response did not contain valid JSON for refactoring roadmap');
      }
      
      return JSON.parse(cleanedResponse);
    } catch (error) {
      console.error('Failed to parse refactoring roadmap:', error);
      throw new Error(`Failed to generate refactoring roadmap: ${error instanceof Error ? error.message : 'Invalid response format'}`);
    }
  }
}