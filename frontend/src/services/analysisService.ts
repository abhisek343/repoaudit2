import { LLMConfig, AnalysisResult, Contributor, FileInfo } from '../types';
import { StorageService } from './storageService';
import { RepositoryArchiveService } from './repositoryArchiveService';

export class AnalysisService {
  private githubToken: string | undefined;
  private llmConfig: LLMConfig | undefined;
  public isCancelled: boolean = false; // Make public for external cancellation
  constructor(githubToken?: string, llmConfig?: LLMConfig) {
    this.githubToken = githubToken;
    this.llmConfig = llmConfig;
  }
  /**
   * Parse repository URL to extract owner, repo, and branch
   */
  public parseRepositoryUrl(repoUrl: string): { owner: string; repo: string; branch: string } {
    // Handle different GitHub URL formats:
    // - https://github.com/owner/repo
    // - https://github.com/owner/repo/tree/branch
    // - https://github.com/owner/repo.git
    
    const url = new URL(repoUrl);
    const pathParts = url.pathname.split('/').filter(part => part.length > 0);
    
    if (pathParts.length < 2) {
      throw new Error('Invalid repository URL format');
    }
    
    const owner = pathParts[0];
    let repo = pathParts[1];
    let branch = 'main'; // Default branch
    
    // Remove .git suffix if present
    if (repo.endsWith('.git')) {
      repo = repo.slice(0, -4);
    }
    
    // Extract branch if URL contains /tree/branch-name
    if (pathParts.length >= 4 && pathParts[2] === 'tree') {
      branch = pathParts[3];
    }
    
    return { owner, repo, branch };
  }

  /**
   * Enhanced repository analysis with archive caching
   * First checks IndexedDB cache, then falls back to backend analysis
   */
  async analyzeRepositoryWithCaching(
    repoUrl: string,
    onProgress: (step: string, progress: number) => void,
    forceRefresh: boolean = false
  ): Promise<AnalysisResult> {
    this.isCancelled = false;
    
    try {
      // Parse repository URL
      const { owner, repo, branch } = this.parseRepositoryUrl(repoUrl);
        // Check for cached archive first (unless forcing refresh)
      if (!forceRefresh) {
        onProgress('Checking cached repository archive...', 5);
        const cachedFiles = await RepositoryArchiveService.getCachedArchive(owner, repo, branch);
        
        if (cachedFiles && cachedFiles.length > 0) {
          onProgress('Found cached repository archive, performing analysis...', 10);
          
          // Use cached files for analysis
          return this.analyzeFromCachedFiles(repoUrl, cachedFiles, onProgress);
        }
      }
        // No cache or force refresh - use backend analysis with archive caching
      onProgress('Downloading repository archive...', 15);
      return this.analyzeRepositoryWithBackend(repoUrl, onProgress);
      
    } catch (error) {
      console.error('Repository analysis failed:', error);
      throw new Error(`Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }  /**
   * Analyze repository using cached files (client-side analysis)
   */
  private async analyzeFromCachedFiles(
    repoUrl: string,
    _cachedFiles: FileInfo[],
    onProgress: (step: string, progress: number) => void
  ): Promise<AnalysisResult> {
    // For now, we'll still use the backend for analysis but we could implement
    // client-side analysis here in the future. The key benefit is that we avoid
    // re-downloading the repository archive.
    
    // We can pass a flag to indicate that we have cached files
    const params = new URLSearchParams();
    params.append('repoUrl', repoUrl);
    params.append('useCachedFiles', 'true'); // Signal backend that files are cached
    
    if (this.llmConfig) {
      params.append('llmConfig', JSON.stringify(this.llmConfig));
    }
    if (this.githubToken) {
      params.append('githubToken', this.githubToken);
    }

    // For now, still use backend analysis
    // TODO: Implement client-side analysis for cached files
    return this.analyzeWithEventSource(params, onProgress);
  }
  /**
   * Analyze repository using backend with archive caching
   */
  private async analyzeRepositoryWithBackend(
    repoUrl: string,
    onProgress: (step: string, progress: number) => void
  ): Promise<AnalysisResult> {
    const params = new URLSearchParams();
    params.append('repoUrl', repoUrl);
    
    if (this.llmConfig) {
      params.append('llmConfig', JSON.stringify(this.llmConfig));
    }
    if (this.githubToken) {
      params.append('githubToken', this.githubToken);
    }

    return this.analyzeWithEventSource(params, onProgress);
  }  /**
   * Common EventSource-based analysis logic
   */
  private async analyzeWithEventSource(
    params: URLSearchParams,
    onProgress: (step: string, progress: number) => void
  ): Promise<AnalysisResult> {
    return new Promise((resolve, reject) => {
      const eventSourceUrl = `/api/analyze?${params.toString()}`;
      const eventSource = new EventSource(eventSourceUrl);
      
      // Extract repo info from the repoUrl parameter for caching
      const repoUrl = params.get('repoUrl');
      let repoInfo: { owner: string; repo: string; branch: string } | null = null;
      if (repoUrl) {
        try {
          repoInfo = this.parseRepositoryUrl(repoUrl);
        } catch (error) {
          console.warn('Failed to parse repository URL for caching:', error);
        }
      }
      
      let retryTimeout: NodeJS.Timeout | null = null;
      let retryCount = 0;
      const maxRetries = 3;

      const cleanup = () => {
        if (retryTimeout) {
          clearTimeout(retryTimeout);
          retryTimeout = null;
        }
        if (eventSource.readyState !== EventSource.CLOSED) {
          eventSource.close();
        }
      };

      // Handle connection open
      eventSource.onopen = () => {
        if (this.isCancelled) {
          cleanup();
          reject(new Error('Analysis cancelled'));
          return;
        }
        retryCount = 0;
      };

      // Handle progress events
      eventSource.addEventListener('progress', (event) => {
        if (this.isCancelled) return;
        
        try {
          const data = JSON.parse((event as MessageEvent).data);
          if (data.step && typeof data.progress === 'number') {
            onProgress(data.step, data.progress);
          }
        } catch (error) {
          console.error('Error parsing progress event:', error);
        }
      });

      // Handle completion events
      eventSource.addEventListener('complete', async (event) => {
        if (this.isCancelled) {
          cleanup();
          reject(new Error('Analysis cancelled'));
          return;
        }
        
        try {
          const result = JSON.parse((event as MessageEvent).data) as Partial<AnalysisResult>;
          onProgress('Analysis complete!', 100);
          cleanup();
          
          const finalResult = this.ensureDefaults(result, params.get('repoUrl') || '');
          
          if (!this.validateAnalysisResult(finalResult)) {
            reject(new Error('Invalid analysis result received from backend'));
            return;
          }

          // Cache the repository archive if we have the files and repo info
          if (repoInfo && finalResult.files && finalResult.files.length > 0) {
            try {
              await RepositoryArchiveService.storeArchive(
                repoInfo.owner,
                repoInfo.repo,
                repoInfo.branch,
                finalResult.files
              );
              console.log(`Cached repository archive for ${repoInfo.owner}/${repoInfo.repo}@${repoInfo.branch}`);
            } catch (error) {
              console.warn('Failed to cache repository archive:', error);
              // Continue with analysis even if caching fails
            }
          }
          
          // Store analysis result
          try {
            await StorageService.storeAnalysisResult(finalResult);
            resolve(finalResult);
          } catch (error) {
            console.error('Failed to store analysis result:', error);
            resolve(finalResult); // Still resolve with result
          }
        } catch (error) {
          console.error('Error parsing completion event:', error);
          reject(new Error('Failed to parse analysis result'));
        }
      });      // Handle error events
      eventSource.addEventListener('error', () => {
        if (this.isCancelled) {
          cleanup();
          reject(new Error('Analysis cancelled'));
          return;
        }

        if (eventSource.readyState === EventSource.CLOSED) {
          if (retryCount < maxRetries) {
            retryCount++;
            retryTimeout = setTimeout(() => {
              const newEventSource = new EventSource(eventSourceUrl);
              Object.assign(eventSource, newEventSource);
            }, Math.pow(2, retryCount) * 1000);
          } else {
            cleanup();
            reject(new Error('Connection failed after maximum retries'));
          }
        }
      });

      // Handle explicit error messages
      eventSource.addEventListener('error-message', (event) => {
        if (this.isCancelled) {
          cleanup();
          reject(new Error('Analysis cancelled'));
          return;
        }
        
        try {
          const data = JSON.parse((event as MessageEvent).data);
          cleanup();
          reject(new Error(data.error || 'Unknown error occurred'));
        } catch {
          reject(new Error('Failed to parse error message'));
        }
      });
    });
  }
  
  analyzeRepository(
    repoUrl: string,
    onProgress: (step: string, progress: number) => void,
  ): { eventSource: EventSource; analysisPromise: Promise<AnalysisResult>; cancel: () => void } {
    this.isCancelled = false;
    const params = new URLSearchParams();
    params.append('repoUrl', repoUrl);
    
    if (this.llmConfig) {
        if (process.env.NODE_ENV === 'development') {
          console.log('Sending LLM config to backend:', this.llmConfig);
        }
        params.append('llmConfig', JSON.stringify(this.llmConfig));
    }
    if (this.githubToken) {
      params.append('githubToken', this.githubToken);
    }

    const eventSourceUrl = `/api/analyze?${params.toString()}`;
    if (process.env.NODE_ENV === 'development') {
      console.log('🔗 Creating EventSource with URL:', eventSourceUrl);
    }

    const eventSource = new EventSource(eventSourceUrl);
    
    if (process.env.NODE_ENV === 'development') {
      console.log('🔗 EventSource created with readyState:', eventSource.readyState);
      console.log('🔗 EventSource CONNECTING =', EventSource.CONNECTING);
      console.log('🔗 EventSource OPEN =', EventSource.OPEN);
      console.log('🔗 EventSource CLOSED =', EventSource.CLOSED);
    }

    let retryTimeout: NodeJS.Timeout | null = null;    const cleanup = () => {
      if (retryTimeout) {
        clearTimeout(retryTimeout);
        retryTimeout = null;
      }
      if (eventSource.readyState !== EventSource.CLOSED) {
        console.log('Closing EventSource connection');
        eventSource.close();
      }
    };

    const cancel = () => {
      console.log('Analysis cancelled by user');
      this.isCancelled = true;
      cleanup();
    };

    const analysisPromise = new Promise<AnalysisResult>((resolve, reject) => {      
      let retryCount = 0;
      const maxRetries = 3;      // Handle connection open
      eventSource.onopen = () => {
        if (this.isCancelled) {
          cleanup();
          reject(new Error('Analysis cancelled'));
          return;
        }
        if (process.env.NODE_ENV === 'development') {
          console.log('🔗 SSE Connection established, readyState:', eventSource.readyState);
        }
        retryCount = 0;
      };      // Handle explicit 'progress' events
      eventSource.addEventListener('progress', (event) => {
        if (process.env.NODE_ENV === 'development') {
          console.log('📈 Raw progress event received:', event);
          console.log('📈 Event data:', (event as MessageEvent).data);
        }
        
        if (this.isCancelled) {
          if (process.env.NODE_ENV === 'development') {
            console.log('Progress event received but analysis was cancelled, ignoring');
          }
          return;
        }
        try {
          const data = JSON.parse((event as MessageEvent).data);
          if (process.env.NODE_ENV === 'development') {
            console.log('📈 Parsed progress data:', data);
          }
          if (data.step && typeof data.progress === 'number') {
            if (process.env.NODE_ENV === 'development') {
              console.log(`🔄 Calling onProgress: ${data.step} - ${data.progress}%`);
            }
            onProgress(data.step, data.progress);
          } else {
            if (process.env.NODE_ENV === 'development') {
              console.warn('📈 Progress event missing step or progress:', data);
            }
          }
        } catch (error) {
          console.error('Error parsing progress event:', error);
        }
      });      // Also handle generic 'message' events as fallback for progress
      eventSource.onmessage = (event) => {
        if (process.env.NODE_ENV === 'development') {
          console.log('📨 Generic message event received:', event);
          console.log('📨 Message data:', event.data);
        }
        
        if (this.isCancelled) return;
        
        try {
          const data = JSON.parse(event.data);
          // Handle progress events that might come through onmessage
          if (data.step && typeof data.progress === 'number') {
            if (process.env.NODE_ENV === 'development') {
              console.log('📈 Progress via onmessage fallback:', data);
            }
            onProgress(data.step, data.progress);
          }
        } catch {
          // Ignore parse errors for non-JSON messages
          if (process.env.NODE_ENV === 'development') {
            console.log('📨 Non-JSON message ignored:', event.data);
          }
        }
      };

      // Handle completion events
      eventSource.addEventListener('complete', (event) => {
        if (this.isCancelled) {
          cleanup();
          reject(new Error('Analysis cancelled'));
          return;
        }
        try {
          const result = JSON.parse((event as MessageEvent).data) as Partial<AnalysisResult>;
          console.log('Received analysis result from backend:', {
            id: result.id,
            repositoryUrl: result.repositoryUrl,
            hasMetrics: !!result.metrics,
            hasFiles: !!result.files && result.files.length > 0,
            hasContributors: !!result.contributors && result.contributors.length > 0,
            dataKeys: Object.keys(result)
          });
          
          onProgress('Analysis complete!', 100);
          cleanup();
          
          const finalResult = this.ensureDefaults(result, repoUrl);
          
          // Add additional validation before persisting
          if (!this.validateAnalysisResult(finalResult)) {
            console.error('Analysis result validation failed:', finalResult);
            reject(new Error('Invalid analysis result received from backend'));
            return;
          }
          
          // Persist to storage (IndexedDB) with error handling
          StorageService.storeAnalysisResult(finalResult).then(() => {
            console.log('Analysis result successfully stored to IndexedDB');
            
            // Log any warnings from the backend
            if (finalResult.analysisWarnings && finalResult.analysisWarnings.length > 0) {
              console.warn('Analysis completed with warnings from the backend:');
              finalResult.analysisWarnings.forEach(warning => {
                console.warn(`[${warning.step}]: ${warning.message}`, warning.error || '');
              });
            }

            resolve(finalResult);
          }).catch(e => {
            console.error('Failed to store analysis result:', e);
            // Still resolve with the result even if storage fails
            console.warn('Continuing with analysis result despite storage failure');
            resolve(finalResult);
          });
        } catch (error) {
          console.error('Error parsing completion event:', error);
          reject(new Error('Failed to parse analysis result'));
        }
      });      // Handle error events
      eventSource.addEventListener('error', (event) => {
        if (process.env.NODE_ENV === 'development') {
          console.log('❌ SSE Error event received:', event);
          console.log('❌ EventSource readyState:', eventSource.readyState);
          console.log('❌ EventSource url:', eventSource.url);
        }
        
        if (this.isCancelled) {
          cleanup();
          reject(new Error('Analysis cancelled'));
          return;
        }

        const error = event as MessageEvent;
        console.error('SSE Error:', error);
        
        if (eventSource.readyState === EventSource.CLOSED) {
          console.error('EventSource connection closed');
          if (retryCount < maxRetries) {
            retryCount++;
            console.log(`Attempting to reconnect (${retryCount}/${maxRetries})`);
            // Wait for exponential backoff before retrying
            cleanup(); // Clean up any existing retry timeout
            retryTimeout = setTimeout(() => {
              const newEventSource = new EventSource(eventSourceUrl);
              Object.assign(eventSource, newEventSource);
            }, Math.pow(2, retryCount) * 1000);
          } else {
            cleanup();
            reject(new Error('Connection failed after maximum retries'));
          }
        }
      });

      // Handle explicit error messages from server
      eventSource.addEventListener('error-message', (event) => {
        if (this.isCancelled) {
          cleanup();
          reject(new Error('Analysis cancelled'));
          return;
        }
        try {
          const data = JSON.parse((event as MessageEvent).data);
          cleanup();
          reject(new Error(data.error || 'Unknown error occurred'));        } catch {
          reject(new Error('Failed to parse error message'));
        }
      });

      // Handle generic EventSource errors (connection issues, etc.)
      eventSource.onerror = (event) => {
        if (process.env.NODE_ENV === 'development') {
          console.error('🚨 EventSource error occurred:', event);
          console.log('🚨 EventSource readyState:', eventSource.readyState);
          console.log('🚨 EventSource CONNECTING:', EventSource.CONNECTING);
          console.log('🚨 EventSource OPEN:', EventSource.OPEN);
          console.log('🚨 EventSource CLOSED:', EventSource.CLOSED);
        }
      };
    });

    return { eventSource, analysisPromise, cancel };
  }

  // Test method to verify EventSource connection
  testEventSource(): void {
    if (process.env.NODE_ENV === 'development') {
      console.log('🧪 Testing EventSource connection...');
      const testUrl = '/api/analyze?repoUrl=https://github.com/test/test';
      const testEventSource = new EventSource(testUrl);
      
      testEventSource.onopen = () => {
        console.log('🧪 Test EventSource connected successfully');
        testEventSource.close();
      };
      
      testEventSource.onerror = (error) => {
        console.error('🧪 Test EventSource failed:', error);
        console.error('🧪 Test EventSource readyState:', testEventSource.readyState);
        testEventSource.close();
      };
      
      testEventSource.onmessage = (event) => {
        console.log('🧪 Test EventSource received message:', event.data);
      };
      
      // Close after 5 seconds
      setTimeout(() => {
        if (testEventSource.readyState !== EventSource.CLOSED) {
          console.log('🧪 Closing test EventSource');
          testEventSource.close();
        }
      }, 5000);
    }
  }

  // Add validation method to ensure data integrity
  private validateAnalysisResult(result: AnalysisResult): boolean {
    try {
      // Check required fields
      if (!result.id || !result.repositoryUrl || !result.createdAt) {
        console.error('Missing required fields:', { id: result.id, repositoryUrl: result.repositoryUrl, createdAt: result.createdAt });
        return false;
      }

      // Check that basic info exists
      if (!result.basicInfo || !result.repository) {
        console.error('Missing basicInfo or repository data');
        return false;
      }

      // Check that metrics exist
      if (!result.metrics) {
        console.error('Missing metrics data');
        return false;
      }      // Check that arrays are actually arrays
      const arrayFields: (keyof AnalysisResult)[] = ['files', 'commits', 'contributors', 'hotspots', 'securityIssues', 'technicalDebt', 'performanceMetrics', 'keyFunctions', 'apiEndpoints'];
      for (const field of arrayFields) {
        if (result[field] && !Array.isArray(result[field])) {
          console.error(`Field ${field} should be an array but is:`, typeof result[field]);
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Error validating analysis result:', error);
      return false;
    }
  }

  // Add methods for persistence using StorageService
  // Retrieve the latest analysis result from storage (async)
  async getLastAnalysisResult(): Promise<AnalysisResult | null> {
    return await StorageService.getLatestAnalysisResult();
  }

  // Clear all stored analysis results
  async clearAnalysisResult(): Promise<void> {
    await StorageService.clearAllResults();
  }

  private ensureDefaults(result: Partial<AnalysisResult>, repoUrl: string): AnalysisResult {
    const now = new Date().toISOString();

    // console.log('[ensureDefaults] Input result from server (keys):', Object.keys(result));
    // if (result.metrics) {
    //   console.log('[ensureDefaults] Input result.metrics (keys):', Object.keys(result.metrics));
    // }
    // if (result.basicInfo) {
    //   console.log('[ensureDefaults] Input result.basicInfo (keys):', Object.keys(result.basicInfo));
    // }
    // if (result.repository) {
    //   console.log('[ensureDefaults] Input result.repository (keys):', Object.keys(result.repository));
    // }

    const defaultOwner: Contributor = {
      login: 'unknown',
      id: 0,
      node_id: 'unknown',
      avatar_url: '',
      avatarUrl: '', // Ensure this is present as it's required by Contributor type
      html_url: '',
      name: 'Unknown Owner',
      email: null,
      contributions: 0,
    };

    const defaults: AnalysisResult = {
      id: `local-${Date.now()}`,
      repositoryUrl: repoUrl,
      createdAt: now,
      basicInfo: {
        name: 'Unknown Repo',
        fullName: repoUrl.split('/').slice(-2).join('/') || 'unknown/unknown',
        description: '',
        language: 'Unknown',
        stars: 0,
        forks: 0,
        watchers: 0,
        createdAt: now,
        updatedAt: now,
        defaultBranch: 'main',
        size: 0,
        openIssues: 0,
        hasWiki: false,
        hasPages: false,
        url: repoUrl,
        owner: repoUrl.split('/').slice(-2,-1)[0] || 'unknown',
      },
      repository: { // Matches RepositoryData type
        id: 0, // Required by RepositoryData
        node_id: 'N/A',
        name: 'Unknown Repo',
        full_name: repoUrl.split('/').slice(-2).join('/') || 'unknown/unknown',
        private: false,
        owner: defaultOwner, // Required by RepositoryData
        html_url: repoUrl,
        description: null,
        fork: false,
        url: repoUrl,
        languages_url: '',
        default_branch: 'main',
        stargazers_count: 0,
        watchers_count: 0,
        forks_count: 0,
        open_issues_count: 0,
        created_at: now,
        updated_at: now,
        pushed_at: now,
        size: 0,
      },
      metrics: {
        linesOfCode: 0,
        totalCommits: 0,
        totalContributors: 0,
        fileCount: 0,
        codeQuality: 0,
        testCoverage: 0,
        busFactor: 0,
        securityScore: 0,
        technicalDebtScore: 0,
        performanceScore: 0,
        criticalVulnerabilities: 0,
        highVulnerabilities: 0,
        mediumVulnerabilities: 0,
        lowVulnerabilities: 0,
      },
      aiSummary: 'AI summary could not be generated.',
      advancedAnalysis: { /* Default for AdvancedAnalysisResult */ },
      files: [],
      dependencies: { nodes: [], links: [] }, // Matches ArchitectureData
      commits: [],
      contributors: [],
      hotspots: [],
      securityIssues: [],
      technicalDebt: [],
      performanceMetrics: [],
      keyFunctions: [],
      apiEndpoints: [],
      languages: {},
      dependencyGraph: { nodes: [], links: [] }, // Matches ArchitectureData
      qualityMetrics: {},
      architectureAnalysis: '',
      analysisWarnings: [],
      dependencyWheelData: [],
      fileSystemTree: { name: 'root', path: '/', size: 0, type: 'directory', children: [] },
      churnSunburstData: { name: 'root', path: '/', type: 'directory', churnRate: 0, children: [] },
      contributorStreamData: [],
    };    const finalResultObject: AnalysisResult = {
      ...defaults,
      ...(result || {}),
      id: result?.id || defaults.id,
      repositoryUrl: result?.repositoryUrl || repoUrl,
      createdAt: result?.createdAt || now,
      aiSummary: result?.aiSummary ?? defaults.aiSummary,
      basicInfo: {
        ...defaults.basicInfo,
        ...(result?.basicInfo || {}),
      },      repository: { 
        ...defaults.repository,
        ...(result?.repository || {})
      } as typeof defaults.repository,
      metrics: {
        ...defaults.metrics,
        ...(result?.metrics || {}),
      },
      files: result?.files || [],
      commits: result?.commits || [],
      contributors: result?.contributors || [],
      hotspots: result?.hotspots || [],
      securityIssues: result?.securityIssues || [],
      technicalDebt: result?.technicalDebt || [],
      performanceMetrics: result?.performanceMetrics || [],
      keyFunctions: result?.keyFunctions || [],
      apiEndpoints: result?.apiEndpoints || [],
      languages: result?.languages || {},
      dependencyGraph: result?.dependencyGraph || { nodes: [], links: [] },
      qualityMetrics: result?.qualityMetrics || {},
      architectureAnalysis: result?.architectureAnalysis || '',
      analysisWarnings: result?.analysisWarnings || [],
      dependencyWheelData: result?.dependencyWheelData || [],
      fileSystemTree: result?.fileSystemTree || { name: 'root', path: '/', size: 0, type: 'directory', children: [] },
      churnSunburstData: result?.churnSunburstData || { name: 'root', path: '/', type: 'directory', churnRate: 0, children: [] },
      contributorStreamData: result?.contributorStreamData || [],
    };

    return finalResultObject;
  }
}
