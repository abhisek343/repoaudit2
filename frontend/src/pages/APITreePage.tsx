import React, { useMemo } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { useReport } from '../hooks/useReport';
import APIRouteTree, { RouteNode } from '../components/diagrams/APIRouteTree';
import { ApiEndpoint } from '../types/advanced';
import { AnalysisResult } from '../types';

const APITreePage: React.FC = () => {
  const { reportId } = useParams<{ reportId: string }>();
  const location = useLocation();
  const navState = location.state as { reportData?: AnalysisResult } | null;
  const navReport = navState?.reportData;
  const { reportData: loadedReport, isLoading, error } = useReport(navReport ? undefined : reportId);
  const reportData = navReport ?? loadedReport;

  // Build tree data from API endpoints
  const apiRoutesTreeData: RouteNode = useMemo(() => {
    const root: RouteNode = { name: 'API', path: '/api', children: [] };
    // Use API endpoint data or fallback to file-based routes
    const endpoints = reportData?.advancedAnalysis?.apiEndpoints || [];
    if (endpoints.length === 0) {
      const files = reportData?.files || [];
      // Identify potential API files
      const apiFiles = files.filter(f =>
        f.path.includes('api') ||
        f.path.includes('route') ||
        f.path.includes('controller') ||
        f.path.includes('endpoint') ||
        f.path.includes('handler') ||
        /\.(ts|js|py|go|java|rb|php)$/i.test(f.name)
      );
      if (apiFiles.length === 0) {
        // Sample structure
        root.children = [
          { name: 'users', path: '/api/users', children: [{ name: 'list', path: '/api/users', method: 'GET', children: [] }] }
        ];
        return root;
      }
      // Build structure based on file paths
      apiFiles.forEach(file => {
        const parts = file.path.replace(/^\//, '').split('/').filter(Boolean);
        let current = root;
        parts.forEach((part, idx) => {
          if (!current.children) current.children = [];
          let child = current.children.find(c => c.name === part);
          if (!child) {
            child = { name: part, path: `/${parts.slice(0, idx+1).join('/')}`, children: [] };
            current.children.push(child);
          }
          current = child;
        });
      });
      return root;
    }
    // Use explicit endpoints if available
    endpoints.forEach((endpoint: ApiEndpoint) => {
      const parts = endpoint.path.replace(/^\//, '').split('/').filter(Boolean);
      let current = root;
      parts.forEach((part: string, idx: number) => {
        if (!current.children) current.children = [];
        // Find or create the child node
        let child = current.children.find(c => c.name === part && c.path === `/${parts.slice(0, idx+1).join('/')}`);
        if (!child) {
          child = { name: part, path: `/${parts.slice(0, idx+1).join('/')}`, children: [] };
          current.children.push(child);
        }
        // Assign current to the found or newly created child
        current = child;
      });
      // assign method and file at leaf
      current.method = endpoint.method;
      current.file = endpoint.file;
    });
    return root;
  }, [reportData]);

  if (!navReport && isLoading) return <div className="flex items-center justify-center h-screen">Loading...</div>;
  if (!navReport && (error || !reportData)) return <div className="flex items-center justify-center h-screen text-red-500">Error loading report: {error}</div>;

  // Full page dimensions
  const width = window.innerWidth;
  const height = window.innerHeight;

  return (
    <div className="w-full h-screen">
      <APIRouteTree routes={apiRoutesTreeData} width={width} height={height} />
    </div>
  );
};

export default APITreePage;
