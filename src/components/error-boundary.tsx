import React, { type ReactNode, type ErrorInfo } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

const isTransientDomError = (error: Error | null) => {
  const message = String(error?.message || "").toLowerCase();
  return message.includes("removechild") || message.includes("notfounderror") || message.includes("failed to execute 'removechild'");
};

export class ErrorBoundary extends React.Component<Props, State> {
  private recoveryTimer: ReturnType<typeof setTimeout> | null = null;
  private recoveryAttempted = false;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Error caught by ErrorBoundary:", error, errorInfo);

    if (isTransientDomError(error) && !this.recoveryAttempted) {
      this.recoveryAttempted = true;
      this.recoveryTimer = setTimeout(() => {
        // A DOM tree can be momentarily out of sync with React during auth redirects,
        // browser restore, or extension-driven mutations. Re-mount the app once before
        // showing a fatal error screen to the user.
        this.setState({ hasError: false, error: null });
      }, 0);
    }
  }

  componentWillUnmount() {
    if (this.recoveryTimer) clearTimeout(this.recoveryTimer);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-red-50 p-4">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h1>
            <p className="text-gray-600 mb-4">
              {this.state.error?.message || "An unexpected error occurred"}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
