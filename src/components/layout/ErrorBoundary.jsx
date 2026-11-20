"use client";

import React from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/Button.jsx";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-xl text-center">
            <div className="w-16 h-16 rounded-2xl bg-danger/10 text-danger flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-text-dark dark:text-white mb-2">
              Something went wrong
            </h2>
            <p className="text-sm text-text-muted dark:text-slate-400 mb-6 leading-relaxed">
              An unexpected error occurred in the hostel management portal. You can reload this page or return home.
            </p>
            {this.state.error?.message && (
              <pre className="text-xs text-left bg-slate-100 dark:bg-slate-950 p-3 rounded-xl overflow-x-auto text-danger mb-6 font-mono">
                {this.state.error.message}
              </pre>
            )}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button variant="outline" onClick={this.handleReload} leftIcon={RefreshCw}>
                Reload Page
              </Button>
              <Button onClick={this.handleGoHome} leftIcon={Home}>
                Back to Login
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
