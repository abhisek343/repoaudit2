"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArchitectureController = void 0;
const architectureAnalysisService_1 = require("../services/architectureAnalysisService");
const redisCacheService_1 = require("../services/redisCacheService");
const aiArchitectureConfig_1 = require("../config/aiArchitectureConfig");
const crypto_1 = __importDefault(require("crypto"));
class ArchitectureController {
    architectureService;
    cacheService;
    configManager;
    constructor() {
        this.configManager = new aiArchitectureConfig_1.AIArchitectureConfigManager();
        this.architectureService = new architectureAnalysisService_1.ArchitectureAnalysisService(this.configManager.getConfig());
        this.cacheService = new redisCacheService_1.RedisCacheService(process.env.REDIS_URL || 'redis://localhost:6379');
    }
    /**
     * Returns raw architecture analysis data without handling HTTP
     */
    async analyzeArchitectureData(files) {
        return this.architectureService.analyzeArchitecture(files);
    }
    async analyzeArchitecture(req, res) {
        try {
            const { files } = req.body;
            if (!files || !Array.isArray(files)) {
                res.status(400).json({ error: 'Files array is required' });
                return;
            }
            // Generate a hash key for caching
            const hash = crypto_1.default.createHash('sha256').update(JSON.stringify(files)).digest('hex');
            const cacheKey = `architecture:${hash}`;
            const cached = await this.cacheService.get(cacheKey);
            if (cached) {
                console.log(`[ArchitectureController] Returning cached result for key ${cacheKey}`);
                res.json(cached);
                return;
            }
            const analysis = await this.architectureService.analyzeArchitecture(files);
            // Cache the result for future requests
            await this.cacheService.set(cacheKey, analysis);
            res.json(analysis);
        }
        catch (error) {
            console.error('Architecture analysis error:', error);
            res.status(500).json({ error: 'Failed to analyze architecture' });
        }
    }
    async getConfiguration(_req, res) {
        try {
            const config = this.configManager.getConfig();
            res.json(config);
        }
        catch (error) {
            console.error('Config retrieval error:', error);
            res.status(500).json({ error: 'Failed to get configuration' });
        }
    }
    async updateConfiguration(req, res) {
        try {
            const { config } = req.body;
            if (!config) {
                res.status(400).json({ error: 'Configuration is required' });
                return;
            }
            this.configManager.updateConfig(config);
            this.architectureService = new architectureAnalysisService_1.ArchitectureAnalysisService(this.configManager.getConfig());
            res.json({ message: 'Configuration updated successfully' });
        }
        catch (error) {
            console.error('Config update error:', error);
            res.status(500).json({ error: 'Failed to update configuration' });
        }
    }
    async exportConfiguration(_req, res) {
        try {
            const configJson = this.configManager.exportConfig();
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', 'attachment; filename="architecture-config.json"');
            res.send(configJson);
        }
        catch (error) {
            console.error('Config export error:', error);
            res.status(500).json({ error: 'Failed to export configuration' });
        }
    }
    async importConfiguration(req, res) {
        try {
            const { configJson } = req.body;
            if (!configJson) {
                res.status(400).json({ error: 'Configuration JSON is required' });
                return;
            }
            const success = this.configManager.importConfig(configJson);
            if (success) {
                this.architectureService = new architectureAnalysisService_1.ArchitectureAnalysisService(this.configManager.getConfig());
                res.json({ message: 'Configuration imported successfully' });
            }
            else {
                res.status(400).json({ error: 'Invalid configuration format' });
            }
        }
        catch (error) {
            console.error('Config import error:', error);
            res.status(500).json({ error: 'Failed to import configuration' });
        }
    }
}
exports.ArchitectureController = ArchitectureController;
