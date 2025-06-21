import { LLMConfig, FileInfo } from '../types';
import { LLMService } from './llmService';
import * as path from 'path';

export interface ArchitectureConfig {
  llmConfig: LLMConfig;
  enableMermaidGeneration: boolean;
  enableAdvancedAnalysis: boolean;
  maxAnalysisDepth: number;
  customPatterns: string[];
}

export interface ArchitectureComponent {
  id: string;
  name: string;
  type: 'frontend' | 'backend' | 'database' | 'service' | 'api' | 'middleware' | 'config' | 'test' | 'util';
  path: string;
  dependencies: string[];
  files: string[];
  complexity: number;
  description?: string;
}

export interface ArchitectureLayer {
  name: string;
  type: 'presentation' | 'business' | 'data' | 'infrastructure';
  components: ArchitectureComponent[];
}

export interface SystemArchitecture {
  layers: ArchitectureLayer[];
  components: ArchitectureComponent[];
  dependencies: Array<{ from: string; to: string; type: string }>;
  mermaidDiagram: string;
  patterns: string[];
  summary: string;
}

export class ArchitectureAnalysisService {
  private config: ArchitectureConfig;
  private llmService?: LLMService;

  constructor(config: ArchitectureConfig) {
    this.config = config;
    if (config.llmConfig?.apiKey) {
      this.llmService = new LLMService(config.llmConfig);
    }
  }

  async analyzeArchitecture(files: FileInfo[]): Promise<SystemArchitecture> {
    console.log(`[ArchitectureAnalysis] Starting analysis of ${files.length} files`);
    
    // Step 1: Analyze file structure and categorize components
    const components = this.identifyComponents(files);
    
    // Step 2: Analyze dependencies between components
    const dependencies = this.analyzeDependencies(files, components);
    
    // Step 3: Organize into architectural layers
    const layers = this.organizeLayers(components);
    
    // Step 4: Detect architectural patterns
    const patterns = this.detectArchitecturalPatterns(components, files);
    
    // Step 5: Generate Mermaid diagram
    const mermaidDiagram = this.generateMermaidDiagram(layers, dependencies);
    
    // Step 6: Generate summary (with LLM if available, otherwise rule-based)
    const summary = await this.generateArchitectureSummary(components, patterns, dependencies);
    
    console.log(`[ArchitectureAnalysis] Completed: ${components.length} components, ${dependencies.length} dependencies`);
    
    return {
      layers,
      components,
      dependencies,
      mermaidDiagram,
      patterns,
      summary
    };
  }

  private identifyComponents(files: FileInfo[]): ArchitectureComponent[] {
    const components: ArchitectureComponent[] = [];
    const componentMap = new Map<string, ArchitectureComponent>();
    
    // Group files into logical components based on directory structure
    const componentGroups = new Map<string, FileInfo[]>();
    
    for (const file of files) {
      if (!file.content || !this.isSourceFile(file.path)) continue;
      
      const componentPath = this.getComponentPath(file.path);
      if (!componentGroups.has(componentPath)) {
        componentGroups.set(componentPath, []);
      }
      componentGroups.get(componentPath)!.push(file);
    }
    
    // Create components from groups
    for (const [componentPath, componentFiles] of componentGroups) {
      const component: ArchitectureComponent = {
        id: this.sanitizeId(componentPath),
        name: this.getComponentName(componentPath),
        type: this.inferComponentType(componentPath, componentFiles),
        path: componentPath,
        dependencies: [],
        files: componentFiles.map(f => f.path),
        complexity: this.calculateComponentComplexity(componentFiles)
      };
      
      components.push(component);
      componentMap.set(componentPath, component);
    }
    
    return components;
  }

  private getComponentPath(filePath: string): string {
    const parts = filePath.split('/');
    
    // For root files, use file-based grouping
    if (parts.length <= 2) {
      return parts[0] || 'root';
    }
    
    // For nested files, use directory-based grouping
    if (parts.length === 3) {
      return parts.slice(0, 2).join('/');
    }
    
    // For deeply nested files, use first 2-3 meaningful directories
    return parts.slice(0, 3).join('/');
  }

  private getComponentName(componentPath: string): string {
    const parts = componentPath.split('/');
    const lastPart = parts[parts.length - 1];
    
    // Capitalize and format component names
    return lastPart
      .split(/[-_]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private inferComponentType(componentPath: string, files: FileInfo[]): ArchitectureComponent['type'] {
    const pathLower = componentPath.toLowerCase();
    const fileExtensions = files.map(f => path.extname(f.path).toLowerCase());
    
    // Frontend detection
    if (pathLower.includes('frontend') || pathLower.includes('client') || pathLower.includes('ui') || 
        pathLower.includes('components') || pathLower.includes('pages') || pathLower.includes('views')) {
      return 'frontend';
    }
    
    // Backend detection
    if (pathLower.includes('backend') || pathLower.includes('server') || pathLower.includes('api') ||
        pathLower.includes('controllers') || pathLower.includes('routes')) {
      return 'backend';
    }
    
    // Database detection
    if (pathLower.includes('database') || pathLower.includes('db') || pathLower.includes('models') ||
        pathLower.includes('schema') || pathLower.includes('migrations')) {
      return 'database';
    }
    
    // Service detection
    if (pathLower.includes('services') || pathLower.includes('service')) {
      return 'service';
    }
    
    // API detection
    if (pathLower.includes('api') && !pathLower.includes('backend')) {
      return 'api';
    }
    
    // Middleware detection
    if (pathLower.includes('middleware') || pathLower.includes('auth') || pathLower.includes('guards')) {
      return 'middleware';
    }
    
    // Test detection
    if (pathLower.includes('test') || pathLower.includes('spec') || pathLower.includes('__tests__')) {
      return 'test';
    }
    
    // Config detection
    if (pathLower.includes('config') || pathLower.includes('settings') || 
        fileExtensions.some(ext => ['.json', '.yml', '.yaml', '.env'].includes(ext))) {
      return 'config';
    }
    
    // Utility detection
    if (pathLower.includes('utils') || pathLower.includes('helpers') || pathLower.includes('lib')) {
      return 'util';
    }
    
    // Default based on file types
    if (fileExtensions.some(ext => ['.tsx', '.jsx', '.vue', '.svelte'].includes(ext))) {
      return 'frontend';
    }
    
    return 'service'; // Default
  }

  private calculateComponentComplexity(files: FileInfo[]): number {
    let totalComplexity = 0;
    let fileCount = 0;
    
    for (const file of files) {
      if (file.complexity && file.complexity > 0) {
        totalComplexity += file.complexity;
        fileCount++;
      }
    }
    
    return fileCount > 0 ? Math.round(totalComplexity / fileCount) : 1;
  }

  private analyzeDependencies(files: FileInfo[], components: ArchitectureComponent[]): Array<{ from: string; to: string; type: string }> {
    const dependencies: Array<{ from: string; to: string; type: string }> = [];
    const componentLookup = new Map<string, ArchitectureComponent>();
    
    // Create lookup map
    for (const component of components) {
      for (const filePath of component.files) {
        componentLookup.set(filePath, component);
      }
    }
    
    // Analyze imports and dependencies
    for (const file of files) {
      if (!file.content) continue;
      
      const sourceComponent = componentLookup.get(file.path);
      if (!sourceComponent) continue;
      
      const imports = this.extractImports(file.content, file.path);
      
      for (const importPath of imports) {
        const targetComponent = this.findTargetComponent(importPath, file.path, components);
        if (targetComponent && targetComponent.id !== sourceComponent.id) {
          const dependencyType = this.inferDependencyType(importPath, sourceComponent, targetComponent);
          
          // Avoid duplicates
          const existingDep = dependencies.find(d => 
            d.from === sourceComponent.id && d.to === targetComponent.id && d.type === dependencyType
          );
          
          if (!existingDep) {
            dependencies.push({
              from: sourceComponent.id,
              to: targetComponent.id,
              type: dependencyType
            });
          }
        }
      }
    }
    
    return dependencies;
  }

  private extractImports(content: string, filePath: string): string[] {
    const imports: string[] = [];
    const ext = path.extname(filePath).toLowerCase();
    
    // TypeScript/JavaScript imports
    if (['.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
      const importRegex = /(?:import.*from\s+['"`]([^'"`]+)['"`]|require\s*\(\s*['"`]([^'"`]+)['"`]\s*\))/g;
      let match;
      while ((match = importRegex.exec(content)) !== null) {
        imports.push(match[1] || match[2]);
      }
    }
    
    // Python imports
    if (ext === '.py') {
      const importRegex = /(?:from\s+(\S+)\s+import|import\s+(\S+))/g;
      let match;
      while ((match = importRegex.exec(content)) !== null) {
        imports.push(match[1] || match[2]);
      }
    }
    
    // Java imports
    if (ext === '.java') {
      const importRegex = /import\s+([^;]+);/g;
      let match;
      while ((match = importRegex.exec(content)) !== null) {
        imports.push(match[1]);
      }
    }
    
    return imports.filter(imp => imp && !imp.startsWith('.') && !this.isExternalLibrary(imp));
  }

  private findTargetComponent(importPath: string, sourceFilePath: string, components: ArchitectureComponent[]): ArchitectureComponent | undefined {
    // Resolve relative imports
    let resolvedPath = importPath;
    if (importPath.startsWith('./') || importPath.startsWith('../')) {
      const sourceDir = path.dirname(sourceFilePath);
      resolvedPath = path.resolve(sourceDir, importPath).replace(/\\/g, '/');
    }
    
    // Find component that contains this path
    for (const component of components) {
      if (component.files.some(filePath => 
        filePath.includes(resolvedPath) || resolvedPath.includes(component.path)
      )) {
        return component;
      }
    }
    
    return undefined;
  }

  private inferDependencyType(importPath: string, source: ArchitectureComponent, target: ArchitectureComponent): string {
    // API calls
    if (importPath.includes('api') || target.type === 'api') {
      return 'api_call';
    }
    
    // Service dependencies
    if (target.type === 'service') {
      return 'service_call';
    }
    
    // Database access
    if (target.type === 'database') {
      return 'data_access';
    }
    
    // UI component usage
    if (source.type === 'frontend' && target.type === 'frontend') {
      return 'component_usage';
    }
    
    // Configuration
    if (target.type === 'config') {
      return 'configuration';
    }
    
    // Utility usage
    if (target.type === 'util') {
      return 'utility';
    }
    
    return 'import';
  }

  private organizeLayers(components: ArchitectureComponent[]): ArchitectureLayer[] {
    const layers: ArchitectureLayer[] = [
      { name: 'Presentation Layer', type: 'presentation', components: [] },
      { name: 'Business Layer', type: 'business', components: [] },
      { name: 'Data Layer', type: 'data', components: [] },
      { name: 'Infrastructure Layer', type: 'infrastructure', components: [] }
    ];
    
    for (const component of components) {
      switch (component.type) {
        case 'frontend':
          layers[0].components.push(component);
          break;
        case 'backend':
        case 'service':
        case 'api':
          layers[1].components.push(component);
          break;
        case 'database':
          layers[2].components.push(component);
          break;
        case 'middleware':
        case 'config':
        case 'util':
        case 'test':
          layers[3].components.push(component);
          break;
        default:
          layers[1].components.push(component); // Default to business layer
      }
    }
    
    return layers.filter(layer => layer.components.length > 0);
  }

  private detectArchitecturalPatterns(components: ArchitectureComponent[], files: FileInfo[]): string[] {
    const patterns: string[] = [];
    const componentTypes = components.map(c => c.type);
    
    // MVC Pattern
    if (componentTypes.includes('frontend') && componentTypes.includes('backend') && 
        components.some(c => c.path.includes('controllers')) &&
        components.some(c => c.path.includes('models'))) {
      patterns.push('Model-View-Controller (MVC)');
    }
    
    // Microservices Pattern
    if (components.filter(c => c.type === 'service').length >= 3) {
      patterns.push('Microservices Architecture');
    }
    
    // Layered Architecture
    if (componentTypes.includes('frontend') && componentTypes.includes('backend') && 
        componentTypes.includes('database')) {
      patterns.push('Layered Architecture');
    }
    
    // Repository Pattern
    if (components.some(c => c.name.toLowerCase().includes('repository') || 
                           c.path.includes('repositories'))) {
      patterns.push('Repository Pattern');
    }
    
    // API Gateway Pattern
    if (components.some(c => c.path.includes('gateway') || c.path.includes('proxy'))) {
      patterns.push('API Gateway Pattern');
    }
    
    // Component-Based Architecture
    if (components.filter(c => c.type === 'frontend').length >= 5) {
      patterns.push('Component-Based Architecture');
    }
    
    // Event-Driven Architecture
    if (files.some(f => f.content?.includes('event') || f.content?.includes('emit') || 
                        f.content?.includes('listener'))) {
      patterns.push('Event-Driven Architecture');
    }
    
    return patterns.length > 0 ? patterns : ['Modular Architecture'];
  }

  private generateMermaidDiagram(layers: ArchitectureLayer[], dependencies: Array<{ from: string; to: string; type: string }>): string {
    let mermaid = 'graph TB\n';
    
    // Add subgraphs for each layer
    for (const layer of layers) {
      if (layer.components.length === 0) continue;
      
      mermaid += `  subgraph ${layer.name.replace(/\s+/g, '_')}\n`;
      
      for (const component of layer.components) {
        const nodeId = this.sanitizeId(component.id);
        const nodeLabel = component.name;
        const nodeStyle = this.getNodeStyle(component.type);
        
        mermaid += `    ${nodeId}[${nodeLabel}]${nodeStyle}\n`;
      }
      
      mermaid += '  end\n\n';
    }
    
    // Add dependencies
    for (const dep of dependencies) {
      const fromId = this.sanitizeId(dep.from);
      const toId = this.sanitizeId(dep.to);
      const arrowStyle = this.getArrowStyle(dep.type);
      
      mermaid += `  ${fromId} ${arrowStyle} ${toId}\n`;
    }
    
    // Add styling
    mermaid += '\n  classDef frontend fill:#e1f5fe,stroke:#01579b,stroke-width:2px\n';
    mermaid += '  classDef backend fill:#f3e5f5,stroke:#4a148c,stroke-width:2px\n';
    mermaid += '  classDef database fill:#e8f5e8,stroke:#1b5e20,stroke-width:2px\n';
    mermaid += '  classDef service fill:#fff3e0,stroke:#e65100,stroke-width:2px\n';
    mermaid += '  classDef middleware fill:#fce4ec,stroke:#880e4f,stroke-width:2px\n';
    
    return mermaid;
  }

  private getNodeStyle(type: ArchitectureComponent['type']): string {
    switch (type) {
      case 'frontend': return ':::frontend';
      case 'backend': return ':::backend';
      case 'database': return ':::database';
      case 'service': return ':::service';
      case 'middleware': return ':::middleware';
      default: return '';
    }
  }

  private getArrowStyle(dependencyType: string): string {
    switch (dependencyType) {
      case 'api_call': return '-->';
      case 'service_call': return '==>';
      case 'data_access': return '-..->';
      case 'component_usage': return '-.->';
      default: return '-->';
    }
  }

  private async generateArchitectureSummary(
    components: ArchitectureComponent[], 
    patterns: string[], 
    dependencies: Array<{ from: string; to: string; type: string }>
  ): Promise<string> {
    
    if (this.llmService && await this.llmService.isConfigured()) {
      try {
        return await this.generateLLMSummary(components, patterns, dependencies);
      } catch (error) {
        console.warn('[Architecture] LLM summary failed, using rule-based summary:', error);
      }
    }
    
    return this.generateRuleBasedSummary(components, patterns, dependencies);
  }

  private async generateLLMSummary(
    components: ArchitectureComponent[], 
    patterns: string[], 
    dependencies: Array<{ from: string; to: string; type: string }>
  ): Promise<string> {
    const prompt = `Analyze this system architecture and provide a comprehensive summary:

COMPONENTS (${components.length} total):
${components.map(c => `- ${c.name} (${c.type}): ${c.files.length} files, complexity: ${c.complexity}`).join('\n')}

ARCHITECTURAL PATTERNS:
${patterns.join(', ')}

DEPENDENCIES (${dependencies.length} total):
${dependencies.slice(0, 10).map(d => `- ${d.from} ${d.type} ${d.to}`).join('\n')}

Please provide:
1. Overall architecture assessment
2. Key strengths and potential concerns
3. Scalability considerations
4. Maintainability assessment
5. Recommendations for improvement

Keep the response concise but comprehensive (max 500 words).`;

    return await this.llmService!.generateText(prompt);
  }

  private generateRuleBasedSummary(
    components: ArchitectureComponent[], 
    patterns: string[], 
    dependencies: Array<{ from: string; to: string; type: string }>
  ): string {
    const componentsByType = components.reduce((acc, c) => {
      acc[c.type] = (acc[c.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const avgComplexity = components.reduce((sum, c) => sum + c.complexity, 0) / components.length;
    const highComplexityComponents = components.filter(c => c.complexity > 10).length;
    
    let summary = `System Architecture Analysis:\n\n`;
    
    summary += `Architecture Overview:\n`;
    summary += `- Total Components: ${components.length}\n`;
    summary += `- Dependencies: ${dependencies.length}\n`;
    summary += `- Average Complexity: ${avgComplexity.toFixed(1)}\n`;
    summary += `- High Complexity Components: ${highComplexityComponents}\n\n`;
    
    summary += `Component Distribution:\n`;
    Object.entries(componentsByType).forEach(([type, count]) => {
      summary += `- ${type}: ${count} components\n`;
    });
    
    summary += `\nArchitectural Patterns:\n`;
    patterns.forEach(pattern => {
      summary += `- ${pattern}\n`;
    });
    
    summary += `\nAssessment:\n`;
    if (avgComplexity < 5) {
      summary += `- Low complexity indicates good maintainability\n`;
    } else if (avgComplexity > 15) {
      summary += `- High complexity may indicate need for refactoring\n`;
    }
    
    if (components.length > 20) {
      summary += `- Large number of components suggests good modularity\n`;
    }
    
    if (dependencies.length > components.length * 1.5) {
      summary += `- High dependency ratio may indicate tight coupling\n`;
    }
    
    return summary;
  }

  private isSourceFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    const sourceExtensions = ['.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.go', '.rs', '.cs', '.php', '.rb'];
    return sourceExtensions.includes(ext);
  }

  private isExternalLibrary(importPath: string): boolean {
    const externalIndicators = ['node_modules', 'lodash', 'react', 'vue', 'angular', 'express', 'fastapi', 'django'];
    return externalIndicators.some(indicator => importPath.includes(indicator));
  }

  private sanitizeId(id: string): string {
    return id.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^(\d)/, '_$1');
  }

  getConfiguration(): ArchitectureConfig {
    return this.config;
  }
}
