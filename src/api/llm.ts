import { ExtendedFileInfo } from '../types';

interface LLMResponse {
  enhancedDiagram: string;
  error?: string;
}

interface FunctionInfo {
  name: string;
  complexity: number;
  dependencies: string[];
  calls: string[];
  description?: string;
}

export async function checkLLMAvailability(): Promise<boolean> {
  try {
    const response = await fetch('/api/llm/check');
    return response.ok;
  } catch (error) {
    console.warn('LLM service not available:', error);
    return false;
  }
}

export async function enhanceDiagram(
  diagram: string,
  fileInfo: Record<string, ExtendedFileInfo>
): Promise<LLMResponse> {
  try {
    const response = await fetch('/api/llm/enhance-diagram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ diagram, fileInfo })
    });

    if (!response.ok) {
      throw new Error('Failed to enhance diagram with LLM');
    }

    return await response.json();
  } catch (error) {
    console.error('Error enhancing diagram:', error);
    return {
      enhancedDiagram: diagram,
      error: error instanceof Error ? error.message : 'Failed to enhance diagram'
    };
  }
}

// Helper function to generate detailed function connections
export function generateFunctionConnections(fileInfo: Record<string, ExtendedFileInfo>): string {
  const connections: string[] = [];

  // Process each file
  Object.entries(fileInfo).forEach(([fileId, file]) => {
    if (file.functions) {
      // Process each function in the file
      file.functions.forEach((func: FunctionInfo) => {
        // Add function node
        connections.push(`${fileId}_${func.name}["${func.name}<br/>${func.complexity}% complex"]`);

        // Add function dependencies
        func.dependencies.forEach((dep: string) => {
const safeName = func.name.replace(/[^\w]/g, '_');
const nodeId = `${fileId}_${safeName}`;
        });

        // Add function calls
        func.calls.forEach((call: string) => {
          connections.push(`${fileId}_${func.name} --> ${call}`);
        });
      });
    }
  });

  return connections.join('\n');
}

// Helper function to generate detailed component connections
export function generateComponentConnections(fileInfo: Record<string, ExtendedFileInfo>): string {
  const connections: string[] = [];

  // Process each file
  Object.entries(fileInfo).forEach(([fileId, file]) => {
    // Add file node with metrics
    connections.push(`${fileId}["${file.name}<br/>Complexity: ${file.complexity}%<br/>Size: ${file.size}b"]`);

    // Add file dependencies
    file.dependencies.forEach((dep: string) => {
      connections.push(`${fileId} --> ${dep}`);
    });
  });

  return connections.join('\n');
}

// Helper function to generate detailed architecture diagram
export function generateDetailedArchitectureDiagram(
  baseDiagram: string,
  fileInfo: Record<string, ExtendedFileInfo>
): string {
  // Extract existing diagram structure
  const lines = baseDiagram.split('\n');
  const diagramLines: string[] = [];
  const subgraphLines: string[] = [];
  let inSubgraph = false;

  // Process each line
  lines.forEach(line => {
    if (line.trim().startsWith('subgraph')) {
      inSubgraph = true;
      subgraphLines.push(line);
    } else if (line.trim() === 'end') {
      inSubgraph = false;
      subgraphLines.push(line);
    } else if (inSubgraph) {
      subgraphLines.push(line);
    } else {
      diagramLines.push(line);
    }
  });

  // Generate detailed connections
  const functionConnections = generateFunctionConnections(fileInfo);
  const componentConnections = generateComponentConnections(fileInfo);

  // Combine everything
  return [
    ...diagramLines,
    ...subgraphLines,
    '\n%% Detailed Function Connections',
    functionConnections,
    '\n%% Detailed Component Connections',
    componentConnections
  ].join('\n');
} 