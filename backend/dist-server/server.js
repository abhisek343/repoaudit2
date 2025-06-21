"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const compression_1 = __importDefault(require("compression"));
const llmService_1 = require("./src/services/llmService");
const backendAnalysisService_1 = require("./src/services/backendAnalysisService");
const architectureController_1 = require("./src/controllers/architectureController");
const redisCacheService_1 = require("./src/services/redisCacheService");
const errorHandler_1 = require("./src/middleware/errorHandler");
const app = (0, express_1.default)();
const port = process.env.PORT || 3001;
// Redis cache for analysis results
const cacheService = new redisCacheService_1.RedisCacheService(process.env.REDIS_URL || 'redis://localhost:6379');
// Initialize controllers
const architectureController = new architectureController_1.ArchitectureController();
// Enable gzip/brotli compression for all responses, but not for SSE
app.use((req, res, next) => {
    if (req.path === '/api/analyze') {
        return next();
    }
    (0, compression_1.default)()(req, res, next);
});
app.use((0, cors_1.default)()); // Enable CORS for all routes
app.use(express_1.default.json({ limit: '50mb' }));
// Safe serialization preserving all data and handling circular references
function safeSerializeReport(report) {
    const seen = new WeakSet();
    return JSON.stringify(report, (_key, value) => {
        if (typeof value === 'object' && value !== null) {
            if (seen.has(value))
                return '[Circular]';
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
function handleAnalysisError(res, error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    try {
        res.write(`event: error\ndata: ${JSON.stringify({ error: msg })}\n\n`);
        res.end();
    }
    catch (e) {
        console.error('Failed to send error to client:', e);
        try {
            res.destroy();
        }
        catch { }
    }
}
// Architecture analysis endpoints
app.post('/api/architecture/analyze', (0, errorHandler_1.safeAsync)((req, res) => architectureController.analyzeArchitecture(req, res)));
app.get('/api/architecture/config', (0, errorHandler_1.safeAsync)((req, res) => architectureController.getConfiguration(req, res)));
app.put('/api/architecture/config', (0, errorHandler_1.safeAsync)((req, res) => architectureController.updateConfiguration(req, res)));
app.get('/api/architecture/config/export', (0, errorHandler_1.safeAsync)((req, res) => architectureController.exportConfiguration(req, res)));
app.post('/api/architecture/config/import', (0, errorHandler_1.safeAsync)((req, res) => architectureController.importConfiguration(req, res)));
// Endpoint to check LLM availability
app.post('/api/llm/check', (0, errorHandler_1.safeAsync)(async (req, res) => {
    const { llmConfig } = req.body;
    if (!llmConfig || !llmConfig.provider || !llmConfig.apiKey) {
        res.status(200).json({ success: false, message: 'LLM configuration missing.' });
        return;
    }
    // Skip real LLM availability check to avoid external API retries  res.status(200).json({ success: true });
}));
// Endpoint to validate LLM API key (endpoint expected by frontend)
app.post('/api/validate-llm-key', (0, errorHandler_1.safeAsync)(async (req, res) => {
    const { llmConfig } = req.body;
    if (!llmConfig || !llmConfig.provider || !llmConfig.apiKey) {
        return res.status(400).json({ isValid: false, error: 'LLM configuration is required.' });
    }
    const analysisService = new backendAnalysisService_1.BackendAnalysisService(undefined, llmConfig);
    const result = await analysisService.validateLlmKey(llmConfig);
    res.status(200).json(result);
}));
// Endpoint to handle diagram enhancement
app.post('/api/llm/enhance-diagram', (0, errorHandler_1.safeAsync)(async (req, res) => {
    const { llmConfig, diagramCode, fileInfo } = req.body;
    if (!llmConfig || !diagramCode) {
        res.status(400).json({ error: 'Missing required parameters' });
        return;
    }
    const llmService = new llmService_1.LLMService(llmConfig);
    const result = await llmService.enhanceMermaidDiagram(diagramCode, fileInfo);
    res.json({ enhancedDiagram: result.enhancedCode });
}));
// Endpoint to generate AI summary
app.post('/api/llm/generate-summary', (0, errorHandler_1.safeAsync)(async (req, res) => {
    const { llmConfig, codebaseContext } = req.body;
    if (!llmConfig || !codebaseContext) {
        res.status(400).json({ error: 'Missing required parameters' });
        return;
    }
    const llmService = new llmService_1.LLMService(llmConfig);
    const result = await llmService.generateSummary(codebaseContext);
    res.json(result);
}));
// Endpoint to analyze architecture
app.post('/api/llm/analyze-architecture', (0, errorHandler_1.safeAsync)(async (req, res) => {
    const { llmConfig, codeStructure } = req.body;
    if (!llmConfig || !codeStructure) {
        res.status(400).json({ error: 'Missing required parameters' });
        return;
    }
    const llmService = new llmService_1.LLMService(llmConfig);
    const result = await llmService.generateText(`Analyze the architecture of this codebase:
      File Structure: ${JSON.stringify(codeStructure.files)}
      Dependencies: ${JSON.stringify(codeStructure.dependencies)}
      
      Provide:
      1. Architecture pattern identification
      2. Structural analysis
      3. Improvement recommendations
      4. Potential issues or anti-patterns`, 1500);
    res.json({ analysis: result });
}));
// Endpoint to perform security analysis
app.post('/api/llm/security-analysis', (0, errorHandler_1.safeAsync)(async (req, res) => {
    const { llmConfig, securityData } = req.body;
    if (!llmConfig || !securityData) {
        res.status(400).json({ error: 'Missing required parameters' });
        return;
    }
    const llmService = new llmService_1.LLMService(llmConfig);
    const result = await llmService.generateText(`Perform security analysis on this repository:
      Security Issues: ${JSON.stringify(securityData.issues)}
      Dependencies: ${JSON.stringify(securityData.dependencies)}
      
      Analyze:
      1. Vulnerability assessment
      2. Security best practices compliance
      3. Risk level evaluation
      4. Remediation recommendations`, 1200);
    res.json({ analysis: result });
}));
// Endpoint to generate AI insights for overview page
app.post('/api/llm/generate-insights', (0, errorHandler_1.safeAsync)(async (req, res) => {
    const { llmConfig, repoData } = req.body;
    if (!llmConfig || !repoData) {
        res.status(400).json({ error: 'Missing required parameters' });
        return;
    }
    const llmService = new llmService_1.LLMService(llmConfig);
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
}));
// Handle analysis request with proper SSE formatting and error handling
const handleAnalysisRequest = async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');
    res.flushHeaders();
    let clientDisconnected = false;
    let keepAliveInterval = null;
    let eventId = 0;
    // Send keep-alive messages every 15 seconds
    keepAliveInterval = setInterval(() => {
        if (!clientDisconnected) {
            try {
                res.write(`id: ${eventId++}\nevent: keep-alive\ndata: ${JSON.stringify({ timestamp: Date.now() })}\n\n`);
            }
            catch (err) {
                console.warn('Keep-alive failed, client likely disconnected');
                clientDisconnected = true;
                if (keepAliveInterval)
                    clearInterval(keepAliveInterval);
            }
        }
    }, 15000);
    const sendProgress = (step, progress) => {
        if (clientDisconnected) {
            console.warn('Skipping progress update - client disconnected');
            return;
        }
        console.log(`[${new Date().toISOString()}] Progress: ${progress}% - ${step}`);
        try {
            // Each event needs an ID and event type
            res.write(`id: ${eventId++}\n` +
                `event: progress\n` +
                `data: ${JSON.stringify({
                    step,
                    progress,
                    timestamp: Date.now()
                })}\n\n`);
        }
        catch (err) {
            console.warn('Progress write failed:', err);
            clientDisconnected = true;
            handleAnalysisError(res, err);
        }
    };
    // Clean up on client disconnect
    req.on('close', () => {
        clientDisconnected = true;
        if (keepAliveInterval)
            clearInterval(keepAliveInterval);
        console.warn('Client disconnected before analysis complete');
        try {
            res.end();
        }
        catch (e) { }
    });
    req.on('error', (err) => {
        clientDisconnected = true;
        if (keepAliveInterval)
            clearInterval(keepAliveInterval);
        console.error('Request error:', err);
        try {
            res.end();
        }
        catch (e) { }
    });
    try {
        console.log('Received query:', req.query);
        console.log('Request method:', req.method);
        console.log('Request body:', req.body);
        const { repoUrl, llmConfig: llmConfigString, githubToken: rawGithubToken } = req.method === 'POST' ? req.body : req.query;
        console.log('Extracted parameters:', { repoUrl, llmConfigString, rawGithubToken });
        // Parse llmConfig if provided
        let llmConfig;
        try {
            llmConfig = llmConfigString ? JSON.parse(llmConfigString) : undefined;
        }
        catch (e) {
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
            return;
        }
        // Additional validation for GitHub URL format
        const githubUrlPattern = /^https?:\/\/github\.com\/[^\/]+\/[^\/]+\/?$/;
        if (!githubUrlPattern.test(repoUrl.trim())) {
            const error = 'Invalid GitHub repository URL format. Expected: https://github.com/owner/repo';
            console.error(error, { repoUrl: repoUrl.trim() });
            res.write(`event: error-message\ndata: ${JSON.stringify({ error })}\n\n`);
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
        const cacheKey = `analysis_${cleanRepoUrl}`;
        const cached = await cacheService.get(cacheKey);
        if (cached) {
            console.log(`Returning cached analysis for key ${cacheKey}`);
            res.write(`event: complete\ndata: ${cached}\n\n`);
            res.end();
            return;
        }
        console.log(`[${new Date().toISOString()}] Starting analysis for: ${cleanRepoUrl}`);
        const analysisService = new backendAnalysisService_1.BackendAnalysisService(githubToken, llmConfig);
        const report = await analysisService.analyze(cleanRepoUrl, sendProgress);
        if (keepAliveInterval)
            clearInterval(keepAliveInterval);
        if (clientDisconnected) {
            console.warn('Client disconnected - skipping completion signal');
            return;
        }
        try {
            const jsonString = safeSerializeReport(report);
            await cacheService.set(cacheKey, jsonString);
            const payloadSizeKB = (jsonString.length / 1024).toFixed(2);
            console.log(`[${new Date().toISOString()}] Analysis completed (${payloadSizeKB} KB)`);
            // Validate the JSON string before sending
            try {
                const testParse = JSON.parse(jsonString);
                console.log('JSON validation passed, sending result with keys:', Object.keys(testParse));
            }
            catch (parseTest) {
                console.error('JSON validation failed:', parseTest);
                throw new Error('Generated JSON is invalid');
            }
            res.write(`id: ${eventId++}\nevent: complete\ndata: ${jsonString}\n\n`);
            res.end();
        }
        catch (serializationError) {
            console.error('Failed to serialize analysis result:', serializationError);
            if (!clientDisconnected) {
                res.write(`event: error-message\n` +
                    `data: ${JSON.stringify({ error: 'Failed to serialize analysis result: ' + (serializationError instanceof Error ? serializationError.message : 'Unknown error') })}\n\n`);
                res.end();
            }
        }
    }
    catch (error) {
        console.error('Analysis failed:', error);
        if (keepAliveInterval)
            clearInterval(keepAliveInterval);
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
// Endpoint to validate GitHub token
app.post('/api/validate-github-token', (0, errorHandler_1.safeAsync)(async (req, res) => {
    const { token } = req.body;
    if (!token || typeof token !== 'string') {
        return res.status(400).json({ isValid: false, error: 'Token is required and must be a string.' });
    }
    const analysisService = new backendAnalysisService_1.BackendAnalysisService(token);
    const result = await analysisService.validateGithubToken(token);
    res.status(200).json(result);
}));
// Endpoint to check for environment keys (for open source setup)
app.get('/api/check-env-keys', (_req, res) => {
    // Since this is an open source project that works with user-provided keys,
    // we don't need server-side environment variables
    res.status(200).json({
        hasLlmKey: false,
        hasGithubToken: false,
        message: 'This is an open source project. Please provide your own API keys in settings.'
    });
});
// Single-process mode (cluster integration removed)
// Centralized error handler
app.use(errorHandler_1.errorHandler);
app.listen(port, () => {
    console.log(`[server]: Server is running at http://localhost:${port}`);
});
