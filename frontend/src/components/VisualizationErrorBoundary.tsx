import React from 'react';

interface VisualizationErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface VisualizationErrorBoundaryState {
  hasError: boolean;
}

class VisualizationErrorBoundary extends React.Component<VisualizationErrorBoundaryProps, VisualizationErrorBoundaryState> {
  constructor(props: VisualizationErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): VisualizationErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Visualization error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="visualization-error">
          {this.props.fallback ?? (
            <div>
              <p>Visualization failed to load</p>
              <button onClick={this.handleRetry} className="mt-2 px-3 py-1 bg-indigo-600 text-white rounded">
                Retry
              </button>
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default VisualizationErrorBoundary;
