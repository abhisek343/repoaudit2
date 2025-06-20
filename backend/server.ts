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
app.post('/api/llm/check', async (req: Request, res: Response) => {
  const { llmConfig } = req.body;
  if (!llmConfig || !llmConfig.provider || !llmConfig.apiKey) {
    res.status(200).json({ success: false, message: 'LLM configuration missing.' });
    return;
  }
  // Skip real LLM availability check to avoid external API retries
  res.status(200).json({ success: true });
});

// Rate limiting for validation endpoint
const validationRateLimit = new Map<string, number>();
const VALIDATION_COOLDOWN_MS = 5000; // 5 seconds between validation attempts

// Endpoint to validate LLM API key (endpoint expected by frontend)
app.post('/api/validate-llm-key', async (req: Request, res: Response) => {
  try {
    const { llmConfig } = req.body;
    if (!llmConfig || !llmConfig.provider || !llmConfig.apiKey) {
      res.status(200).json({ isValid: false, error: 'LLM configuration missing.' });
      return;
    }
    
    // Rate limiting based on API key
    const rateLimitKey = `${llmConfig.provider}_${llmConfig.apiKey.substring(0, 8)}`;
    const lastValidation = validationRateLimit.get(rateLimitKey);
    const now = Date.now();
    
    if (lastValidation && (now - lastValidation) < VALIDATION_COOLDOWN_MS) {
      console.log('Rate limiting validation request');
      res.status(200).json({ 
        isValid: false, 
        error: 'Validation rate limited. Please wait a moment before retrying.' 
      });
      return;
    }
    
    validationRateLimit.set(rateLimitKey, now);
    
    const llmService = new LLMService(llmConfig);
    
    // Check if we're in a quota exhaustion cooldown period
    const isValid = await llmService.checkAvailability();
    res.status(200).json({ isValid });
  } catch (error) {
    const err = error as Error;
    console.error('LLM validation error:', err.message);
    
    // Check if it's a quota exhaustion error
    if (err.message.toLowerCase().includes('quota') || 
        err.message.toLowerCase().includes('unavailable due to quota')) {
      res.status(200).json({ 
        isValid: false, 
        error: 'LLM service temporarily unavailable due to quota limits. Please try again later.' 
      });
    } else {
      res.status(200).json({ isValid: false, error: `Failed to validate LLM key: ${err.message}` });
    }
  }
});

// Endpoint to handle diagram enhancement
app.post('/api/llm/enhance-diagram', async (req: Request, res: Response) => {
  try {
    const { llmConfig, diagramCode, fileInfo } = req.body;
    if (!llmConfig || !diagramCode) {
      res.status(400).json({ error: 'Missing required parameters' });
      return;
    }
    const llmService = new LLMService(llmConfig);
    const result = await llmService.enhanceMermaidDiagram(diagramCode, fileInfo);
    res.json({ enhancedDiagram: result.enhancedCode });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: `Error enhancing diagram: ${err.message}` });
  }
});

// Endpoint to generate AI summary
app.post('/api/llm/generate-summary', async (req: Request, res: Response) => {
  try {
    const { llmConfig, codebaseContext } = req.body;
    if (!llmConfig || !codebaseContext) {
      res.status(400).json({ error: 'Missing required parameters' });
      return;
    }
    const llmService = new LLMService(llmConfig);
    const result = await llmService.generateSummary(codebaseContext);
    res.json(result);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: `Error generating summary: ${err.message}` });
  }
});

// Endpoint to analyze architecture
app.post('/api/llm/analyze-architecture', async (req: Request, res: Response) => {
  try {
    const { llmConfig, codeStructure } = req.body;
    if (!llmConfig || !codeStructure) {
      res.status(400).json({ error: 'Missing required parameters' });
      return;
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
});

// Endpoint to perform security analysis
app.post('/api/llm/security-analysis', async (req: Request, res: Response) => {
  try {
    const { llmConfig, securityData } = req.body;
    if (!llmConfig || !securityData) {
      res.status(400).json({ error: 'Missing required parameters' });
      return;
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
    );
    res.json({ analysis: result });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: `Error performing security analysis: ${err.message}` });
  }
});

// Endpoint to generate AI insights for overview page
app.post('/api/llm/generate-insights', async (req: Request, res: Response) => {
  try {
    const { llmConfig, repoData } = req.body;
    if (!llmConfig || !repoData) {
      res.status(400).json({ error: 'Missing required parameters' });
      return;
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
});

// Modified endpoint to support both GET and POST
const handleAnalysisRequest = async (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');
  res.flushHeaders();  // Handle client disconnects gracefully
  let clientDisconnected = false;
  let keepAliveInterval: NodeJS.Timeout | null = null;
  
  req.on('close', () => {
    clientDisconnected = true;
    if (keepAliveInterval) clearInterval(keepAliveInterval);
    console.warn('Client disconnected before analysis complete, aborting response stream.');
    try { res.end(); } catch (e) {}
  });

  req.on('error', (err) => {
    clientDisconnected = true;
    if (keepAliveInterval) clearInterval(keepAliveInterval);
    console.error('Request error:', err);
    try { res.end(); } catch (e) {}
  });
  
  // Send keep-alive messages every 30 seconds to prevent timeout
  keepAliveInterval = setInterval(() => {
    if (!clientDisconnected) {
      try {
        res.write(`data: ${JSON.stringify({ type: 'keep-alive', timestamp: Date.now() })}\n\n`);
      } catch (err) {
        console.warn('Keep-alive failed, client likely disconnected');
        clientDisconnected = true;
        if (keepAliveInterval) clearInterval(keepAliveInterval);
      }
    }
  }, 30000);
  const sendProgress = (step: string, progress: number) => {
    if (clientDisconnected) {
      console.warn('Skipping progress update - client disconnected');
      return;
    }
    console.log(`[${new Date().toISOString()}] Progress: ${progress}% - ${step}`);
    try {
      // Include type and timestamp in SSE progress events
      res.write(`data: ${JSON.stringify({ type: 'progress', step, progress, timestamp: Date.now() })}\n\n`);
    } catch (err) {
      console.warn('Progress write failed, aborting response:', err);
      clientDisconnected = true;
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
    const report = await analysisService.analyze(repoUrl as string, sendProgress);    console.log(`[${new Date().toISOString()}] Analysis completed successfully`);
    
    // Clean up keep-alive interval
    if (keepAliveInterval) clearInterval(keepAliveInterval);
    
    if (clientDisconnected) {
      console.warn('Client disconnected - skipping completion signal');
      return;
    }
    
    try {
      // Use safeSerializeReport for robust serialization
      const jsonString = safeSerializeReport(report);
      
      const payloadSizeKB = (jsonString.length / 1024).toFixed(2);
      console.log(`[${new Date().toISOString()}] Analysis completed (${payloadSizeKB} KB)`);
      console.log(`[${new Date().toISOString()}] Sending completion signal to client`);
        // Send complete event with proper event type
      res.write(`event: complete\ndata: ${jsonString}\n\n`);
      res.end();
    } catch (serializationError) {
      console.error('Failed to serialize analysis result:', serializationError);
      if (!clientDisconnected) {
        res.write(`event: error\ndata: ${JSON.stringify({ error: 'Failed to serialize analysis result' })}\n\n`);
        res.end();
      }
    }  } catch (error) {
    console.error('Analysis failed:', error);
    // Clean up keep-alive interval on error
    if (keepAliveInterval) clearInterval(keepAliveInterval);
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

// Endpoint to check for environment keys (for open source setup)
app.get('/api/check-env-keys', (req: Request, res: Response) => {
  // Since this is an open source project that works with user-provided keys,
  // we don't need server-side environment variables
  res.status(200).json({
    hasLlmKey: false,
    hasGithubToken: false,
    message: 'This is an open source project. Please provide your own API keys in settings.'
  });
});

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});
