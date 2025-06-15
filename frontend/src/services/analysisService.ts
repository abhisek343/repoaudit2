import { LLMConfig, AnalysisResult, Contributor, ArchitectureData, BasicRepositoryInfo, RepositoryData, FileInfo, ProcessedCommit, Hotspot, SecurityIssue, TechnicalDebtItem, PerformanceMetric, KeyFunction, APIEndpoint, QualityMetrics, AnalysisWarning } from '../types';
import { ChurnNode, FileNode } from '../types/advanced'; // Ensure ChurnNode and FileNode are imported
import { StorageService } from './storageService';

export class AnalysisService {
  private githubToken: string | undefined;
  private llmConfig: LLMConfig | undefined;

  constructor(githubToken?: string, llmConfig?: LLMConfig) {
    this.githubToken = githubToken;
    this.llmConfig = llmConfig;
  }
  
  analyzeRepository(
    repoUrl: string,
    onProgress: (step: string, progress: number) => void,
  ): { eventSource: EventSource; analysisPromise: Promise<AnalysisResult> } {
    const params = new URLSearchParams();
    params.append('repoUrl', repoUrl);
    
    if (this.llmConfig) {
        console.log('Sending LLM config to backend:', this.llmConfig); // ADD THIS DEBUG
        params.append('llmConfig', JSON.stringify(this.llmConfig));
    }
    if (this.githubToken) {
      params.append('githubToken', this.githubToken);
    }

    const eventSource = new EventSource(`/api/analyze?${params.toString()}`);
    
    const analysisPromise = new Promise<AnalysisResult>((resolve, reject) => {
      // Add a timeout to help debug hanging requests
      const timeout = setTimeout(() => {
        console.log('Analysis timeout - closing EventSource');
        eventSource.close();
        reject(new Error('Analysis timed out after 5 minutes'));
      }, 5 * 60 * 1000); // 5 minutes
      
      eventSource.onopen = () => {
        console.log('EventSource connection opened');
      };
      
      eventSource.onmessage = (event) => {
        console.log('Received SSE message:', { 
          type: event.type, 
          data: event.data,
          lastEventId: event.lastEventId,
          origin: event.origin 
        });
        try {
          const data = JSON.parse(event.data);
          console.log('Parsed message data:', data);
          if (data.step && typeof data.progress === 'number') {
            onProgress(data.step, data.progress);
          }
        } catch (error) {
          console.error('Failed to parse message data', event.data, error);
        }
      };

      eventSource.addEventListener('complete', async event => {
        console.log('🎉 COMPLETE EVENT RECEIVED!', event);
        try {
          clearTimeout(timeout); // Clear timeout on success
          console.log('Received complete event data:', (event as MessageEvent).data);
          const result = JSON.parse((event as MessageEvent).data) as Partial<AnalysisResult>;
          onProgress('Analysis complete!', 100);
          eventSource.close();
          
          const finalResult = this.ensureDefaults(result, repoUrl);
          
          // Persist to storage (IndexedDB)
          await StorageService.storeAnalysisResult(finalResult);
          
          // Log any warnings from the backend
          if (finalResult.analysisWarnings && finalResult.analysisWarnings.length > 0) {
            console.warn('Analysis completed with warnings from the backend:');
            finalResult.analysisWarnings.forEach(warning => {
              console.warn(`[${warning.step}]: ${warning.message}`, warning.error || '');
            });
          }

          resolve(finalResult);
        } catch (e) {
          clearTimeout(timeout); // Clear timeout on error too
          console.error('Failed to parse complete message:', e);
          console.error('Event data:', (event as MessageEvent).data);
          eventSource.close();
          reject(new Error('Failed to parse final analysis result.'));
        }
      });

      eventSource.addEventListener('error', (event) => {
        clearTimeout(timeout); // Clear timeout on error
        console.error('EventSource error:', event);
        console.log('EventSource readyState:', eventSource.readyState);
        console.log('Error event data:', (event as MessageEvent).data); // Log event.data
        try {
          if ((event as MessageEvent).data) {
            const errorData = JSON.parse((event as MessageEvent).data);
            reject(new Error(errorData.error || 'An unknown error occurred during analysis.'));
          } else {
            reject(new Error('Analysis failed due to a connection error or server issue.'));
          }
        } catch {
          reject(new Error('Failed to parse error data.'));
        } finally {
          eventSource.close();
        }
      });
    });

    return { eventSource, analysisPromise };
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
      churnSunburstData: { name: 'root', path: '/', type: 'directory', children: [], churnRate: 0 }, // Added churnRate
      contributorStreamData: [],
    };

    const finalResultObject: AnalysisResult = {
      ...defaults,
      ...(result || {}),

      id: result?.id || defaults.id,
      repositoryUrl: result?.repositoryUrl || repoUrl,
      createdAt: result?.createdAt || now,
      aiSummary: result?.aiSummary ?? defaults.aiSummary,

      basicInfo: {
        ...defaults.basicInfo,
        ...(result?.basicInfo || {}),
      } as BasicRepositoryInfo, // Ensure type
      repository: { 
        ...defaults.repository,
        ...(result?.repository || {}),
        owner: result?.repository?.owner || defaults.repository?.owner || defaultOwner,
      } as RepositoryData, // Ensure type, especially for id and owner
      metrics: {
        ...defaults.metrics,
        ...(result?.metrics || {}),
        fileCount: result?.files?.length ?? result?.metrics?.fileCount ?? defaults.metrics.fileCount,
      } as AnalysisResult['metrics'], // Ensure type
      dependencies: { 
        ...(defaults.dependencies as ArchitectureData),
        ...(result?.dependencies || {}),
        nodes: result?.dependencies?.nodes || (defaults.dependencies as ArchitectureData).nodes || [],
        links: result?.dependencies?.links || (defaults.dependencies as ArchitectureData).links || [],
      } as ArchitectureData,
      dependencyGraph: {
        ...(defaults.dependencyGraph as ArchitectureData),
        ...(result?.dependencyGraph || {}),
        nodes: result?.dependencyGraph?.nodes || (defaults.dependencyGraph as ArchitectureData).nodes || [],
        links: result?.dependencyGraph?.links || (defaults.dependencyGraph as ArchitectureData).links || [],
      } as ArchitectureData,
      qualityMetrics: {
        ...defaults.qualityMetrics,
        ...(result?.qualityMetrics || {}),
      } as QualityMetrics,
      languages: {
        ...defaults.languages,
        ...(result?.languages || {}),
      },
      advancedAnalysis: {
        // ...defaults.advancedAnalysis, // This might be too generic if advancedAnalysis has required fields
        ...(result?.advancedAnalysis || {}), // For now, keep it simple, ensure it's an object
      },
      files: result?.files || defaults.files as FileInfo[],
      commits: result?.commits || defaults.commits as ProcessedCommit[],
      contributors: result?.contributors || defaults.contributors as Contributor[],
      hotspots: result?.hotspots || defaults.hotspots as Hotspot[],
      securityIssues: result?.securityIssues || defaults.securityIssues as SecurityIssue[],
      technicalDebt: result?.technicalDebt || defaults.technicalDebt as TechnicalDebtItem[],
      performanceMetrics: result?.performanceMetrics || defaults.performanceMetrics as PerformanceMetric[],
      keyFunctions: result?.keyFunctions || defaults.keyFunctions as KeyFunction[],
      apiEndpoints: result?.apiEndpoints || defaults.apiEndpoints as APIEndpoint[],
      analysisWarnings: result?.analysisWarnings || defaults.analysisWarnings as AnalysisWarning[],
      
      dependencyWheelData: result?.dependencyWheelData || defaults.dependencyWheelData as Array<{ source: string; target: string; value: number }>,
      fileSystemTree: result?.fileSystemTree || defaults.fileSystemTree as FileNode,
      churnSunburstData: result?.churnSunburstData || defaults.churnSunburstData as ChurnNode,
      contributorStreamData: result?.contributorStreamData || defaults.contributorStreamData as Array<{ date: string; contributors: Record<string, number> }>,
    };
    
    // console.log('[ensureDefaults] Final merged result object (id):', finalResultObject.id);

    return finalResultObject;
  }
}
