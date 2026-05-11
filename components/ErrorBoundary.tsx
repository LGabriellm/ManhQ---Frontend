"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

// ─── Types ───────────────────────────────────────────────────────────

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// ─── Component ───────────────────────────────────────────────────────

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-[200px] w-full items-center justify-center rounded-2xl border border-white/8 bg-[#1e1e1e]/60 p-6">
          <div className="text-center">
            <p className="text-sm font-semibold text-[#e5e5e5]">
              Erro ao carregar
            </p>
            {this.state.error?.message && (
              <p className="mt-1 text-xs text-[#a3a3a3] line-clamp-2">
                {this.state.error.message}
              </p>
            )}
            <button
              type="button"
              onClick={this.handleRetry}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[#e50914] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#e50914]/90 active:scale-95"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
