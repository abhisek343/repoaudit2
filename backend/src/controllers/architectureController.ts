import { Request, Response } from 'express';
import { ArchitectureAnalysisService } from '../services/architectureAnalysisService';
import { RedisCacheService } from '../services/redisCacheService';
import type { FileInfo } from '../types';
import { AIArchitectureConfigManager } from '../config/aiArchitectureConfig';
import crypto from 'crypto';

export class ArchitectureController {
  private architectureService: ArchitectureAnalysisService;
  private cacheService: RedisCacheService;
  private configManager: AIArchitectureConfigManager;

  constructor() {
    this.configManager = new AIArchitectureConfigManager();
    this.architectureService = new ArchitectureAnalysisService(this.configManager.getConfig());
    this.cacheService = new RedisCacheService(process.env.REDIS_URL || 'redis://localhost:6379');
  }

  /**
   * Returns raw architecture analysis data without handling HTTP
   */
  async analyzeArchitectureData(files: FileInfo[]) {
    return this.architectureService.analyzeArchitecture(files);
  }

  async analyzeArchitecture(req: Request, res: Response): Promise<void> {
    try {
      const { files } = req.body;
      
      if (!files || !Array.isArray(files)) {
        res.status(400).json({ error: 'Files array is required' });
        return;
      }
      // Generate a hash key for caching
      const hash = crypto.createHash('sha256').update(JSON.stringify(files)).digest('hex');
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
    } catch (error) {
      console.error('Architecture analysis error:', error);
      res.status(500).json({ error: 'Failed to analyze architecture' });
    }
  }

  async getConfiguration(_req: Request, res: Response): Promise<void> {
    try {
      const config = this.configManager.getConfig();
      res.json(config);
    } catch (error) {
      console.error('Config retrieval error:', error);
      res.status(500).json({ error: 'Failed to get configuration' });
    }
  }

  async updateConfiguration(req: Request, res: Response): Promise<void> {
    try {
      const { config } = req.body;
      
      if (!config) {
        res.status(400).json({ error: 'Configuration is required' });
        return;
      }

      this.configManager.updateConfig(config);
      this.architectureService = new ArchitectureAnalysisService(this.configManager.getConfig());
      
      res.json({ message: 'Configuration updated successfully' });
    } catch (error) {
      console.error('Config update error:', error);
      res.status(500).json({ error: 'Failed to update configuration' });
    }
  }

  async exportConfiguration(_req: Request, res: Response): Promise<void> {
    try {
      const configJson = this.configManager.exportConfig();
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="architecture-config.json"');
      res.send(configJson);
    } catch (error) {
      console.error('Config export error:', error);
      res.status(500).json({ error: 'Failed to export configuration' });
    }
  }

  async importConfiguration(req: Request, res: Response): Promise<void> {
    try {
      const { configJson } = req.body;
      
      if (!configJson) {
        res.status(400).json({ error: 'Configuration JSON is required' });
        return;
      }

      const success = this.configManager.importConfig(configJson);
      
      if (success) {
        this.architectureService = new ArchitectureAnalysisService(this.configManager.getConfig());
        res.json({ message: 'Configuration imported successfully' });
      } else {
        res.status(400).json({ error: 'Invalid configuration format' });
      }
    } catch (error) {
      console.error('Config import error:', error);
      res.status(500).json({ error: 'Failed to import configuration' });
    }
  }
}