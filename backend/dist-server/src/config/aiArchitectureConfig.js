"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIArchitectureConfigManager = void 0;
class AIArchitectureConfigManager {
    config;
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
    getConfig() {
        return this.config;
    }
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }
    validateConfig(config) {
        return !!(config.llmConfig?.provider && config.llmConfig?.apiKey);
    }
    exportConfig() {
        return JSON.stringify(this.config, null, 2);
    }
    importConfig(configJson) {
        try {
            const parsed = JSON.parse(configJson);
            if (this.validateConfig(parsed)) {
                this.config = parsed;
                return true;
            }
        }
        catch {
            return false;
        }
        return false;
    }
}
exports.AIArchitectureConfigManager = AIArchitectureConfigManager;
