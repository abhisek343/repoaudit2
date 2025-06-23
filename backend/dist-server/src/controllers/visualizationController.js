"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getVisualizations = void 0;
const backendAnalysisService_1 = require("../services/backendAnalysisService");
const cacheServiceProvider_1 = require("../services/cacheServiceProvider");
// Initialize Redis cache service
const cacheService = (0, cacheServiceProvider_1.getCacheService)();
const getVisualizations = async (req, res) => {
    try {
        const repoUrl = req.query.repoUrl;
        if (!repoUrl) {
            return res.status(400).json({ error: 'Repository URL is required' });
        }
        // Sanitize repo URL for use as cache key
        const sanitizedRepoUrl = repoUrl.replace(/[^a-zA-Z0-9-._:/]/g, '');
        const cacheKey = `analysis_${sanitizedRepoUrl}`;
        // Check cache first
        const cachedAnalysis = await cacheService.get(cacheKey);
        if (cachedAnalysis) {
            console.log(`Found cached analysis for ${repoUrl}, using for visualization data`);
            const analysisResult = JSON.parse(cachedAnalysis);
            // Extract only the visualization-related data to reduce payload size
            return res.json({
                systemArchitecture: analysisResult.systemArchitecture,
                vulnerabilityDistribution: analysisResult.securityIssues,
                complexityScatterPlot: analysisResult.qualityMetrics,
                interactiveArchitecture: analysisResult.systemArchitecture || {} // Use systemArchitecture as fallback
            });
        }
        console.log(`No cached analysis found for ${repoUrl}, performing new analysis`);
        // Extract GitHub token from request headers if available
        const githubToken = req.headers.authorization?.startsWith('Bearer ')
            ? req.headers.authorization.substring(7)
            : undefined;
        // Create analysis service
        const analysisService = new backendAnalysisService_1.BackendAnalysisService(githubToken);
        // Perform a single comprehensive analysis instead of 4 separate ones
        const analysisResult = await analysisService.analyze(repoUrl, {
            useCache: true,
            architecture: true,
            security: true,
            quality: true,
            // Disable other heavy features for faster response
            dependencies: false,
            technicalDebt: false,
            performance: false,
            hotspots: false,
            keyFunctions: false,
            prAnalysis: false,
            contributorAnalysis: false,
            aiSummary: false,
            aiArchitecture: false,
            temporalCoupling: false,
            dataTransformation: false,
            gitGraph: false
        });
        // Cache the visualization data
        const visualizationData = {
            systemArchitecture: analysisResult.systemArchitecture,
            vulnerabilityDistribution: analysisResult.securityIssues,
            complexityScatterPlot: analysisResult.qualityMetrics,
            interactiveArchitecture: analysisResult.systemArchitecture || {} // Use systemArchitecture as fallback
        };
        // Cache visualization data separately with longer expiration
        const visualizationCacheKey = `visualizations_${sanitizedRepoUrl}`;
        await cacheService.set(visualizationCacheKey, JSON.stringify(visualizationData), 60 * 60 * 24 * 7); // 7 days
        res.json(visualizationData);
    }
    catch (error) {
        console.error('Error generating visualizations:', error);
        res.status(500).json({
            error: error instanceof Error ? error.message : 'Unknown error generating visualizations'
        });
    }
};
exports.getVisualizations = getVisualizations;
