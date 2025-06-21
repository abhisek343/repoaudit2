/**
 * Performance optimization utilities for handling massive codebases
 */

import { FileInfo, AnalysisResult } from '../types';

export const PERFORMANCE_LIMITS = {
  MAX_DEPENDENCY_NODES: 100,
  MAX_DEPENDENCY_LINKS: 200,
  MAX_FILE_LIST_DISPLAY: 50,
  MAX_COMPLEXITY_DISPLAY: 20,
  MAX_LANGUAGE_DISPLAY: 8,
  MAX_COMMITS_DISPLAY: 100,
  VIRTUAL_SCROLL_THRESHOLD: 100,
  CHUNK_SIZE: 25,
} as const;

/**
 * Optimize dependency graph data for large repositories
 */
export function optimizeDependencyGraph(
  nodes: any[], 
  links: any[]
): { nodes: any[]; links: any[]; isOptimized: boolean } {
  if (nodes.length <= PERFORMANCE_LIMITS.MAX_DEPENDENCY_NODES && 
      links.length <= PERFORMANCE_LIMITS.MAX_DEPENDENCY_LINKS) {
    return { nodes, links, isOptimized: false };
  }

  // Sort nodes by importance (complexity, connection count, etc.)
  const sortedNodes = nodes
    .map(node => ({
      ...node,
      score: calculateNodeImportance(node, links)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, PERFORMANCE_LIMITS.MAX_DEPENDENCY_NODES);

  const nodeIds = new Set(sortedNodes.map(n => n.id));
  
  // Filter links to only include connections between retained nodes
  const filteredLinks = links
    .filter(link => nodeIds.has(link.source) && nodeIds.has(link.target))
    .slice(0, PERFORMANCE_LIMITS.MAX_DEPENDENCY_LINKS);

  return { 
    nodes: sortedNodes, 
    links: filteredLinks, 
    isOptimized: true 
  };
}

/**
 * Calculate node importance based on connections and complexity
 */
function calculateNodeImportance(node: any, links: any[]): number {
  const connectionCount = links.filter(
    link => link.source === node.id || link.target === node.id
  ).length;
  
  const complexity = node.metrics?.complexity || 0;
  const size = node.size || 0;
  
  return connectionCount * 10 + complexity + (size / 100);
}

/**
 * Optimize file lists for large repositories
 */
export function optimizeFileList(
  files: FileInfo[], 
  sortBy: 'complexity' | 'size' | 'path' = 'complexity'
): { files: FileInfo[]; isOptimized: boolean } {
  if (files.length <= PERFORMANCE_LIMITS.MAX_FILE_LIST_DISPLAY) {
    return { files, isOptimized: false };
  }

  let sortedFiles: FileInfo[];
  
  switch (sortBy) {
    case 'complexity':
      sortedFiles = files
        .filter(f => f.complexity && f.complexity > 0)
        .sort((a, b) => (b.complexity || 0) - (a.complexity || 0));
      break;
    case 'size':
      sortedFiles = files
        .filter(f => f.size && f.size > 0)
        .sort((a, b) => (b.size || 0) - (a.size || 0));
      break;
    case 'path':
    default:
      sortedFiles = files.sort((a, b) => a.path.localeCompare(b.path));
      break;
  }

  return {
    files: sortedFiles.slice(0, PERFORMANCE_LIMITS.MAX_FILE_LIST_DISPLAY),
    isOptimized: true
  };
}

/**
 * Optimize language statistics for display
 */
export function optimizeLanguageStats(
  languageStats: Record<string, any>
): { stats: Record<string, any>; isOptimized: boolean } {
  const entries = Object.entries(languageStats);
  
  if (entries.length <= PERFORMANCE_LIMITS.MAX_LANGUAGE_DISPLAY) {
    return { stats: languageStats, isOptimized: false };
  }

  // Sort by lines of code and take top languages
  const sortedEntries = entries
    .sort(([,a], [,b]) => (b.loc || b.count) - (a.loc || a.count))
    .slice(0, PERFORMANCE_LIMITS.MAX_LANGUAGE_DISPLAY - 1);

  // Aggregate remaining languages as "Others"
  const remainingEntries = entries.slice(PERFORMANCE_LIMITS.MAX_LANGUAGE_DISPLAY - 1);
  const othersStats = remainingEntries.reduce(
    (acc, [, stats]) => ({
      count: acc.count + (stats.count || 0),
      loc: acc.loc + (stats.loc || 0),
      avgComplexity: (acc.avgComplexity + (stats.avgComplexity || 0)) / 2
    }),
    { count: 0, loc: 0, avgComplexity: 0 }
  );

  const optimizedStats = Object.fromEntries(sortedEntries);
  if (remainingEntries.length > 0) {
    optimizedStats.Others = othersStats;
  }

  return { stats: optimizedStats, isOptimized: true };
}

/**
 * Create chunked array for virtual scrolling
 */
export function createChunks<T>(array: T[], chunkSize: number = PERFORMANCE_LIMITS.CHUNK_SIZE): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Check if performance optimizations should be applied
 */
export function shouldOptimize(analysisResult: AnalysisResult): {
  files: boolean;
  dependencies: boolean;
  commits: boolean;
  languages: boolean;
} {
  const fileCount = analysisResult.files?.length || 0;
  const dependencyCount = analysisResult.dependencyGraph?.nodes?.length || 0;
  const commitCount = analysisResult.commits?.length || 0;
  
  // Count unique languages from files
  const uniqueLanguages = new Set(
    (analysisResult.files || [])
      .map(f => f.language)
      .filter(lang => lang && lang !== 'text')
  );
  const languageCount = uniqueLanguages.size;

  return {
    files: fileCount > PERFORMANCE_LIMITS.MAX_FILE_LIST_DISPLAY,
    dependencies: dependencyCount > PERFORMANCE_LIMITS.MAX_DEPENDENCY_NODES,
    commits: commitCount > PERFORMANCE_LIMITS.MAX_COMMITS_DISPLAY,
    languages: languageCount > PERFORMANCE_LIMITS.MAX_LANGUAGE_DISPLAY
  };
}

/**
 * Format large numbers for display
 */
export function formatLargeNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toLocaleString();
}

/**
 * Debounce function for search/filter operations
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

/**
 * Virtual scrolling hook for large lists
 */
export function useVirtualScrolling(
  itemCount: number,
  itemHeight: number,
  containerHeight: number
): {
  startIndex: number;
  endIndex: number;
  visibleItems: number;
  shouldUseVirtual: boolean;
} {
  const shouldUseVirtual = itemCount > PERFORMANCE_LIMITS.VIRTUAL_SCROLL_THRESHOLD;
  const visibleItems = Math.ceil(containerHeight / itemHeight);
  
  if (!shouldUseVirtual) {
    return {
      startIndex: 0,
      endIndex: itemCount - 1,
      visibleItems: itemCount,
      shouldUseVirtual: false
    };
  }

  // In a real implementation, this would track scroll position
  // For now, return the first set of visible items
  return {
    startIndex: 0,
    endIndex: Math.min(visibleItems, itemCount - 1),
    visibleItems,
    shouldUseVirtual: true
  };
}
