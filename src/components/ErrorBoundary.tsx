import React from "react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error.message, info.componentStack?.slice(0, 300));
  }
  reset = () => this.setState({ hasError: false, error: undefined });
  render() {
    if (this.state.hasError) {
      if (this.props.fallback !== undefined) return this.props.fallback;
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center bg-background">
          <h1 className="font-display text-4xl font-bold">Algo deu errado</h1>
          <p className="max-w-md text-muted-foreground">
            Ocorreu um erro inesperado. Recarregue a página ou volte ao início.
          </p>
          <div className="flex gap-3">
            <button
              onClick={this.reset}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Tentar novamente
            </button>
            <button
              onClick={() => window.location.reload()}
              className="rounded-md border px-4 py-2 text-sm font-medium"
            >
              Recarregar
            </button>
            <a href="/" className="rounded-md border px-4 py-2 text-sm font-medium">
              Ir ao início
            </a>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
