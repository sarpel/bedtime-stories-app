import React from 'react'

interface ErrorBoundaryProps {
  children: React.ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

// Extend window interface for analytics service
declare global {
  interface Window {
    analyticsService?: {
      trackError: (event: string, message: string, data: any) => void
    }
  }
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error: null, errorInfo: null }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log the error to console and analytics
    console.error('ErrorBoundary caught an error:', error, errorInfo)

    this.setState({
      error: error,
      errorInfo: errorInfo
    })

    // Track error in analytics if available
    if (window.analyticsService) {
      window.analyticsService.trackError('react_error_boundary', error.message, {
        stack: error.stack,
        componentStack: errorInfo.componentStack
      })
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  render() {
    if (this.state.hasError) {
      // Fallback UI
      return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
          <div className="bg-white/10 backdrop-blur-md rounded-lg p-8 max-w-md w-full border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-4">
              Oops! Bir Hata Oluştu
            </h2>
            <p className="text-white/80 mb-6">
              Uygulama beklenmedik bir hatayla karşılaştı. Lütfen sayfayı yenileyin veya tekrar deneyin.
            </p>

            <div className="space-y-4">
              <button
                onClick={this.handleRetry}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg transition-colors"
              >
                Tekrar Dene
              </button>

              <button
                onClick={() => window.location.reload()}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg transition-colors"
              >
                Sayfayı Yenile
              </button>
            </div>

            {import.meta.env.DEV && this.state.error && (
              <details className="mt-6">
                <summary className="text-white/60 cursor-pointer">
                  Geliştirici Detayları
                </summary>
                <div className="mt-2 text-xs text-white/60 overflow-auto max-h-40">
                  <div className="font-mono">
                    <p><strong>Error:</strong> {this.state.error && this.state.error.toString()}</p>
                    <p><strong>Stack:</strong></p>
                    <pre className="whitespace-pre-wrap">{this.state.error && this.state.error.stack}</pre>
                  </div>
                </div>
              </details>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
