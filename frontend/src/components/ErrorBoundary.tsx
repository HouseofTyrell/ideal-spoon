import { Component, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="error-boundary">
          <div className="error-content">
            <h2>Something went wrong</h2>
            <p className="error-message">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button className="btn btn-primary" onClick={this.handleReset}>
              Try Again
            </button>
          </div>

          <style>{`
            .error-boundary {
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 300px;
              padding: 2rem;
            }

            .error-content {
              text-align: center;
              max-width: 400px;
            }

            .error-content h2 {
              color: var(--error);
              margin-bottom: 1rem;
            }

            .error-message {
              color: var(--text-muted);
              margin-bottom: 1.5rem;
              font-family: var(--font-mono);
              font-size: 0.875rem;
              background-color: var(--bg-secondary);
              padding: 1rem;
              border-radius: var(--radius-sm);
              word-break: break-word;
            }
          `}</style>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
