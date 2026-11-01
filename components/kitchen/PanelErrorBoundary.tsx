"use client";
import { Component, type ReactNode } from "react";

// One broken card in a panel (a data feed returning something odd) shows a quiet
// note instead of taking the whole kitchen screen down with it.
export class PanelErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return <p className="pt-4 text-muted">couldn&apos;t load this just now — try again in a bit.</p>;
    }
    return this.props.children;
  }
}
