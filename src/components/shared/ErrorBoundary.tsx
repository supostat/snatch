import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
          <div className="border border-hacker-red bg-hacker-surface p-6 max-w-md">
            <div className="text-hacker-red font-mono text-sm uppercase tracking-widest mb-4">
              [ SYSTEM ERROR ]
            </div>
            <div className="text-hacker-text font-mono text-xs mb-4">
              {this.state.error.message}
            </div>
            <button
              onClick={() => this.setState({ error: null })}
              className="border border-hacker-red text-hacker-red px-4 py-2 font-mono text-xs uppercase tracking-widest
                hover:bg-hacker-red hover:text-hacker-bg transition-all duration-200 cursor-pointer"
            >
              [ RETRY ]
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
