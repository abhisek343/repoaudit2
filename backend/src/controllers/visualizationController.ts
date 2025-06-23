import { Request, Response } from 'express';
import { BackendAnalysisService } from '../services/backendAnalysisService';

export const getVisualizations = async (req: Request, res: Response) => {
  const repoUrl = req.query.repoUrl as string;
  const analysisService = new BackendAnalysisService();
  const systemArchitecture = await analysisService.analyze(repoUrl, { useCache: true, architecture: true });
  const vulnerabilityDistribution = await analysisService.analyze(repoUrl, { useCache: true, security: true });
  const complexityScatterPlot = await analysisService.analyze(repoUrl, { useCache: true, quality: true });
  const interactiveArchitecture = await analysisService.analyze(repoUrl, { useCache: true, architecture: true });

  res.json({
    interactiveArchitecture,
    systemArchitecture,
    vulnerabilityDistribution,
    complexityScatterPlot,
  });
};