"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalysisService = void 0;
class AnalysisService {
    githubToken;
    llmConfig;
    constructor(githubToken, llmConfig) {
        this.githubToken = githubToken;
        this.llmConfig = llmConfig;
    }
    analyzeRepository(repoUrl, onProgress) {
        const params = new URLSearchParams();
        params.append('repoUrl', repoUrl);
        if (this.llmConfig) {
            params.append('llmConfig', JSON.stringify(this.llmConfig));
        }
        if (this.githubToken) {
            params.append('githubToken', this.githubToken);
        }
        const eventSourceUrl = `/api/analyze?${params.toString()}`;
        const eventSource = new EventSource(eventSourceUrl);
        const analysisPromise = new Promise((resolve, reject) => {
            onProgress('Connecting to analysis server...', 0);
            eventSource.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    if (message.step && typeof message.progress === 'number') {
                        onProgress(message.step, message.progress);
                    }
                }
                catch (e) {
                    console.error('Failed to parse progress message:', event.data, e);
                }
            };
            eventSource.addEventListener('complete', (event) => {
                try {
                    const result = JSON.parse(event.data);
                    onProgress('Analysis complete!', 100);
                    eventSource.close();
                    resolve(this.ensureDefaults(result, repoUrl));
                }
                catch (e) {
                    console.error('Failed to parse complete message:', event.data, e);
                    eventSource.close();
                    reject(new Error('Failed to parse final analysis result.'));
                }
            });
            eventSource.onerror = (errorEvent) => {
                console.error('EventSource connection error:', errorEvent);
                const errorMessage = 'Connection to analysis server failed. The server may be offline or a network issue occurred.';
                onProgress(errorMessage, 0);
                eventSource.close();
                reject(new Error(errorMessage));
            };
            eventSource.addEventListener('error', (event) => {
                console.error('Server-sent error event:', event);
                const errorMessage = 'Analysis failed: Connection error';
                onProgress(errorMessage, 0);
                eventSource.close();
                reject(new Error(errorMessage));
            });
        });
        return { eventSource, analysisPromise };
    }
    ensureDefaults(data, repoUrl) {
        const now = new Date().toISOString();
        const id = `${new Date(now).getTime()}`;
        // DONT strip data - just ensure required fields exist
        return {
            id,
            repositoryUrl: repoUrl,
            createdAt: now,
            // Use provided data or sensible defaults
            basicInfo: data.basicInfo || {
                name: 'Unknown', fullName: '', description: null, stars: 0, forks: 0,
                watchers: 0, language: null, url: repoUrl, owner: '', createdAt: now,
                updatedAt: now, defaultBranch: 'main', size: 0, openIssues: 0,
                hasWiki: false, hasPages: false
            },
            repository: data.repository || data.basicInfo || {},
            commits: data.commits || [],
            contributors: data.contributors || [],
            files: data.files || [],
            languages: data.languages || {},
            dependencies: data.dependencies || { dependencies: {}, devDependencies: {} },
            dependencyGraph: data.dependencyGraph || { nodes: [], links: [] },
            qualityMetrics: data.qualityMetrics || {},
            securityIssues: data.securityIssues || [],
            technicalDebt: data.technicalDebt || [],
            performanceMetrics: data.performanceMetrics || [],
            hotspots: data.hotspots || [],
            keyFunctions: data.keyFunctions || [],
            apiEndpoints: data.apiEndpoints || [],
            metrics: data.metrics || {
                totalCommits: 0, totalContributors: 0, linesOfCode: 0, codeQuality: 0,
                testCoverage: 0, busFactor: 0, securityScore: 0, technicalDebtScore: 0,
                performanceScore: 0, criticalVulnerabilities: 0, highVulnerabilities: 0,
                mediumVulnerabilities: 0, lowVulnerabilities: 0
            },
            // Preserve all optional fields
            ...data
        };
    }
}
exports.AnalysisService = AnalysisService;
