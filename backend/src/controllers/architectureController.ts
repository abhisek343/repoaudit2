import { Request, Response } from 'express';
import { ArchitectureAnalysisService, ArchitectureConfig } from '../services/architectureAnalysisService';
import { AIArchitectureConfigManager } from '../config/aiArchitectureConfig';
import { AnalysisResult } from '../types';

export interface ArchitectureAnalysisRequest {
  reportData: AnalysisResult;
  config: ArchitectureConfig;
}

export class ArchitectureController {
  private configManager: AIArchitectureConfigManager;

  constructor() {
    this.configManager = new AIArchitectureConfigManager();
    this.configManager.loadFromEnv();
  }

  async analyzeArchitecture(req: Request, res: Response): Promise<void> {
    try {
      const { reportData, config } = req.body as ArchitectureAnalysisRequest;

      if (!reportData) {
        res.status(400).json({
          error: 'Missing reportData in request body'
        });
        return;
      }

      // Validate configuration
      const validation = this.configManager.validateConfig();
      if (!validation.isValid) {
        res.status(400).json({
          error: 'Invalid configuration',
          details: validation.errors
        });
        return;
      }

      // Create architecture analysis service
      const analysisService = new ArchitectureAnalysisService(config);

      // Generate analysis
      const analysis = await analysisService.analyzeArchitecture(reportData);

      res.json(analysis);

    } catch (error) {
      console.error('Architecture analysis error:', error);
      
      res.status(500).json({
        error: 'Failed to analyze architecture',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getConfig(req: Request, res: Response): Promise<void> {
    try {
      const config = this.configManager.getConfig();
      
      // Don't expose API keys in response
      const safeConfig = {
        ...config,
        gemini: { ...config.gemini, apiKey: config.gemini.apiKey ? '***' : undefined },
        openai: { ...config.openai, apiKey: config.openai.apiKey ? '***' : undefined },
        claude: { ...config.claude, apiKey: config.claude.apiKey ? '***' : undefined }
      };

      res.json(safeConfig);
    } catch (error) {
      console.error('Get config error:', error);
      res.status(500).json({
        error: 'Failed to get configuration',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async updateConfig(req: Request, res: Response): Promise<void> {
    try {
      const updates = req.body;

      if (!updates || typeof updates !== 'object') {
        res.status(400).json({
          error: 'Invalid configuration updates'
        });
        return;
      }

      // Update configuration
      this.configManager.updateConfig(updates);

      // Validate updated configuration
      const validation = this.configManager.validateConfig();
      
      if (!validation.isValid) {
        res.status(400).json({
          error: 'Configuration validation failed',
          details: validation.errors
        });
        return;
      }

      res.json({
        success: true,
        message: 'Configuration updated successfully'
      });

    } catch (error) {
      console.error('Update config error:', error);
      res.status(500).json({
        error: 'Failed to update configuration',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async validateApiKey(req: Request, res: Response): Promise<void> {
    try {
      const { provider, apiKey } = req.body;

      if (!provider || !apiKey) {
        res.status(400).json({
          error: 'Provider and API key are required'
        });
        return;
      }      // Create temporary config for validation
      const defaultModel = provider === 'gemini'
        ? 'gemini-2.5-pro-preview-06-05'
        : provider === 'openai'
        ? 'gpt-4.1'
        : 'claude-sonnet-4-20250514';
      const tempConfig: ArchitectureConfig = {
        enableAI: true,
        llmProvider: provider as 'gemini' | 'openai' | 'claude',
        apiKey,
        model: defaultModel, // Added required model property
        diagramTypes: ['system'] as ('system' | 'component' | 'sequence' | 'class' | 'er')[],
        maxComplexity: 10,
        includeDetails: false
      };

      // Test the API key by creating a service and checking availability
      const analysisService = new ArchitectureAnalysisService(tempConfig);
      
      // This would ideally test the LLM service directly
      // For now, we'll do basic format validation
      let isValid = false;
      
      switch (provider) {
        case 'gemini':
          isValid = apiKey.startsWith('AIza') && apiKey.length > 30;
          break;
        case 'openai':
          isValid = apiKey.startsWith('sk-') && apiKey.length > 40;
          break;
        case 'claude':
          isValid = apiKey.length > 20;
          break;
        default:
          isValid = false;
      }

      res.json({
        valid: isValid,
        provider,
        message: isValid ? 'API key appears valid' : 'API key format is invalid'
      });

    } catch (error) {
      console.error('API key validation error:', error);
      res.status(500).json({
        error: 'Failed to validate API key',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getAvailableProviders(req: Request, res: Response): Promise<void> {
    try {
      const providers = this.configManager.getAvailableProviders();
      
      res.json({
        providers,
        recommended: 'gemini' // Default recommendation
      });

    } catch (error) {
      console.error('Get providers error:', error);
      res.status(500).json({
        error: 'Failed to get available providers',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async exportConfig(req: Request, res: Response): Promise<void> {
    try {
      const configJson = this.configManager.exportConfig();
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="ai-architecture-config-${new Date().toISOString().split('T')[0]}.json"`);
      
      res.send(configJson);

    } catch (error) {
      console.error('Export config error:', error);
      res.status(500).json({
        error: 'Failed to export configuration',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async importConfig(req: Request, res: Response): Promise<void> {
    try {
      const { configJson } = req.body;

      if (!configJson || typeof configJson !== 'string') {
        res.status(400).json({
          error: 'Invalid configuration JSON'
        });
        return;
      }

      // Import configuration
      this.configManager.importConfig(configJson);

      // Validate imported configuration
      const validation = this.configManager.validateConfig();
      
      if (!validation.isValid) {
        res.status(400).json({
          error: 'Imported configuration is invalid',
          details: validation.errors
        });
        return;
      }

      res.json({
        success: true,
        message: 'Configuration imported successfully'
      });

    } catch (error) {
      console.error('Import config error:', error);
      res.status(500).json({
        error: 'Failed to import configuration',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getMermaidConfig(req: Request, res: Response): Promise<void> {
    try {
      const mermaidConfig = this.configManager.getMermaidConfig();
      
      res.json(mermaidConfig);

    } catch (error) {
      console.error('Get Mermaid config error:', error);
      res.status(500).json({
        error: 'Failed to get Mermaid configuration',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  async generateSampleDiagram(req: Request, res: Response): Promise<void> {
    try {
      const typeParam = req.query.type;
      const type = typeof typeParam === 'string' ? typeParam : 'system';

      // Generate a sample diagram based on type
      let sampleCode = '';

      switch (type) {
        case 'system':
          sampleCode = `graph TB
    A[Frontend] --> B[API Gateway]
    B --> C[Backend Services]
    C --> D[Database]
    B --> E[Authentication]
    C --> F[Cache]
    
    classDef frontend fill:#e1f5fe
    classDef backend fill:#f3e5f5
    classDef database fill:#e8f5e8
    
    class A frontend
    class B,C,E backend
    class D,F database`;
          break;

        case 'component':
          sampleCode = `graph LR
    subgraph "User Interface"
        A[React Components]
        B[State Management]
    end
    
    subgraph "Business Logic"
        C[Services]
        D[Utils]
    end
    
    subgraph "Data Layer"
        E[API Client]
        F[Local Storage]
    end
    
    A --> B
    A --> C
    C --> E
    B --> F`;
          break;

        case 'sequence':
          sampleCode = `sequenceDiagram
    participant User
    participant Frontend
    participant API
    participant Database
    
    User->>Frontend: Request Data
    Frontend->>API: HTTP GET /data
    API->>Database: Query
    Database-->>API: Results
    API-->>Frontend: JSON Response
    Frontend-->>User: Display Data`;
          break;

        default:
          sampleCode = `graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Action 1]
    B -->|No| D[Action 2]
    C --> E[End]
    D --> E`;
      }

      res.json({
        type,
        code: sampleCode,
        title: `Sample ${type.charAt(0).toUpperCase() + type.slice(1)} Diagram`,
        description: `Example of a ${type} architecture diagram`
      });

    } catch (error) {
      console.error('Generate sample diagram error:', error);
      res.status(500).json({
        error: 'Failed to generate sample diagram',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
