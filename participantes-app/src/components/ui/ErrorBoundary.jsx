import React from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'
import { Button } from './Button'

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
    if (this.props.onReset) {
      this.props.onReset()
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="p-6 my-4 rounded-2xl border border-red-200 dark:border-red-900/40 bg-red-50/60 dark:bg-red-950/20 text-red-900 dark:text-red-200 space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-red-800 dark:text-red-300">
                {this.props.title || 'Ocurrió un problema al cargar esta sección'}
              </h3>
              <p className="text-xs text-red-700/80 dark:text-red-400/80 leading-relaxed">
                {this.state.error?.message || 'Error inesperado durante el renderizado del componente.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              icon={RotateCcw}
              onClick={this.handleReset}
              className="text-xs border-red-200 hover:bg-red-100/50 dark:border-red-800 dark:hover:bg-red-900/30"
            >
              Reintentar
            </Button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
