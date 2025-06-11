import { FileInfo as ExtendedFileInfo } from '../types'; // Use FileInfo, aliased for minimal changes if needed

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
  startLine: number; // Added for consistency
  endLine: number;   // Added for consistency
}

export async function checkLLMAvailability(llmConfig?: import('../types').LLMConfig): Promise<boolean> { // llmConfig might be needed for backend check
  try {
    const response = await fetch('/api/llm/check', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ llmConfig }),
    });
    if (response.ok) {
        const data = await response.json();
        return data.success;
    }
    return false;
  } catch (error) {
    console.error('Error checking LLM availability:', error);
    return false;
  }
}

export async function enhanceDiagram(
  diagram: string,
  fileInfo: Record<string, ExtendedFileInfo>
): Promise<LLMResponse> { // This function might be deprecated if all enhancements go through a generic backend endpoint
  try {
    // This should ideally use a configured LLMConfig
    const savedLlmConfig = localStorage.getItem('llmConfig');
    if (!savedLlmConfig) {
        return { enhancedDiagram: diagram, error: 'LLM configuration not found.' };
    }
    const llmConfig = JSON.parse(savedLlmConfig);

    const response = await fetch('/api/llm/enhance-diagram', { // Backend endpoint
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ llmConfig, diagramType: 'mermaid', diagramCode: diagram, fileInfo }) // Pass necessary info
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to enhance diagram';
    console.error('Error enhancing diagram:', errorMessage);
    return {
      enhancedDiagram: diagram,
      error: errorMessage
    };
  }
}

// Helper function to generate detailed function connections
export function generateFunctionConnections(fileInfo: Record<string, ExtendedFileInfo>): string {
  const connections: string[] = [];

  // Process each file
  Object.entries(fileInfo).forEach(([fileId, file]) => {
    if (file.functions) {
      // Process each function in the file (ensure file.functions matches FunctionInfo)
      file.functions.forEach((func: FunctionInfo) => {
        // Add function node
        connections.push(`${fileId}_${func.name}["${func.name}<br/>${func.complexity}% complex"]`);

// Add function dependencies
// (No operation for dependencies yet)

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
    connections.push(`${fileId}["${file.name}<br/>Complexity: ${file.complexity || 0}%<br/>Size: ${file.size}b"]`);

    // Add file dependencies
    (file.dependencies || []).forEach((dep: string) => {
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
