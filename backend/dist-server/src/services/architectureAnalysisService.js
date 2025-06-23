"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArchitectureAnalysisService = void 0;
const llmService_1 = require("./llmService");
const path = __importStar(require("path"));
class ArchitectureAnalysisService {
    config;
    llmService;
    constructor(config) {
        this.config = config;
        if (config.llmConfig?.apiKey) {
            this.llmService = new llmService_1.LLMService(config.llmConfig);
        }
    }
    async analyzeArchitecture(files) {
        // Process more files for a more comprehensive analysis
        console.log(`[Architecture Analysis] Processing ${files.length} files`);
        try {
            // Filter out irrelevant files
            const relevantFiles = files.filter(file => this.isSourceFile(file.path) &&
                !file.path.includes('node_modules') &&
                !file.path.includes('dist') &&
                !file.path.includes('.git'));
            console.log(`[Architecture Analysis] Found ${relevantFiles.length} relevant source files`);
            // Step 1: Identify components - now with better component detection
            const components = this.identifyComponents(relevantFiles);
            console.log(`[Architecture Analysis] Identified ${components.length} components`);
            // Step 2: Analyze dependencies between components - improved detection
            const dependencies = this.analyzeDependencies(relevantFiles, components);
            console.log(`[Architecture Analysis] Identified ${dependencies.length} dependencies between components`);
            // Step 3: Organize components into layers
            const layers = this.organizeLayers(components);
            console.log(`[Architecture Analysis] Organized components into ${layers.length} layers`);
            // Step 4: Detect architectural patterns
            const patterns = this.detectArchitecturalPatterns(components, relevantFiles);
            console.log(`[Architecture Analysis] Detected ${patterns.length} architectural patterns`);
            // Step 5: Generate Mermaid diagram
            const mermaidDiagram = this.generateMermaidDiagram(layers, dependencies);
            console.log(`[Architecture Analysis] Generated Mermaid diagram (${mermaidDiagram.length} chars)`);
            // Step 6: Generate architecture summary
            const summary = await this.generateArchitectureSummary(components, patterns, dependencies);
            console.log(`[Architecture Analysis] Generated architecture summary (${summary.length} chars)`);
            // Return the results
            return {
                layers,
                components,
                dependencies,
                patterns,
                mermaidDiagram,
                summary
            };
        }
        catch (error) {
            console.error('[Architecture Analysis] Error:', error);
            // Provide a graceful fallback
            return this.createFallbackArchitecture(files);
        }
    }
    createFallbackArchitecture(files) {
        console.log('[Architecture Analysis] Creating fallback architecture');
        // Create basic components based on directory structure
        const directoryMap = new Map();
        files.forEach(file => {
            const dirPath = path.dirname(file.path);
            if (!directoryMap.has(dirPath)) {
                directoryMap.set(dirPath, []);
            }
            directoryMap.get(dirPath).push(file.path);
        });
        // Convert directories to components
        const components = Array.from(directoryMap.entries())
            .filter(([dir, files]) => files.length > 0 && !dir.includes('node_modules') && !dir.includes('.git'))
            .map(([dir, files], index) => ({
            id: `comp_${index}`,
            name: dir.split('/').pop() || dir,
            type: this.inferComponentType(dir, files.map(f => ({
                path: f,
                name: path.basename(f),
                size: 0,
                type: 'file' // Add the required 'type' property
            }))),
            path: dir,
            dependencies: [],
            files,
            complexity: files.length,
        }));
        // Create simple dependencies
        const dependencies = [];
        components.forEach(comp1 => {
            const dir1 = comp1.path;
            components.forEach(comp2 => {
                const dir2 = comp2.path;
                if (dir1 !== dir2 && (dir2.startsWith(dir1 + '/') || dir1.includes('util') || dir1.includes('common'))) {
                    dependencies.push({
                        from: comp1.id,
                        to: comp2.id,
                        type: 'component_usage',
                    });
                }
            });
        });
        // Organize into basic layers
        const layers = [
            {
                name: 'Frontend',
                type: 'presentation',
                components: components.filter(c => c.path.includes('front') ||
                    c.path.includes('ui') ||
                    c.path.includes('view') ||
                    c.path.includes('component') ||
                    c.path.includes('page')),
            },
            {
                name: 'Backend',
                type: 'business',
                components: components.filter(c => c.path.includes('back') ||
                    c.path.includes('api') ||
                    c.path.includes('service') ||
                    c.path.includes('controller')),
            },
            {
                name: 'Data',
                type: 'data',
                components: components.filter(c => c.path.includes('data') ||
                    c.path.includes('model') ||
                    c.path.includes('entity') ||
                    c.path.includes('schema')),
            },
            {
                name: 'Shared',
                type: 'infrastructure',
                components: components.filter(c => c.path.includes('util') ||
                    c.path.includes('common') ||
                    c.path.includes('shared') ||
                    c.path.includes('config') ||
                    c.path.includes('lib')),
            },
        ];
        // Generate a basic diagram
        const mermaidDiagram = this.generateMermaidDiagram(layers, dependencies);
        return {
            layers,
            components,
            dependencies,
            patterns: ['Layered Architecture'],
            mermaidDiagram,
            summary: 'Fallback architecture analysis created due to an error processing the full architecture.',
        };
    }
    identifyComponents(files) {
        const components = [];
        const componentMap = new Map();
        // Group files into logical components based on directory structure
        const componentGroups = new Map();
        for (const file of files) {
            if (!file.content || !this.isSourceFile(file.path))
                continue;
            const componentPath = this.getComponentPath(file.path);
            if (!componentGroups.has(componentPath)) {
                componentGroups.set(componentPath, []);
            }
            componentGroups.get(componentPath).push(file);
        }
        // Create components from groups
        for (const [componentPath, componentFiles] of componentGroups) {
            const component = {
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
    getComponentPath(filePath) {
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
    getComponentName(componentPath) {
        const parts = componentPath.split('/');
        const lastPart = parts[parts.length - 1];
        // Capitalize and format component names
        return lastPart
            .split(/[-_]/)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }
    inferComponentType(componentPath, files) {
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
    calculateComponentComplexity(files) {
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
    analyzeDependencies(files, components) {
        const dependencies = [];
        const componentLookup = new Map();
        // Create lookup map
        for (const component of components) {
            for (const filePath of component.files) {
                componentLookup.set(filePath, component);
            }
        }
        // Analyze imports and dependencies
        for (const file of files) {
            if (!file.content)
                continue;
            const sourceComponent = componentLookup.get(file.path);
            if (!sourceComponent)
                continue;
            const imports = this.extractImports(file.content, file.path);
            for (const importPath of imports) {
                const targetComponent = this.findTargetComponent(importPath, file.path, components);
                if (targetComponent && targetComponent.id !== sourceComponent.id) {
                    const dependencyType = this.inferDependencyType(importPath, sourceComponent, targetComponent);
                    // Avoid duplicates
                    const existingDep = dependencies.find(d => d.from === sourceComponent.id && d.to === targetComponent.id && d.type === dependencyType);
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
    extractImports(content, filePath) {
        const imports = [];
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
    findTargetComponent(importPath, sourceFilePath, components) {
        // Resolve relative imports
        let resolvedPath = importPath;
        if (importPath.startsWith('./') || importPath.startsWith('../')) {
            const sourceDir = path.dirname(sourceFilePath);
            resolvedPath = path.resolve(sourceDir, importPath).replace(/\\/g, '/');
        }
        // Find component that contains this path
        for (const component of components) {
            if (component.files.some(filePath => filePath.includes(resolvedPath) || resolvedPath.includes(component.path))) {
                return component;
            }
        }
        return undefined;
    }
    inferDependencyType(importPath, source, target) {
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
    organizeLayers(components) {
        const layers = [
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
    detectArchitecturalPatterns(components, files) {
        const patterns = [];
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
    generateMermaidDiagram(layers, dependencies) {
        let mermaid = 'graph TB\n';
        // Add diagram configuration for better visibility
        mermaid += '  %% Configuration for better visibility\n';
        mermaid += '  accTitle: System Architecture Diagram\n';
        mermaid += '  accDescr: Comprehensive view of system components and their relationships\n';
        mermaid += '  linkStyle default stroke-width:2px\n';
        mermaid += '  classDef default fontSize:14px,margin:10px\n\n';
        // Add title
        mermaid += '  title[System Architecture Diagram] :::title\n';
        mermaid += '  style title fill:none,stroke:none,fontSize:24px,font-weight:bold\n\n';
        // Add subgraphs for each layer
        for (const layer of layers) {
            if (layer.components.length === 0)
                continue;
            // Use layer type for styling consistency
            const layerStyle = this.getLayerStyle(layer.type);
            mermaid += `  subgraph ${layer.name.replace(/\s+/g, '_')}[${layer.name}]${layerStyle}\n`;
            mermaid += `    direction TB\n`;
            // Group components by type within each layer for better organization
            const componentsByType = this.groupComponentsByType(layer.components);
            for (const [type, components] of Object.entries(componentsByType)) {
                if (components.length > 0) {
                    // Optional inner subgraphs for component types if there are many components
                    if (components.length > 3) {
                        mermaid += `    subgraph ${layer.name}_${type}[${this.formatType(type)}]\n`;
                        for (const component of components) {
                            const nodeId = this.sanitizeId(component.id);
                            const nodeLabel = component.name + '<br/>' + (component.files.length > 0 ? `${component.files.length} file(s)` : '');
                            const nodeStyle = this.getNodeStyle(component.type);
                            mermaid += `      ${nodeId}["${nodeLabel}"]${nodeStyle}\n`;
                        }
                        mermaid += `    end\n`;
                    }
                    else {
                        // Directly add components if there are few
                        for (const component of components) {
                            const nodeId = this.sanitizeId(component.id);
                            const nodeLabel = component.name + '<br/>' + (component.files.length > 0 ? `${component.files.length} file(s)` : '');
                            const nodeStyle = this.getNodeStyle(component.type);
                            mermaid += `    ${nodeId}["${nodeLabel}"]${nodeStyle}\n`;
                        }
                    }
                }
            }
            mermaid += '  end\n\n';
        }
        // Add dependencies with enhanced styling
        mermaid += '  %% Component Dependencies\n';
        for (const dep of dependencies) {
            const fromId = this.sanitizeId(dep.from);
            const toId = this.sanitizeId(dep.to);
            const arrowStyle = this.getArrowStyle(dep.type);
            const relText = this.getRelationshipText(dep.type);
            mermaid += `  ${fromId} ${arrowStyle} ${toId}${relText ? "|" + relText + "|" : ""}\n`;
        }
        // Add enhanced styling for components
        mermaid += '\n  %% Styling\n';
        mermaid += '  classDef frontend fill:#e1f5fe,stroke:#01579b,stroke-width:2px,color:#01579b,border-radius:8px\n';
        mermaid += '  classDef backend fill:#f3e5f5,stroke:#4a148c,stroke-width:2px,color:#4a148c,border-radius:8px\n';
        mermaid += '  classDef database fill:#e8f5e8,stroke:#1b5e20,stroke-width:2px,color:#1b5e20,border-radius:8px\n';
        mermaid += '  classDef service fill:#fff3e0,stroke:#e65100,stroke-width:2px,color:#e65100,border-radius:8px\n';
        mermaid += '  classDef middleware fill:#fce4ec,stroke:#880e4f,stroke-width:2px,color:#880e4f,border-radius:8px\n';
        mermaid += '  classDef api fill:#e8eaf6,stroke:#1a237e,stroke-width:2px,color:#1a237e,border-radius:8px\n';
        mermaid += '  classDef config fill:#f1f8e9,stroke:#33691e,stroke-width:2px,color:#33691e,border-radius:8px\n';
        mermaid += '  classDef util fill:#e0f7fa,stroke:#006064,stroke-width:2px,color:#006064,border-radius:8px\n';
        mermaid += '  classDef test fill:#f9fbe7,stroke:#827717,stroke-width:2px,color:#827717,border-radius:8px\n';
        // Layer styling
        mermaid += '  classDef presentation fill:#e3f2fd,stroke:#1565c0,color:#1565c0,stroke-width:3px\n';
        mermaid += '  classDef business fill:#f3e5f5,stroke:#6a1b9a,color:#6a1b9a,stroke-width:3px\n';
        mermaid += '  classDef data fill:#e8f5e9,stroke:#2e7d32,color:#2e7d32,stroke-width:3px\n';
        mermaid += '  classDef infrastructure fill:#e8eaf6,stroke:#283593,color:#283593,stroke-width:3px\n';
        mermaid += '  classDef title fill:none,stroke:none,color:#000\n';
        // Create a legend
        mermaid += '\n  %% Legend\n';
        mermaid += '  subgraph Legend\n';
        mermaid += '    legend_frontend[Frontend]:::frontend\n';
        mermaid += '    legend_backend[Backend]:::backend\n';
        mermaid += '    legend_database[Database]:::database\n';
        mermaid += '    legend_service[Service]:::service\n';
        mermaid += '    legend_api[API]:::api\n';
        mermaid += '  end\n';
        return mermaid;
    }
    getNodeStyle(type) {
        switch (type) {
            case 'frontend': return ':::frontend';
            case 'backend': return ':::backend';
            case 'database': return ':::database';
            case 'service': return ':::service';
            case 'middleware': return ':::middleware';
            case 'api': return ':::api';
            case 'config': return ':::config';
            case 'util': return ':::util';
            case 'test': return ':::test';
            default: return '';
        }
    }
    getLayerStyle(type) {
        switch (type) {
            case 'presentation': return ':::presentation';
            case 'business': return ':::business';
            case 'data': return ':::data';
            case 'infrastructure': return ':::infrastructure';
            default: return '';
        }
    }
    getArrowStyle(dependencyType) {
        switch (dependencyType) {
            case 'api_call': return '-->';
            case 'service_call': return '==>';
            case 'data_access': return '-..->';
            case 'component_usage': return '-.->';
            case 'imports': return '-->';
            case 'extends': return '===>';
            case 'uses': return '.->';
            default: return '-->';
        }
    }
    getRelationshipText(dependencyType) {
        switch (dependencyType) {
            case 'api_call': return 'API call';
            case 'service_call': return 'uses service';
            case 'data_access': return 'accesses';
            case 'component_usage': return 'uses';
            case 'imports': return 'imports';
            case 'extends': return 'extends';
            default: return '';
        }
    }
    formatType(type) {
        return type.charAt(0).toUpperCase() + type.slice(1) + ' Components';
    }
    groupComponentsByType(components) {
        const result = {};
        for (const component of components) {
            if (!result[component.type]) {
                result[component.type] = [];
            }
            result[component.type].push(component);
        }
        return result;
    }
    async generateArchitectureSummary(components, patterns, dependencies) {
        if (this.llmService && await this.llmService.isConfigured()) {
            try {
                return await this.generateLLMSummary(components, patterns, dependencies);
            }
            catch (error) {
                console.warn('[Architecture] LLM summary failed, using rule-based summary:', error);
            }
        }
        return this.generateRuleBasedSummary(components, patterns, dependencies);
    }
    async generateLLMSummary(components, patterns, dependencies) {
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
        return await this.llmService.generateText(prompt);
    }
    generateRuleBasedSummary(components, patterns, dependencies) {
        const componentsByType = components.reduce((acc, c) => {
            acc[c.type] = (acc[c.type] || 0) + 1;
            return acc;
        }, {});
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
        }
        else if (avgComplexity > 15) {
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
    isSourceFile(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        const sourceExtensions = ['.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.go', '.rs', '.cs', '.php', '.rb'];
        return sourceExtensions.includes(ext);
    }
    isExternalLibrary(importPath) {
        const externalIndicators = ['node_modules', 'lodash', 'react', 'vue', 'angular', 'express', 'fastapi', 'django'];
        return externalIndicators.some(indicator => importPath.includes(indicator));
    }
    sanitizeId(id) {
        return id.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^(\d)/, '_$1');
    }
    getConfiguration() {
        return this.config;
    }
}
exports.ArchitectureAnalysisService = ArchitectureAnalysisService;
