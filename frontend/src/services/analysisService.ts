import { LLMConfig, AnalysisResult } from '../types';

export class AnalysisService {
  private githubToken: string | undefined;
  private llmConfig: LLMConfig | undefined;

  constructor(githubToken?: string, llmConfig?: LLMConfig) {
    this.githubToken = githubToken;
    this.llmConfig = llmConfig;
  }

  analyzeRepository(url: string, progressCallback: (step: string, progress: number) => void): { eventSource: EventSource, analysisPromise: Promise<AnalysisResult> } {
    const params = new URLSearchParams();
    params.append('repoUrl', url);
    if (this.llmConfig) {
      params.append('llmConfig', JSON.stringify(this.llmConfig));
    }
    if (this.githubToken) {
      params.append('githubToken', this.githubToken);
    }

    const eventSource = new EventSource(`/api/analyze?${params.toString()}`);
    
    const analysisPromise = new Promise<AnalysisResult>((resolve, reject) => {
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.step && typeof data.progress === 'number') {
            progressCallback(data.step, data.progress);
          }
        } catch (error) {
          console.error('Failed to parse message data', event.data, error);
        }
      };

      eventSource.addEventListener('complete', (event) => {
        try {
          const result = JSON.parse((event as MessageEvent).data);
          resolve(result);
        } catch (error) {
          reject(new Error('Failed to parse completion data.'));
        } finally {
          eventSource.close();
        }
      });

      eventSource.addEventListener('error', (event) => {
        try {
          if ((event as MessageEvent).data) {
            const errorData = JSON.parse((event as MessageEvent).data);
            reject(new Error(errorData.error || 'An unknown error occurred during analysis.'));
          } else {
            reject(new Error('Analysis failed due to a connection error or server issue.'));
          }
        } catch (error) {
          reject(new Error('Failed to parse error data.'));
        } finally {
          eventSource.close();
        }
      });
    });

    return { eventSource, analysisPromise };
  }
}
