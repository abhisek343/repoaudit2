import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import { LLMService } from './src/services/llmService';
import { BackendAnalysisService } from './src/services/backendAnalysisService';
import type { LLMConfig } from './src/types';

const app: Express = express();
const port = process.env.PORT || 3001;

app.use(cors()); // Enable CORS for all routes
app.use(express.json({ limit: '50mb' }));

// Safe serialization preserving all data and handling circular references
function safeSerializeReport(report: any): string {
  const seen = new WeakSet();
  return JSON.stringify(report, (_key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) return '[Circular]';
      seen.add(value);
    }
    if (typeof value === 'function') {
      return `[Function: ${value.name || 'anonymous'}]`;
    }
    if (value instanceof Date) {
      return value.toISOString();
    }
    return value;
  });
}

// Robust error response
function handleAnalysisError(res: Response, error: unknown): void {
  const msg = error instanceof Error ? error.message : 'Unknown error';
  try {
    res.write(`event: error\ndata: ${JSON.stringify({ error: msg })}\n\n`);
    res.end();
  } catch (e) {
    console.error('Failed to send error to client:', e);
    try { res.destroy(); } catch {}
  }
}

// Endpoint to check LLM availability
app.post('/api/llm/check', (async (req: Request, res: Response) => {
  try {
    const { llmConfig } = req.body;
    if (!llmConfig || !llmConfig.provider || !llmConfig.apiKey) {
      return res.status(200).json({ success: false, message: 'LLM configuration missing.' });
    }
    const llmService = new LLMService(llmConfig);
    const isAvailable = await llmService.checkAvailability();
    res.status(200).json({ success: isAvailable });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ success: false, error: `Failed to check LLM availability: ${err.message}` });
  }
}) as express.RequestHandler);

// Endpoint to validate LLM API key (endpoint expected by frontend)
app.post('/api/validate-llm-key', (async (req: Request, res: Response) => {
  try {
    const { llmConfig } = req.body;
    if (!llmConfig || !llmConfig.provider || !llmConfig.apiKey) {
      return res.status(200).json({ isValid: false, error: 'LLM configuration missing.' });
    }
    const llmService = new LLMService(llmConfig);
    const isValid = await llmService.checkAvailability();
    res.status(200).json({ isValid });
  } catch (error) {
    const err = error as Error;
    res.status(200).json({ isValid: false, error: `Failed to validate LLM key: ${err.message}` });
  }
}) as express.RequestHandler);

// Endpoint to handle diagram enhancement
app.post('/api/llm/enhance-diagram', (async (req: Request, res: Response) => {
  try {
    const { llmConfig, diagramCode, fileInfo } = req.body;
    if (!llmConfig || !diagramCode) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    const llmService = new LLMService(llmConfig);
    const result = await llmService.enhanceMermaidDiagram(diagramCode, fileInfo);
    res.json({ enhancedDiagram: result.enhancedCode });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: `Error enhancing diagram: ${err.message}` });
  }
}) as express.RequestHandler);

// Endpoint to generate AI summary
app.post('/api/llm/generate-summary', (async (req: Request, res: Response) => {
  try {
    const { llmConfig, codebaseContext } = req.body;
    if (!llmConfig || !codebaseContext) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    const llmService = new LLMService(llmConfig);
    const result = await llmService.generateSummary(codebaseContext);
    res.json(result);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: `Error generating summary: ${err.message}` });
  }
}) as express.RequestHandler);

// Endpoint to analyze architecture
app.post('/api/llm/analyze-architecture', (async (req: Request, res: Response) => {
  try {
    const { llmConfig, codeStructure } = req.body;
    if (!llmConfig || !codeStructure) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    const llmService = new LLMService(llmConfig);
    const result = await llmService.generateText(
      `Analyze the architecture of this codebase:
      File Structure: ${JSON.stringify(codeStructure.files)}
      Dependencies: ${JSON.stringify(codeStructure.dependencies)}
      
      Provide:
      1. Architecture pattern identification
      2. Structural analysis
      3. Improvement recommendations
      4. Potential issues or anti-patterns`,
      1500
    );
    res.json({ analysis: result });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: `Error analyzing architecture: ${err.message}` });
  }
}) as express.RequestHandler);

// Endpoint to perform security analysis
app.post('/api/llm/security-analysis', (async (req: Request, res: Response) => {
  try {
    const { llmConfig, securityData } = req.body;
    if (!llmConfig || !securityData) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    const llmService = new LLMService(llmConfig);
    const result = await llmService.generateText(
      `Perform security analysis on this repository:
      Security Issues: ${JSON.stringify(securityData.issues)}
      Dependencies: ${JSON.stringify(securityData.dependencies)}
      
      Analyze:
      1. Vulnerability assessment
      2. Security best practices compliance
      3. Risk level evaluation
      4. Remediation recommendations`,
      1200
    );    res.json({ analysis: result });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: `Error performing security analysis: ${err.message}` });
  }
}) as express.RequestHandler);

// Endpoint to generate AI insights for overview page
app.post('/api/llm/generate-insights', (async (req: Request, res: Response) => {
  try {
    const { llmConfig, repoData } = req.body;
    if (!llmConfig || !repoData) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    const llmService = new LLMService(llmConfig);
    const result = await llmService.generateSummary(`
Repository Analysis Data:
Name: ${repoData.name}
Description: ${repoData.description}
Languages: ${JSON.stringify(repoData.languages)}
Metrics: ${JSON.stringify(repoData.metrics)}

Generate comprehensive insights about this repository including:
1. Technology stack assessment
2. Project health indicators  
3. Development patterns observed
4. Key strengths and areas for improvement
5. Recommendations for maintainers

Provide actionable insights in a clear, structured format.`);
    
    // Return the summary text from the response
    const insights = typeof result === 'object' && 'summary' in result ? result.summary : result;
    res.setHeader('Content-Type', 'text/plain');
    res.send(insights);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: `Error generating insights: ${err.message}` });
  }
}) as express.RequestHandler);

// Modified endpoint to support both GET and POST
const handleAnalysisRequest = async (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');
  res.flushHeaders();

  // Handle client disconnects gracefully
  req.on('close', () => {
    console.warn('Client disconnected before analysis complete, aborting response stream.');
    try { res.end(); } catch (e) {}
  });

  const sendProgress = (step: string, progress: number) => {
    console.log(`[${new Date().toISOString()}] Progress: ${progress}% - ${step}`);
    try {
      res.write(`data: ${JSON.stringify({ step, progress })}\n\n`);
    } catch (err) {
      console.warn('Progress write failed, aborting response:', err);
      handleAnalysisError(res, err);
    }
  };

  try {
    console.log('Received query:', req.query); // Add this line for debugging
    // Get parameters from query (GET) or body (POST)
    const { repoUrl, llmConfig: llmConfigString, githubToken: rawGithubToken } = req.method === 'POST' ? req.body : req.query;

    console.log('Received llmConfigString:', llmConfigString); // ADD THIS

    const githubToken = typeof rawGithubToken === 'string' && rawGithubToken.trim() !== '' ? rawGithubToken : undefined;
    
    if (!repoUrl) {
      const error = 'Repository URL is required';
      console.error(error);
      res.write(`event: error\ndata: ${JSON.stringify({ error })}\n\n`);
      res.end();
      return;
    }

    let llmConfig: LLMConfig | undefined;
    if (llmConfigString) {
      try {
        llmConfig = typeof llmConfigString === 'string' ? 
          JSON.parse(llmConfigString) : 
          llmConfigString;
        console.log('Parsed LLM config:', llmConfig); // ADD THIS
      } catch (err) {
        const errorMessage = `Invalid llmConfig parameter: ${err instanceof Error ? err.message : 'Invalid JSON format'}`;
        console.error(errorMessage);
        res.write(`event: error\ndata: ${JSON.stringify({ error: errorMessage })}\n\n`);
        res.end();
        return;
      }
    }    console.log(`[${new Date().toISOString()}] Starting analysis for: ${repoUrl}`);
    const analysisService = new BackendAnalysisService(githubToken, llmConfig);
    const report = await analysisService.analyze(repoUrl as string, sendProgress);
    
    console.log(`[${new Date().toISOString()}] Analysis completed successfully`);
    
    try {
      // Use safeSerializeReport for robust serialization
      const jsonString = safeSerializeReport(report);
      
      const payloadSizeKB = (jsonString.length / 1024).toFixed(2);
      console.log(`[${new Date().toISOString()}] Analysis completed (${payloadSizeKB} KB)`);
      console.log(`[${new Date().toISOString()}] Sending completion signal to client`);
      
      // Send just a completion signal with the analysis result for client-side storage
      res.write(`event: complete\ndata: ${jsonString}\n\n`);
      res.end();
    } catch (serializationError) {
      console.error('Failed to serialize analysis result:', serializationError);
      res.write(`event: error\ndata: ${JSON.stringify({ error: 'Failed to serialize analysis result' })}\n\n`);
      res.end();
    }
  } catch (error) {
    console.error('Analysis failed:', error);
    handleAnalysisError(res, error);
  }
};

// Support both GET and POST for analysis endpoint
app.get('/api/analyze', handleAnalysisRequest as express.RequestHandler);
app.post('/api/analyze', handleAnalysisRequest as express.RequestHandler);

// Endpoint to validate GitHub token
app.post('/api/validate-github-token', (async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ isValid: false, error: 'Token is required and must be a string.' });
    }
    const { GitHubService } = await import('./src/services/githubService');
    const githubService = new GitHubService(token);
    const isValid = await githubService.verifyToken();
    res.status(200).json({ isValid });
  } catch (error) {
    const err = error as Error;
    console.error('GitHub token validation error:', err.message);
    res.status(200).json({ isValid: false, error: `Token validation failed: ${err.message}` });
  }
}) as express.RequestHandler);

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});
