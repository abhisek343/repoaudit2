import React from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

interface ErrorDisplayProps {
  message: string;
  title?: string;
  type?: 'error' | 'warning' | 'info';
  showRetry?: boolean;
  showHome?: boolean;
  onRetry?: () => void;
  onHome?: () => void;
  className?: string;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  message,
  title = "Something went wrong",
  type = 'error',
  showRetry = false,
  showHome = false,
  onRetry,
  onHome,
  className = ""
}) => {
  const getTypeStyles = () => {
    switch (type) {
      case 'warning':
        return {
          container: 'bg-yellow-50 border-yellow-200',
          icon: 'text-yellow-600',
          title: 'text-yellow-800',
          message: 'text-yellow-700',
          button: 'bg-yellow-100 hover:bg-yellow-200 text-yellow-800 border-yellow-300'
        };
      case 'info':
        return {
          container: 'bg-blue-50 border-blue-200',
          icon: 'text-blue-600',
          title: 'text-blue-800',
          message: 'text-blue-700',
          button: 'bg-blue-100 hover:bg-blue-200 text-blue-800 border-blue-300'
        };
      default: // error
        return {
          container: 'bg-red-50 border-red-200',
          icon: 'text-red-600',
          title: 'text-red-800',
          message: 'text-red-700',
          button: 'bg-red-100 hover:bg-red-200 text-red-800 border-red-300'
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <div className={`rounded-lg border p-4 ${styles.container} ${className}`}>
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <AlertCircle className={`h-5 w-5 ${styles.icon}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={`text-sm font-medium ${styles.title}`}>
            {title}
          </h3>
          <div className={`mt-1 text-sm ${styles.message}`}>
            <p>{message}</p>
          </div>
          {(showRetry || showHome) && (
            <div className="mt-4 flex space-x-2">
              {showRetry && onRetry && (
                <button
                  onClick={onRetry}
                  className={`inline-flex items-center px-3 py-2 border text-sm font-medium rounded-md transition-colors duration-200 ${styles.button}`}
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Try Again
                </button>
              )}
              {showHome && onHome && (
                <button
                  onClick={onHome}
                  className={`inline-flex items-center px-3 py-2 border text-sm font-medium rounded-md transition-colors duration-200 ${styles.button}`}
                >
                  <Home className="h-4 w-4 mr-1" />
                  Go Home
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ErrorDisplay;
