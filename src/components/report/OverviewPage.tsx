import React from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { Skeleton } from '../ui/skeleton';
import ErrorDisplay from '../ui/ErrorDisplay';
import { DependencyGraph, DependencyLink as GraphDependencyLink } from '../diagrams/DependencyGraph';
import ContributorStreamgraph, { StreamDataPoint } from '../diagrams/ContributorStreamgraph';
import { AnalysisResult, ProcessedContributor } from '../../types';

import { useReportSimple as useReport } from '../../hooks/useReport';

// Definition of DataHydrator
const DataHydrator = ({ data, children }: { data: AnalysisResult | { error: string } | null; children: React.ReactNode }) => {
  if (!data) return <Skeleton className="h-[400px] w-full" />;
  
  // Check if data has an error property before accessing it
  if (typeof data === 'object' && data !== null && 'error' in data) {
    // Since data prop is AnalysisResult | { error: string } | null,
    // if 'error' is in data, data must be of type { error: string }
    const errorObj = data as { error: string }; 
    return <ErrorDisplay message={errorObj.error} showRetry onRetry={() => window.location.reload()} />;
  }
  
  return <ErrorBoundary FallbackComponent={ErrorFallback}>{children}</ErrorBoundary>;
};

// Definition of ErrorFallback
const ErrorFallback = ({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) => (
  <ErrorDisplay 
    title="Render Error"
    message={error.message}
    showRetry
    onRetry={resetErrorBoundary}
  />
);

const OverviewPage = () => {
  const { reportData, isLoading, error } = useReport();

  // Prepare links for DependencyGraph - MOVED TO TOP
  const transformedLinks = React.useMemo(() => {
    if (!reportData?.dependencies?.nodes || !reportData?.dependencies?.links) {
      return [];
    }
    const nodesMap = new Map(reportData.dependencies.nodes.map(node => [node.id, node]));
    return reportData.dependencies.links.map(link => {
      const sourceNode = nodesMap.get(link.source as string);
      const targetNode = nodesMap.get(link.target as string);
      if (sourceNode && targetNode) {
        return {
          ...link,
          source: sourceNode,
          target: targetNode,
        } as GraphDependencyLink;
      }
      return null;
    }).filter(Boolean) as GraphDependencyLink[];
  }, [reportData?.dependencies]);

  // Prepare data for ContributorStreamgraph - MOVED TO TOP
  const contributorActivityData: StreamDataPoint[] = React.useMemo(() => {
    if (!reportData?.contributors) {
      return [];
    }
    const activityByDate: { [date: string]: { [contributorLogin: string]: number } } = {};
    reportData.contributors.forEach((contributor: ProcessedContributor) => {
      if (contributor.activity && Array.isArray(contributor.activity)) {
        contributor.activity.forEach(act => {
          if (act && typeof act.date === 'string' && typeof act.count === 'number') {
            if (!activityByDate[act.date]) {
              activityByDate[act.date] = {};
            }
            if (typeof contributor.login === 'string') {
               activityByDate[act.date][contributor.login] = (activityByDate[act.date][contributor.login] || 0) + act.count;
            }
          }
        });
      }
    });
    return Object.entries(activityByDate).map(([date, contributors]) => ({
      date,
      contributors,
    }));
  }, [reportData?.contributors]);
  
  if (isLoading) return <Skeleton className="h-[600px] w-full" />;
  if (error) return <ErrorDisplay message={error} title="Failed to load report data" showRetry onRetry={() => window.location.reload()} />;
  
  return (
    <DataHydrator data={reportData}>
      {reportData && (
        <div className="space-y-6">
          {reportData.dependencies && (
            <DependencyGraph 
              nodes={reportData.dependencies.nodes || []}
              links={transformedLinks}
            />
          )}
          <ContributorStreamgraph 
            data={contributorActivityData} 
          />
        </div>
      )}
    </DataHydrator>
  );
};

export default OverviewPage;
