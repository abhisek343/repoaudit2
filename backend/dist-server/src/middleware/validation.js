"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateAnalysisRequest = void 0;
const validateAnalysisRequest = async (req, res, next) => {
    // For GET requests, data is in req.query. For POST, it's in req.body.
    // The /api/analyze endpoint is GET for SSE.
    const repoUrl = req.query.repoUrl || req.body.repoUrl;
    if (!repoUrl || typeof repoUrl !== 'string' || !repoUrl.includes('github.com')) {
        res.status(400).json({
            error: 'Invalid repository URL. Must be a valid GitHub repository URL.',
            validExample: 'https://github.com/user/repo'
        });
        return; // Terminate after sending response
    }
    // Basic check for common injection patterns (very simplistic)
    if (/[<>$(){}[\];']/.test(repoUrl)) {
        res.status(400).json({
            error: 'Repository URL contains potentially unsafe characters.'
        });
        return; // Terminate after sending response
    }
    // Further validation: ensure it's a plausible GitHub URL structure
    try {
        const url = new URL(repoUrl);
        if (url.hostname !== 'github.com') {
            throw new Error('Hostname must be github.com');
        }
        const pathParts = url.pathname.split('/').filter(part => part.length > 0);
        if (pathParts.length < 2) { // Must have at least /owner/repo
            throw new Error('URL path must include owner and repository name.');
        }
    }
    catch (e) {
        res.status(400).json({
            error: 'Invalid URL format. Please provide a full GitHub repository URL.',
            details: e instanceof Error ? e.message : 'Unknown URL parsing error.'
        });
        return; // Terminate after sending response
    }
    next();
    // No explicit return needed here, as async functions implicitly return Promise<void>
};
exports.validateAnalysisRequest = validateAnalysisRequest;
