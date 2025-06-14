import React from 'react';

// Base node types
export interface DependencyNode {
  id: string;
  name: string;
  path: string;
  group: number;
  [key: string]: string | number | undefined;
}

export interface DependencyLink {
  source: string;
  target: string;
  strength: number;
  [key: string]: string | number | undefined;
}

// Specific Diagram Data Structures
export interface DependencyWheelNode {
  source: string;
  target: string;
  value: number;
}

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size: number;
  children?: FileNode[];
}

export interface RouteNode {
  name: string;
  path: string;
  method?: string;
  file?: string;
  children?: RouteNode[];
}

export interface FeatureFileMatrix {
  features: string[];
  files: string[];
  matrix: number[][];
}

export interface ChurnNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  churnRate: number;
  children?: ChurnNode[];
}

export interface TemporalCouplingData {
  nodes: DependencyNode[];
  links: DependencyLink[];
}

export interface ContributorStreamPoint {
  date: string;
  contributors: { [key: string]: number };
  [key: string]: number | string | { [key: string]: number }; // Contributor names as keys
}

export interface SankeyNode {
  id: string;
  name: string;
  category: string;
  [key: string]: string | number | undefined;
}

export interface SankeyLink {
  source: string;
  target: string;
  value: number;
}

export interface DataTransformationSankey {
  nodes: SankeyNode[];
  links: SankeyLink[];
}

export interface PRPhase {
  name: string;
  duration: number;
  color: string;
  icon: React.ReactNode | string;
}

export interface PRLifecycleData {
  phases: PRPhase[];
  totalDuration: number;
}

export interface ApiEndpoint {
  path: string;
  method: string;
  file: string;
}

// Main container for all advanced analysis data
export interface AdvancedAnalysisResult {
  dependencyWheelData?: DependencyWheelNode[];
  fileSystemTree?: FileNode;
  apiEndpoints?: ApiEndpoint[];
  featureFileMatrixData?: FeatureFileMatrix;
  churnSunburstData?: ChurnNode;
  temporalCouplingData?: TemporalCouplingData;
  contributorStreamData?: ContributorStreamPoint[];
  dataTransformationSankey?: DataTransformationSankey;
  prLifecycleData?: PRLifecycleData;
}
