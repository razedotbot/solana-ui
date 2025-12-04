import { Component, type ReactNode, type ErrorInfo } from 'react';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, errorInfo: ErrorInfo, reset: () => void) => ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(_error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  resetError = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  override render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback && this.state.error && this.state.errorInfo) {
        return this.props.fallback(this.state.error, this.state.errorInfo, this.resetError);
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-app-primary flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-app-secondary border border-app-primary-40 rounded-lg p-6 shadow-xl">
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
            </div>
            
            <h1 className="text-xl font-bold text-app-primary text-center mb-2 font-mono">
              Something went wrong
            </h1>
            
            <p className="text-sm text-app-tertiary text-center mb-6 font-mono">
              An unexpected error occurred. Please try refreshing the page or return to the homepage.
            </p>

            {this.state.error && import.meta.env.DEV && (
              <div className="mb-6 p-4 bg-app-primary rounded border border-app-primary-40 overflow-auto max-h-48">
                <p className="text-xs font-mono text-red-400 mb-2">
                  {this.state.error.toString()}
                </p>
                {this.state.errorInfo && (
                  <pre className="text-xs font-mono text-app-secondary whitespace-pre-wrap">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => window.location.href = '/'}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-app-primary-10 hover:bg-app-primary-20 border border-app-primary-40 rounded-lg transition-colors font-mono text-sm"
              >
                <Home size={16} />
                <span>Go Home</span>
              </button>
              
              <button
                onClick={() => window.location.reload()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-app-primary-color hover:bg-app-primary-dark text-app-primary border border-app-primary rounded-lg transition-colors font-mono text-sm"
              >
                <RefreshCw size={16} />
                <span>Reload</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

