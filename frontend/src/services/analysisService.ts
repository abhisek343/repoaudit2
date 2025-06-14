import { LLMConfig, AnalysisResult } from '../types';
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
    
    console.log('[ensureDefaults] Input result from server:', JSON.parse(JSON.stringify(result)));

    const finalResult: AnalysisResult = {
      id: result.id || `local-${Date.now()}`,
      repositoryUrl: result.repositoryUrl || repoUrl,
      createdAt: result.createdAt || now,
      
      basicInfo: {
        fullName: result.basicInfo?.fullName || repoUrl.split('/').slice(-2).join('/'),
        description: result.basicInfo?.description || '',
        language: result.basicInfo?.language || 'Unknown',
        stars: result.basicInfo?.stars || 0,
        forks: result.basicInfo?.forks || 0,
        createdAt: result.basicInfo?.createdAt || now,
        updatedAt: result.basicInfo?.updatedAt || now,
        defaultBranch: result.basicInfo?.defaultBranch || 'main',
      },
      
      metrics: {
        linesOfCode: result.metrics?.linesOfCode || 0,
        totalCommits: result.metrics?.totalCommits || 0,
        totalContributors: result.metrics?.totalContributors || 0,
        fileCount: result.metrics?.fileCount || result.files?.length || 0,
        criticalVulnerabilities: result.metrics?.criticalVulnerabilities || 0,
        highVulnerabilities: result.metrics?.highVulnerabilities || 0,
        mediumVulnerabilities: result.metrics?.mediumVulnerabilities || 0,
        lowVulnerabilities: result.metrics?.lowVulnerabilities || 0,
      },
      
      commits: result.commits || [],
      files: result.files || [],
      
      dependencies: result.dependencies || { nodes: [], links: [] },
      contributors: result.contributors || [],
      hotspots: result.hotspots || [],
      architectureAnalysis: result.architectureAnalysis || '',
      securityIssues: result.securityIssues || [],
      aiSummary: result.aiSummary || 'AI summary could not be generated.',
      advancedAnalysis: result.advancedAnalysis || {},
    };
    
    console.log('[ensureDefaults] Final merged result object:', JSON.parse(JSON.stringify(finalResult)));
    return finalResult;
  }
}
