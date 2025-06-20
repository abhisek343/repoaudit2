import { ArchitectureConfig } from '../services/architectureAnalysisService';

export class AIArchitectureConfigManager {
  private config: ArchitectureConfig;

  constructor() {
    this.config = {
      llmConfig: {
        provider: 'openai',
        apiKey: '',
        model: 'gpt-3.5-turbo'
      },
      enableMermaidGeneration: true,
      enableAdvancedAnalysis: true,
      maxAnalysisDepth: 5,
      customPatterns: []
    };
  }

  getConfig(): ArchitectureConfig {
    return this.config;
  }

  updateConfig(newConfig: Partial<ArchitectureConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  validateConfig(config: ArchitectureConfig): boolean {
    return !!(config.llmConfig?.provider && config.llmConfig?.apiKey);
  }

  exportConfig(): string {
    return JSON.stringify(this.config, null, 2);
  }

  importConfig(configJson: string): boolean {
    try {
      const parsed = JSON.parse(configJson);
      if (this.validateConfig(parsed)) {
        this.config = parsed;
        return true;
      }
    } catch {
      return false;
    }
    return false;
  }
}
