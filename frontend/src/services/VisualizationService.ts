// File: src/services/VisualizationService.ts
// New: Data transformation for visualizations

import { ProcessedCommit } from '../types'; // Import ProcessedCommit

// interface Commit { // Using ProcessedCommit from ../types instead
//   sha: string;
//   author: string; // Or a more complex author object
//   date: string; // ISO date string
//   message: string;
// }

interface VisualizationNode {
  id: string;
  name: string;
  version?: string;
  type: string;
}

interface VisualizationLink {
  source: string;
  target: string;
  value: number;
}

interface VisualizationData {
  nodes: VisualizationNode[];
  links: VisualizationLink[];
}

export class VisualizationService {
static processD3Data(rawData: unknown): VisualizationData {
    // Validate and extract dependencies array
    if (typeof rawData !== 'object' || rawData === null) {
        return { nodes: [], links: [] };
    }
    
    const dependencies = ('dependencies' in rawData && Array.isArray(rawData.dependencies)) 
        ? rawData.dependencies 
        : [];

    const nodes: VisualizationNode[] = dependencies
        .filter((dep): dep is Record<string, unknown> => typeof dep === 'object' && dep !== null)
        .map(dep => {
            const name = 'name' in dep && typeof dep.name === 'string' ? dep.name : 'unknown';
            const version = 'version' in dep && typeof dep.version === 'string' ? dep.version : undefined;
            const isDev = 'isDev' in dep && typeof dep.isDev === 'boolean' ? dep.isDev : false;
            
            return {
                id: name,
                name,
                version,
                type: isDev ? 'devDependency' : 'dependency'
            };
        });

    const links: VisualizationLink[] = dependencies
        .filter((dep): dep is Record<string, unknown> => typeof dep === 'object' && dep !== null)
        .flatMap(dep => {
            const name = 'name' in dep && typeof dep.name === 'string' ? dep.name : 'unknown';
            const depsArray = ('dependencies' in dep && Array.isArray(dep.dependencies)) 
                ? dep.dependencies 
                : [];
            
            return depsArray
                .filter((target): target is string => typeof target === 'string')
                .map(target => ({
                    source: name,
                    target,
                    value: 1
                }));
        });

    return { nodes, links };
  }

  static createCommitTimeline(commits: ProcessedCommit[]) { // Use Imported ProcessedCommit
    return commits.map(commit => ({
      date: new Date(commit.date), // Convert date string to Date object
      author: commit.author,
      message: commit.message,
      sha: commit.sha
    }));
  }
}
