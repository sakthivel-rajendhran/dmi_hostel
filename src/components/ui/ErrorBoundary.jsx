"use client";

import React, { Component } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button.jsx";

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // TODO(BACKEND): Sentry.captureException(error, { extra: errorInfo });
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          role="alert"
          className="p-6 rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 text-center my-4"
        >
          <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-3">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
            {this.props.title || "Unable to display this section"}
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-4">
            {this.state.error?.message || "A rendering issue occurred in this component."}
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={this.handleRetry}
            className="border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Reload Section
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
