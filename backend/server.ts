import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import compression from 'compression';
import { BackendAnalysisService } from './src/services/backendAnalysisService';
import { ArchitectureController } from './src/controllers/architectureController';
import { RedisCacheService } from './src/services/redisCacheService';
import type { LLMConfig } from './src/types';
import { safeAsync, errorHandler } from './src/middleware/errorHandler';
import he from 'he';

const app: Express = express();
const port = process.env.PORT || 3001;

// Redis cache for analysis results
const cacheService = new RedisCacheService(process.env.REDIS_URL || 'redis://localhost:6379');

// Initialize controllers with shared cache service
const architectureController = new ArchitectureController(cacheService);

// Enable gzip/brotli compression for all responses, but not for SSE
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.path === '/api/analyze') {
    return next();
  }
  compression()(req, res, next);
});
app.use(cors()); // Enable CORS for all routes
app.use(express.json({ limit: '50mb' }));

// Safe serialization preserving all data and handling circular references
function safeSerializeReport(report: any): string {
  const cache = new Set();
  return JSON.stringify(report, (_key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (cache.has(value)) {
        // Circular reference found, discard key
        return;
      }
      cache.add(value);
    }
    return value;
  });
}

// Robust error response
function handleAnalysisError(res: Response, error: unknown): void {
  const msg = error instanceof Error ? error.message : 'Unknown error';
  try {
    // Use the new structured event protocol for errors
    res.write(`event: error-message\ndata: ${JSON.stringify({ error: msg })}\n\n`);
    res.end();
  } catch (e) {
    console.error('Failed to send error to client:', e);
    try { res.destroy(); } catch {}
  }
}

// Architecture analysis endpoints
app.post('/api/architecture/analyze', safeAsync((req: Request, res: Response) => 
  architectureController.analyzeArchitecture(req, res)));
app.get('/api/architecture/config', safeAsync((req: Request, res: Response) =>
  architectureController.getConfiguration(req, res)));
app.put('/api/architecture/config', safeAsync((req: Request, res: Response) =>
  architectureController.updateConfiguration(req, res)));
app.get('/api/architecture/config/export', safeAsync((req: Request, res: Response) =>
  architectureController.exportConfiguration(req, res)));
app.post('/api/architecture/config/import', safeAsync((req: Request, res: Response) =>
  architectureController.importConfiguration(req, res)));

// Endpoint to check LLM availability
app.post('/api/llm/check', safeAsync(async (req: Request, res: Response) => {
  const { llmConfig }: { llmConfig?: LLMConfig } = req.body;
  if (!llmConfig || !llmConfig.provider || !llmConfig.apiKey) {
    res.status(200).json({ success: false, message: 'LLM configuration missing.' });
    return;
  }
  // Skip real LLM availability check to avoid external API retries  res.status(200).json({ success: true });
}));

// Endpoint to validate LLM API key (endpoint expected by frontend)
app.post('/api/validate-llm-key', safeAsync(async (req: Request, res: Response) => {
  const { llmConfig } = req.body;
  if (!llmConfig || !llmConfig.provider || !llmConfig.apiKey) {
    return res.status(400).json({ isValid: false, error: 'LLM configuration is required.' });
  }
  
  const analysisService = new BackendAnalysisService(undefined, llmConfig);
  const result = await analysisService.validateLlmKey(llmConfig);
  res.status(200).json(result);
}));


// Handle analysis request with proper SSE formatting and error handling
const handleAnalysisRequest = async (req: Request, res: Response) => {
  // --- Step 1: Set SSE Headers ---
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive', // Explicitly set for SSE
    'Access-Control-Allow-Origin': '*',
  });
  res.flushHeaders();

  // --- Step 2: Force Keep-Alive and Handle Disconnection ---
  // The `connection: 'close'` header from the client is the root cause.
  // We must override this behavior at the socket level to keep the connection open.
  req.socket.setKeepAlive(true);
  req.socket.setNoDelay(true);
  req.socket.setTimeout(0); // Disable socket timeout to prevent premature closing

  let clientDisconnected = false;
  let keepAliveInterval: NodeJS.Timeout | null = null;

  const cleanup = () => {
    if (!clientDisconnected) {
      clientDisconnected = true;
      if (keepAliveInterval) clearInterval(keepAliveInterval);
      console.warn('Client disconnected, cleaning up resources.');
      try { res.end(); } catch (e) { /* ignore */ }
    }
  };

  // Attach listeners immediately. The fragile setTimeout is removed.
  req.on('close', cleanup);
  req.on('error', (err) => {
    console.error('Request error:', err);
    cleanup();
  });
  res.on('error', (err) => {
    console.error('Response error:', err);
    cleanup();
  });

  // --- Step 3: Implement a Robust Heartbeat ---
  // Send a comment every 15 seconds to prevent proxy timeouts.
  keepAliveInterval = setInterval(() => {
    if (clientDisconnected) {
      clearInterval(keepAliveInterval as NodeJS.Timeout);
      return;
    }
    try {
      res.write(': heartbeat\n\n');
    } catch (err) {
      console.warn('Heartbeat failed, client likely disconnected.');
      cleanup();
    }
  }, 15000);

  const sendProgress = (step: string, progress: number) => {
    if (clientDisconnected) {
      console.warn(`Skipping progress update (client disconnected): ${progress}% - ${step}`);
      return;
    }

    console.log(`[${new Date().toISOString()}] Progress: ${progress}% - ${step}`);
    try {
      const payload = { step, progress, timestamp: Date.now() };
      res.write(`event: progress\ndata: ${JSON.stringify(payload)}\n\n`);
    } catch (err) {
      console.warn('Progress write failed:', err);
      cleanup();
    }
  };

  // Send initial progress from server before heavy work
  sendProgress('Starting analysis', 1);

  try {
    console.log('Received query:', req.query);
    console.log('Request method:', req.method);
    console.log('Request body:', req.body);
    
    const { repoUrl, llmConfig: llmConfigString, githubToken: rawGithubToken } = 
      req.method === 'POST' ? req.body : req.query;

    console.log('Extracted parameters:', { repoUrl, llmConfigString: llmConfigString, rawGithubToken });

    // Parse llmConfig if provided
    let llmConfig;
    try {
      llmConfig = llmConfigString ? JSON.parse(llmConfigString as string) : undefined;
    } catch (e) {
      console.warn('Failed to parse llmConfig:', e);
      llmConfig = undefined;
    }

    const githubToken = typeof rawGithubToken === 'string' && rawGithubToken.trim() !== '' 
      ? rawGithubToken 
      : undefined;
    
    // Enhanced validation for repoUrl
    if (!repoUrl || typeof repoUrl !== 'string' || repoUrl.trim() === '') {
      const error = 'Repository URL is required and must be a valid non-empty string';
      console.error(error, { repoUrl, type: typeof repoUrl });
      res.write(`event: error-message\ndata: ${JSON.stringify({ error })}\n\n`);
      res.end();
      return;    }

    // Additional validation for GitHub URL format
    const githubUrlPattern = /^https:\/\/github\.com\/[a-zA-Z0-9-]+\/[a-zA-Z0-9_.-]+$/;
    if (!githubUrlPattern.test(repoUrl.trim())) {
      const error = 'Invalid GitHub repository URL format. Expected: https://github.com/owner/repo';
      console.error(error, { repoUrl: repoUrl.trim() });
      res.write(`event: error-message\ndata: ${JSON.stringify({ error: he.encode(error) })}\n\n`);
      res.end();
      return;
    }

    // Prevent analysis of test/placeholder URLs
    const testUrls = [
      'https://github.com/test/test',
      'https://github.com/example/example',
      'https://github.com/demo/demo',
      'https://github.com/sample/sample'
    ];
    if (testUrls.includes(repoUrl.trim().toLowerCase())) {
      const error = 'Test/placeholder URLs are not allowed for analysis';
      console.error(error, { repoUrl: repoUrl.trim() });
      res.write(`event: error-message\ndata: ${JSON.stringify({ error })}\n\n`);
      res.end();
      return;
    }

    const cleanRepoUrl = repoUrl.trim();

    console.log(`🔍 Analysis request validated for: ${cleanRepoUrl}`);

    // Send initial progress to confirm connection
    sendProgress('Connection established', 0);

    // Check cache first
    const sanitizedRepoUrl = cleanRepoUrl.replace(/[^a-zA-Z0-9-._:/]/g, '');
    const cacheKey = `analysis_${sanitizedRepoUrl}`;
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      console.log(`Returning cached analysis for key ${cacheKey}`);
      // Use the same 'result' event for consistency
      res.write(`event: result\ndata: ${cached}\n\n`);
      // Also send the 'done' event
      res.write(`event: done\ndata: ${JSON.stringify({ message: "Stream finished (from cache)" })}\n\n`);
      res.end();
      return;
    }

    console.log(`[${new Date().toISOString()}] Starting analysis for: ${cleanRepoUrl}`);
    const analysisService = new BackendAnalysisService(githubToken, llmConfig);
    try {
      const report = await analysisService.analyze(cleanRepoUrl, {
        useCache: false, // Caching is handled at this layer
        branch: 'main', // Default branch, can be overridden by query params
        dependencies: true,
        architecture: true,
        quality: true,
        security: true,
        technicalDebt: true,
        performance: true,
        hotspots: true,
        keyFunctions: true,
        prAnalysis: true,
        contributorAnalysis: true,
        aiSummary: !!llmConfig?.apiKey,
        aiArchitecture: !!llmConfig?.apiKey,
        temporalCoupling: true,
        dataTransformation: true,
        gitGraph: true,
        sendProgress,
      });
      if (keepAliveInterval) clearInterval(keepAliveInterval);
      
      if (clientDisconnected) {
        console.warn('Client disconnected - skipping completion signal');
        return;
      }
      
      const jsonString = safeSerializeReport(report);
      await cacheService.set(cacheKey, jsonString);
      
      // Also cache the report by its ID for the /api/report/:id endpoint
      await cacheService.set(report.id, jsonString);
      console.log(`Report cached with both keys: ${cacheKey} and ${report.id}`);
      
      // Send the final report payload under a 'result' event
      console.log('Sending final analysis report to client.');
      res.write(`event: result\ndata: ${jsonString}\n\n`);
      
      // Send a final 'done' event to signal completion gracefully
      console.log('Signaling end of stream to client.');
      res.write(`event: done\ndata: ${JSON.stringify({ message: "Stream finished" })}\n\n`);

      // Now, it's safe to close the connection.
      res.end();
    } catch (error) {
      if (keepAliveInterval) clearInterval(keepAliveInterval);
      handleAnalysisError(res, error);
      return;
    }

  } catch (error) {
    console.error('Analysis failed:', error);
    if (keepAliveInterval) clearInterval(keepAliveInterval);
    handleAnalysisError(res, error);
  }
};

// Support both GET and POST for analysis endpoint
app.get('/api/analyze', (req, res) => {
  console.log(`🚨 GET /api/analyze called with query:`, req.query);
  console.log(`🚨 Request headers:`, req.headers);
  console.log(`🚨 User-Agent:`, req.get('User-Agent'));
  handleAnalysisRequest(req, res);
});

app.post('/api/analyze', (req, res) => {
  console.log(`🚨 POST /api/analyze called with body:`, req.body);
  console.log(`🚨 Request headers:`, req.headers);
  console.log(`🚨 User-Agent:`, req.get('User-Agent'));
  handleAnalysisRequest(req, res);
});

// New endpoint to fetch the full report by ID
app.get('/api/report/:id', safeAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const report = await cacheService.get(id);
  if (report) {
    res.status(200).json(JSON.parse(report as string));
  } else {
    res.status(404).json({ error: 'Report not found or expired.' });
  }
}));

// Endpoint to validate GitHub token
app.post('/api/validate-github-token', safeAsync(async (req: Request, res: Response) => {
  const { token } = req.body;
  if (!token || typeof token !== 'string') {
    return res.status(400).json({ isValid: false, error: 'Token is required and must be a string.' });
  }
  const analysisService = new BackendAnalysisService(token);
  const result = await analysisService.validateGithubToken(token);
  res.status(200).json(result);
}));

// Endpoint to check for environment keys (for open source setup)
app.get('/api/check-env-keys', (_req: Request, res: Response) => {
  // Since this is an open source project that works with user-provided keys,
  // we don't need server-side environment variables
  res.status(200).json({
    hasLlmKey: false,
    hasGithubToken: false,
    message: 'This is an open source project. Please provide your own API keys in settings.'
  });
});

// Single-process mode (cluster integration removed)

// Add a health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// Centralized error handler
app.use(errorHandler);

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});
