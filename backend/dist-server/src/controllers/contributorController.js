"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getContributorDetails = exports.getContributorStats = void 0;
const githubService_1 = require("../services/githubService");
const getContributorStats = async (req, res) => {
    try {
        const repoUrl = req.query.repoUrl;
        const period = req.query.period || 'month';
        if (!repoUrl) {
            return res.status(400).json({
                error: 'Repository URL is required in query parameters'
            });
        }
        // Extract owner and repo from URL
        const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
        if (!match) {
            return res.status(400).json({
                error: 'Invalid GitHub repository URL'
            });
        }
        const [_, owner, repo] = match;
        // Get token from request if available
        const token = req.headers.authorization?.split(' ')[1];
        // Use GitHub service
        const githubService = new githubService_1.GitHubService(token);
        // Get contributors and recent commits
        const contributors = await githubService.getContributors(owner, repo);
        // Determine date cutoff based on period
        const now = new Date();
        let since;
        switch (period) {
            case 'week':
                since = new Date(now.setDate(now.getDate() - 7));
                break;
            case 'month':
                since = new Date(now.setMonth(now.getMonth() - 1));
                break;
            case 'year':
                since = new Date(now.setFullYear(now.getFullYear() - 1));
                break;
            default:
                since = new Date(now.setMonth(now.getMonth() - 1)); // Default to month
        }
        // Get commits for the period
        const commits = await githubService.getCommits(owner, repo);
        // Filter commits by date
        const recentCommits = commits.filter((commit) => new Date(commit.author?.date || '') >= since);
        // Aggregate stats per contributor
        const contributorStats = {};
        // Initialize with contributor data
        contributors.forEach(contributor => {
            contributorStats[contributor.login] = {
                ...contributor,
                recentCommits: 0,
                totalCommits: contributor.contributions || 0,
                additions: 0,
                deletions: 0
            };
        });
        // Add commit stats
        recentCommits.forEach((commit) => {
            const author = commit.author?.name;
            // Try to match by name or login
            const login = contributors.find(c => c.login === author ||
                c.name === author)?.login;
            if (login && contributorStats[login]) {
                contributorStats[login].recentCommits = (contributorStats[login].recentCommits || 0) + 1;
                contributorStats[login].additions = (contributorStats[login].additions || 0) + (commit.stats?.additions || 0);
                contributorStats[login].deletions = (contributorStats[login].deletions || 0) + (commit.stats?.deletions || 0);
            }
        });
        // Sort contributors by recent commits
        const sortedContributors = Object.values(contributorStats)
            .sort((a, b) => (b.recentCommits || 0) - (a.recentCommits || 0))
            .slice(0, 10); // Top 10
        // Calculate overall stats
        const totalCommits = recentCommits.length;
        const totalContributors = Object.values(contributorStats).filter(c => (c.recentCommits || 0) > 0).length;
        res.status(200).json({
            period,
            totalCommits,
            totalContributors,
            topContributors: sortedContributors
        });
    }
    catch (error) {
        console.error('Error fetching contributor stats:', error);
        res.status(500).json({
            error: error instanceof Error ? error.message : 'Unknown error fetching contributor stats'
        });
    }
};
exports.getContributorStats = getContributorStats;
const getContributorDetails = async (req, res) => {
    try {
        const { contributorLogin } = req.params;
        const repoUrl = req.query.repoUrl;
        if (!repoUrl) {
            return res.status(400).json({
                error: 'Repository URL is required in query parameters'
            });
        }
        // Extract owner and repo from URL
        const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
        if (!match) {
            return res.status(400).json({
                error: 'Invalid GitHub repository URL'
            });
        }
        const [_, owner, repo] = match;
        // Get token from request if available
        const token = req.headers.authorization?.split(' ')[1];
        // Use GitHub service
        const githubService = new githubService_1.GitHubService(token);
        // Get contributor basic info
        const contributors = await githubService.getContributors(owner, repo);
        const contributor = contributors.find(c => c.login === contributorLogin);
        if (!contributor) {
            return res.status(404).json({
                error: 'Contributor not found in this repository'
            });
        }
        // Get all commits for this repository
        const allCommits = await githubService.getCommits(owner, repo);
        // Filter for this contributor's commits
        const contributorCommits = allCommits.filter((commit) => commit.author?.name === contributorLogin ||
            commit.author?.email === contributor.email);
        // Calculate stats
        const totalCommits = contributorCommits.length;
        const totalAdditions = contributorCommits.reduce((sum, commit) => sum + (commit.stats?.additions || 0), 0);
        const totalDeletions = contributorCommits.reduce((sum, commit) => sum + (commit.stats?.deletions || 0), 0);
        // Get most recent commits
        const recentCommits = contributorCommits
            .sort((a, b) => new Date(b.author?.date || '').getTime() - new Date(a.author?.date || '').getTime())
            .slice(0, 10);
        // Calculate activity timeline (last 12 weeks)
        const activityTimeline = calculateActivityTimeline(contributorCommits);
        // Generate unique ID if none exists
        const id = contributor.id || `contrib_${Date.now()}`;
        const name = contributor.name || contributor.login;
        res.status(200).json({
            id,
            login: contributor.login,
            name,
            avatarUrl: contributor.avatarUrl,
            profileUrl: contributor.html_url,
            email: contributor.email,
            stats: {
                totalCommits,
                totalAdditions,
                totalDeletions,
                linesChanged: totalAdditions + totalDeletions
            },
            recentCommits: recentCommits.map(formatCommit),
            activityTimeline
        });
    }
    catch (error) {
        console.error('Error fetching contributor details:', error);
        res.status(500).json({
            error: error instanceof Error ? error.message : 'Unknown error fetching contributor details'
        });
    }
};
exports.getContributorDetails = getContributorDetails;
// Helper function to format commit data
function formatCommit(commit) {
    return {
        sha: commit.sha,
        message: commit.message,
        date: commit.author?.date,
        additions: commit.stats?.additions || 0,
        deletions: commit.stats?.deletions || 0
    };
}
// Helper function to calculate activity timeline (last 12 weeks)
function calculateActivityTimeline(commits) {
    const now = new Date();
    const timeline = [];
    // Create array for last 12 weeks
    for (let i = 11; i >= 0; i--) {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - (i * 7 + 7));
        const weekEnd = new Date(now);
        weekEnd.setDate(now.getDate() - i * 7);
        const weekCommits = commits.filter(commit => {
            const date = new Date(commit.author?.date || '');
            return date >= weekStart && date < weekEnd;
        });
        timeline.push({
            week: `${weekStart.toISOString().substring(0, 10)}`,
            commits: weekCommits.length
        });
    }
    return timeline;
}
// For ESM import compatibility
exports.default = {
    getContributorStats: exports.getContributorStats,
    getContributorDetails: exports.getContributorDetails,
};
