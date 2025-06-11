import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import { LLMService, LLMProcessingError as CustomLLMError } from './src/services/llmService';
import { BackendAnalysisService } from './src/services/backendAnalysisService';
import type { LLMConfig } from './src/types';

const app: Express = express();
const port = process.env.PORT || 3001;

app.use(cors()); // Enable CORS for all routes
app.use(express.json({ limit: '50mb' }));

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

// Endpoint to handle diagram enhancement
app.post('/api/llm/enhance-diagram', (async (req: Request, res: Response) => {
  try {
    const { llmConfig, diagramCode, fileInfo } = req.body;
    if (!llmConfig || !diagramCode) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    const llmService = new LLMService(llmConfig);
    const result = await llmService.enhanceMermaidDiagram(diagramCode, fileInfo);
    res.json(result);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: `Error enhancing diagram: ${err.message}` });
  }
}) as express.RequestHandler);

// Modified endpoint to support both GET and POST
const handleAnalysisRequest = async (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const sendProgress = (step: string, progress: number) => {
    // Log progress to server console for debugging
    console.log(`[${new Date().toISOString()}] Progress: ${progress}% - ${step}`);
    try {
      res.write(`data: ${JSON.stringify({ step, progress })}\n\n`);
    } catch (error) {
      console.error('Failed to send progress update to client:', error);
    }
  };

  try {
    // Get parameters from query (GET) or body (POST)
    const { repoUrl, llmConfig: llmConfigString, githubToken: rawGithubToken } = req.method === 'POST' ? req.body : req.query;
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
      } catch (err) {
        const errorMessage = `Invalid llmConfig parameter: ${err instanceof Error ? err.message : 'Invalid JSON format'}`;
        console.error(errorMessage);
        res.write(`event: error\ndata: ${JSON.stringify({ error: errorMessage })}\n\n`);
        res.end();
        return;
      }
    }

    console.log(`[${new Date().toISOString()}] Starting analysis for: ${repoUrl}`);
    const analysisService = new BackendAnalysisService(githubToken, llmConfig);
    const report = await analysisService.analyze(repoUrl as string, sendProgress);
    
    console.log(`[${new Date().toISOString()}] Analysis completed successfully`);
    res.write(`event: complete\ndata: ${JSON.stringify(report)}\n\n`);
    res.end();
  } catch (error) {
    let errorMessage = 'An unknown error occurred during analysis.';
    if (error instanceof CustomLLMError) {
        errorMessage = `An LLM processing error occurred: ${error.message}`;
    } else if (error instanceof Error) {
        errorMessage = error.message;
    }
    
    console.error('Analysis failed:', error);
    try {
      res.write(`event: error\ndata: ${JSON.stringify({ error: errorMessage })}\n\n`);
      res.end();
    } catch (writeError) {
      console.error('Failed to send error response to client:', writeError);
    }
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

// Endpoint to validate LLM API key
app.post('/api/validate-llm-key', (async (req: Request, res: Response) => {
  try {
    const { llmConfig } = req.body;
    if (!llmConfig || !llmConfig.provider || !llmConfig.apiKey) {
      return res.status(400).json({ isValid: false, error: 'LLM configuration (provider and apiKey) is required.' });
    }
    const llmService = new LLMService(llmConfig);
    const isValid = await llmService.checkAvailability(); // Using existing checkAvailability
    res.status(200).json({ isValid });
  } catch (error) {
    const err = error as Error;
    console.error('LLM key validation error:', err.message);
    res.status(200).json({ isValid: false, error: `LLM key validation failed: ${err.message}` });
  }
}) as express.RequestHandler);


app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});
