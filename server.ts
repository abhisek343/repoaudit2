import express, { Express, Request, Response, NextFunction } from 'express'; // Added NextFunction
import { GitHubService } from './src/services/githubService';
import { LLMService } from './src/services/llmService'; // Import LLMService
import { LLMConfig } from './src/types'; // Import LLMConfig

const app: Express = express();
const port = 3001; // Fixed port for the API server

app.use(express.json()); // Middleware to parse JSON bodies

// Placeholder for API routes
app.get('/api', (_req: Request, res: Response) => {
  res.send('Express + TypeScript Server');
});

// Contributor API endpoint
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.get('/api/contributors/:owner/:repo', (async (req: Request, res: Response, _next: NextFunction) => {
  const { owner, repo } = req.params;
  const clientToken = req.headers['x-github-token'] as string | undefined;

  if (!owner || !repo) {
    return res.status(400).json({ error: 'Missing owner or repo path parameters' });
  }

  if (typeof owner !== 'string' || typeof repo !== 'string') {
    return res.status(400).json({ error: 'Owner and repo must be strings' });
  }

  try {
    const githubService = new GitHubService(clientToken);
    const contributors = await githubService.getContributors(owner, repo);
    res.json(contributors);
  } catch (error: unknown) {
    if (error instanceof Error) {
      // Check for specific error messages from GitHubService to return appropriate status codes
      if (error.message.includes('rate limit exceeded')) {
        return res.status(429).json({ error: error.message }); // 429 Too Many Requests
      }
      if (error.message.includes('not found') || error.message.includes('Repository not found')) {
        return res.status(404).json({ error: error.message });
      }
      if (error.message.includes('Invalid GitHub Personal Access Token') || error.message.includes('Authentication failed')) {
        return res.status(401).json({ error: error.message });
      }
      if (error.message.includes('Access forbidden')) {
        return res.status(403).json({ error: error.message });
      }
      return res.status(500).json({ error: `Failed to fetch contributors: ${error.message}` });
    }
    return res.status(500).json({ error: 'An unknown error occurred while fetching contributors' });
  }
}) as express.RequestHandler);

// GitHub Repository Info API endpoint
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.get('/api/repository/:owner/:repo', (async (req: Request, res: Response, _next: NextFunction) => {
  const { owner, repo } = req.params;
  const clientToken = req.headers['x-github-token'] as string | undefined;

  if (!owner || !repo || typeof owner !== 'string' || typeof repo !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid owner/repo path parameters' });
  }
  try {
    const githubService = new GitHubService(clientToken);
    const repository = await githubService.getRepository(owner, repo);
    res.json(repository);
  } catch (error: unknown) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error fetching repository' });
  }
}) as express.RequestHandler);

// GitHub Commits API endpoint
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.get('/api/commits/:owner/:repo', (async (req: Request, res: Response, _next: NextFunction) => {
  const { owner, repo } = req.params;
  const { branchOrSha } = req.query;
  const clientToken = req.headers['x-github-token'] as string | undefined;

  if (!owner || !repo || typeof owner !== 'string' || typeof repo !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid owner/repo path parameters' });
  }
  if (branchOrSha && typeof branchOrSha !== 'string') {
    return res.status(400).json({ error: 'Invalid branchOrSha query parameter' });
  }
  try {
    const githubService = new GitHubService(clientToken);
    const commits = await githubService.getCommits(owner, repo, branchOrSha);
    res.json(commits);
  } catch (error: unknown) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error fetching commits' });
  }
}) as express.RequestHandler);

// GitHub Languages API endpoint
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.get('/api/languages/:owner/:repo', (async (req: Request, res: Response, _next: NextFunction) => {
  const { owner, repo } = req.params;
  const clientToken = req.headers['x-github-token'] as string | undefined;

  if (!owner || !repo || typeof owner !== 'string' || typeof repo !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid owner/repo path parameters' });
  }
  try {
    const githubService = new GitHubService(clientToken);
    const languages = await githubService.getLanguages(owner, repo);
    res.json(languages);
  } catch (error: unknown) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error fetching languages' });
  }
}) as express.RequestHandler);

// GitHub File Content API endpoint
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.get('/api/file-content/:owner/:repo', (async (req: Request, res: Response, _next: NextFunction) => {
  const { owner, repo } = req.params;
  const { path } = req.query;
  const clientToken = req.headers['x-github-token'] as string | undefined;

  if (!owner || !repo || !path || typeof owner !== 'string' || typeof repo !== 'string' || typeof path !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid owner/repo/path parameters' });
  }
  try {
    const githubService = new GitHubService(clientToken);
    const content = await githubService.getFileContent(owner, repo, path);
    res.json({ content });
  } catch (error: unknown) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error fetching file content' });
  }
}) as express.RequestHandler);

// GitHub Directory Contents API endpoint
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.get('/api/directory-contents/:owner/:repo', (async (req: Request, res: Response, _next: NextFunction) => {
  const { owner, repo } = req.params;
  const { path } = req.query;
  const clientToken = req.headers['x-github-token'] as string | undefined;

  if (!owner || !repo || typeof owner !== 'string' || typeof repo !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid owner/repo path parameters' });
  }
  if (path && typeof path !== 'string') {
    return res.status(400).json({ error: 'Invalid path query parameter' });
  }
  try {
    const githubService = new GitHubService(clientToken);
    const contents = await githubService.getDirectoryContents(owner, repo, path || '');
    res.json(contents);
  } catch (error: unknown) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error fetching directory contents' });
  }
}) as express.RequestHandler);


// LLM Check API endpoint
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.post('/api/llm/check', (async (req: Request, res: Response, _next: NextFunction) => {
  const { llmConfig } = req.body as { llmConfig: LLMConfig };

  if (!llmConfig || !llmConfig.provider || !llmConfig.apiKey) {
    return res.status(400).json({ error: 'Missing LLM configuration (provider and apiKey are required)' });
  }

  try {
    const llmService = new LLMService(llmConfig);
    // Perform a simple test call, e.g., asking "Hello"
    const testResponse = await llmService.generateText("Hello", 10); 
    if (testResponse !== null && testResponse !== undefined && testResponse.trim() !== '') {
      res.json({ success: true, message: 'LLM configuration is valid.', testResponse });
    } else {
      // This case might indicate an issue even if no error was thrown, e.g. empty response
      res.status(500).json({ success: false, message: 'LLM configuration test returned an empty or invalid response.' });
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      // Check for specific error messages from LLMService to return appropriate status codes
      if (error.message.includes('API key') || error.message.includes('Invalid API key')) {
        return res.status(401).json({ success: false, error: `LLM API Key Check Failed: ${error.message}` });
      }
      if (error.message.includes('quota')) {
        return res.status(429).json({ success: false, error: `LLM Quota Exceeded: ${error.message}` });
      }
      if (error.message.includes('model')) {
         return res.status(400).json({ success: false, error: `LLM Model Issue: ${error.message}` });
      }
      return res.status(500).json({ success: false, error: `LLM Check Failed: ${error.message}` });
    }
    return res.status(500).json({ success: false, error: 'An unknown error occurred during LLM check' });
  }
}) as express.RequestHandler);

// LLM Enhance Diagram API endpoint
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.post('/api/llm/enhance-diagram', (async (req: Request, res: Response, _next: NextFunction) => {
  const { llmConfig, diagramType, diagramCode } = req.body as { llmConfig: LLMConfig, diagramType: string, diagramCode: string };

  if (!llmConfig || !llmConfig.provider || !llmConfig.apiKey) {
    return res.status(400).json({ error: 'Missing LLM configuration (provider and apiKey are required)' });
  }
  if (!diagramType || !diagramCode) {
    return res.status(400).json({ error: 'Missing diagramType or diagramCode' });
  }

  try {
    const llmService = new LLMService(llmConfig);
    const prompt = `Enhance the following ${diagramType} diagram code. Improve its clarity, layout, and add relevant details if possible. Return only the updated diagram code. Original code:\n\n\`\`\`${diagramType}\n${diagramCode}\n\`\`\``;
    const enhancedCode = await llmService.generateText(prompt, 1500); // Increased maxTokens for potentially larger diagrams
    
    // Attempt to clean the response to get only the code block if applicable
    let finalCode = enhancedCode;
    if (diagramType === 'mermaid') {
        const mermaidRegex = /```mermaid\n([\s\S]*?)\n```|```\n([\s\S]*?)\n```/;
        const match = enhancedCode.match(mermaidRegex);
        if (match) {
            finalCode = match[1] || match[2] || enhancedCode; // Use the captured group or fallback to original
        }
    } // Add similar extraction for D3 or other types if needed

    res.json({ success: true, enhancedCode: finalCode.trim() });
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message.includes('API key') || error.message.includes('Invalid API key')) {
        return res.status(401).json({ success: false, error: `LLM API Key Issue: ${error.message}` });
      }
      if (error.message.includes('quota')) {
        return res.status(429).json({ success: false, error: `LLM Quota Exceeded: ${error.message}` });
      }
       if (error.message.includes('model')) {
         return res.status(400).json({ success: false, error: `LLM Model Issue: ${error.message}` });
      }
      if (error.message.includes('context window')) {
        return res.status(413).json({ success: false, error: `Input too long for LLM: ${error.message}`}); // 413 Payload Too Large
      }
      return res.status(500).json({ success: false, error: `Failed to enhance diagram: ${error.message}` });
    }
    return res.status(500).json({ success: false, error: 'An unknown error occurred while enhancing diagram' });
  }
}) as express.RequestHandler);


// Generic LLM Text Generation API endpoint
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.post('/api/llm/generate-text', (async (req: Request, res: Response, _next: NextFunction) => {
  const { llmConfig, prompt, maxTokens } = req.body as { 
    llmConfig: LLMConfig, 
    prompt: string, 
    maxTokens?: number 
  };

  if (!llmConfig || !llmConfig.provider || !llmConfig.apiKey) {
    return res.status(400).json({ error: 'Missing LLM configuration (provider and apiKey are required)' });
  }
  if (!prompt) {
    return res.status(400).json({ error: 'Missing prompt' });
  }

  try {
    const llmService = new LLMService(llmConfig);
    const generatedText = await llmService.generateText(prompt, maxTokens || 1000);
    res.json({ success: true, generatedText });
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message.includes('API key') || error.message.includes('Invalid API key')) {
        return res.status(401).json({ success: false, error: `LLM API Key Issue: ${error.message}` });
      }
      if (error.message.includes('quota')) {
        return res.status(429).json({ success: false, error: `LLM Quota Exceeded: ${error.message}` });
      }
      if (error.message.includes('model')) {
        return res.status(400).json({ success: false, error: `LLM Model Issue: ${error.message}` });
      }
      if (error.message.includes('context window')) {
        return res.status(413).json({ success: false, error: `Input too long for LLM: ${error.message}` });
      }
      return res.status(500).json({ success: false, error: `Failed to generate text: ${error.message}` });
    }
    return res.status(500).json({ success: false, error: 'An unknown error occurred while generating text' });
  }
}) as express.RequestHandler);


app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});
