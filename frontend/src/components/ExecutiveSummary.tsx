import React from 'react';
import { Brain } from 'lucide-react';
import { AnalysisResult } from '../types';

// --- PROPS INTERFACES ---

interface ExecutiveSummaryProps {
  reportData: Pick<AnalysisResult, 'basicInfo' | 'metrics' | 'dependencyMetrics' | 'hotspots'>;
}

interface SummaryItemProps {
  line: string;
  index: number;
  isLast: boolean;
}

// --- CUSTOM HOOK for generating valuable insights ---

const useExecutiveSummary = (reportData: ExecutiveSummaryProps['reportData']) => {
  const { basicInfo, metrics, dependencyMetrics, hotspots } = reportData;

  const generateValuableInsights = React.useCallback(() => {
    const primaryInsights: string[] = [];
    const fillerInsights: string[] = [];
    const formatNum = (n: number | undefined) => n?.toLocaleString() ?? 'N/A';

    // --- Primary Insights (Critical Issues) ---
    const totalVulnerabilities = (metrics.criticalVulnerabilities ?? 0) + (metrics.highVulnerabilities ?? 0);
    if (totalVulnerabilities > 0) {
      primaryInsights.push(`Critical Security Risk: Found ${totalVulnerabilities} critical/high severity vulnerabilities requiring immediate attention.`);
    }

    const depVulnerabilities = dependencyMetrics?.vulnerablePackages ?? 0;
    if (depVulnerabilities > 5) {
      primaryInsights.push(`High Dependency Risk: ${depVulnerabilities} dependencies have known vulnerabilities.`);
    } else if (depVulnerabilities > 0) {
      primaryInsights.push(`Dependency Vulnerabilities: ${depVulnerabilities} dependencies have known vulnerabilities.`);
    }

    const busFactor = metrics.busFactor;
    if (busFactor !== undefined && busFactor <= 2) {
      primaryInsights.push(`High Contributor Risk: A low bus factor of ${busFactor} suggests a critical dependency on just a few developers.`);
    }

    const highRiskHotspots = hotspots?.filter(h => h.riskLevel === 'high' || h.riskLevel === 'critical').length ?? 0;
    if (highRiskHotspots > 0) {
      primaryInsights.push(`Code Hotspots: Identified ${highRiskHotspots} high-risk files that are both complex and frequently changed.`);
    }

    const techDebt = metrics.technicalDebtScore;
    if (techDebt !== undefined && techDebt < 60) {
      primaryInsights.push(`High Technical Debt: The estimated technical debt is significant, which may slow down future development.`);
    }

    const testCoverage = metrics.testCoverage;
    if (testCoverage !== undefined && testCoverage < 50) {
      primaryInsights.push(`Poor Test Coverage: Code test coverage is at ${testCoverage.toFixed(1)}%, indicating a higher risk of undetected bugs.`);
    }

    const codeQuality = metrics.codeQuality;
    if (codeQuality !== undefined && codeQuality < 60) {
      primaryInsights.push(`Low Code Quality: Automated analysis suggests there are significant opportunities to improve code structure.`);
    }

    const monthsAgo = basicInfo.updatedAt ? (new Date().getTime() - new Date(basicInfo.updatedAt).getTime()) / (1000 * 3600 * 24 * 30) : 0;
    if (monthsAgo > 6) {
      primaryInsights.push(`Stale Project: The repository has not been updated in over ${Math.floor(monthsAgo)} months.`);
    }

    // --- Filler Insights (Positive or Neutral Observations) ---
    if (totalVulnerabilities === 0 && depVulnerabilities === 0) {
      fillerInsights.push(`Strong Security Posture: No critical or high-severity vulnerabilities were detected in the latest scan.`);
    }
    if (monthsAgo <= 6) {
      fillerInsights.push(`Active Development: The project is actively maintained, with recent updates.`);
    }
    if (busFactor !== undefined && busFactor > 2) {
      fillerInsights.push(`Healthy Contribution Model: The project has a bus factor of ${busFactor}, indicating knowledge is well-distributed.`);
    }
    if (testCoverage !== undefined && testCoverage >= 80) {
      fillerInsights.push(`Excellent Test Coverage: With ${testCoverage.toFixed(1)}% coverage, the project has a strong safety net against bugs.`);
    }
    if (highRiskHotspots === 0) {
      fillerInsights.push(`Good Maintainability: No high-risk code hotspots were identified.`);
    }
    fillerInsights.push(`Project Scale: The codebase contains ~${formatNum(metrics.linesOfCode)} lines of ${basicInfo.language} code across ${formatNum(metrics.fileCount)} files.`);
    fillerInsights.push(`Community Engagement: The project is supported by ${formatNum(metrics.totalContributors)} contributors and has garnered ${formatNum(basicInfo.stars)} stars.`);
    fillerInsights.push(`Project Age: The repository was first created on ${new Date(basicInfo.createdAt).toLocaleDateString()}.`);
    if (basicInfo.openIssues !== undefined) {
      fillerInsights.push(`Issue Tracker: There are currently ${formatNum(basicInfo.openIssues)} open issues.`);
    }
    
    // Combine insights, with primary issues first
    const finalInsights = [...primaryInsights, ...fillerInsights];
    return finalInsights;

  }, [basicInfo, metrics, dependencyMetrics, hotspots]);

  const valuablePoints = generateValuableInsights();
  
  return { valuablePoints };
};

// --- SUB-COMPONENTS for RENDERING ---

const SummaryItem: React.FC<SummaryItemProps> = ({ line, index, isLast }) => {
  const [title, ...descParts] = line.split(':');
  const description = descParts.join(':').trim();

  return (
    <div className="flex group">
      <div className="flex flex-col items-center w-8 mr-4">
        <div className="w-6 h-6 bg-cyan-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
          {index + 1}
        </div>
        {!isLast && <div className="flex-1 w-px bg-cyan-300 mt-2"></div>}
      </div>
      <div className="flex-1 bg-white p-4 rounded-lg shadow-sm border border-cyan-200 group-hover:border-cyan-400 transition-colors">
        <h4 className="text-sm font-semibold text-cyan-900 mb-2 flex items-center">
          <svg className="w-4 h-4 mr-2 text-cyan-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {title.trim()}
        </h4>
        {description && (
          <div className="pl-6 border-l-2 border-cyan-100 ml-2">
            <p className="text-xs text-cyan-800 leading-relaxed">{description}</p>
          </div>
        )}
      </div>
    </div>
  );
};

// --- MAIN COMPONENT ---

const ExecutiveSummary = ({ reportData }: ExecutiveSummaryProps) => {
  const { valuablePoints } = useExecutiveSummary(reportData);

  return (
    <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
      <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
        <Brain className="w-6 h-6 text-blue-500 mr-3" />
        Executive Summary
      </h3>
      
      <div className="prose prose-indigo max-w-none">
        <div className="relative bg-cyan-50 rounded-2xl p-6 shadow-xl border-2 border-cyan-200">
          <div className="absolute inset-0 bg-grid-cyan-100/50 [mask-image:linear-gradient(180deg,white,transparent)]" />
          
          <div className="relative space-y-4 z-10">
            {valuablePoints.map((line, index) => (
              <SummaryItem 
                key={index} 
                line={line} 
                index={index} 
                isLast={index === valuablePoints.length - 1} 
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExecutiveSummary;
