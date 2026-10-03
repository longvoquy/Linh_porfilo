"use client";

import { Component, type ReactNode } from "react";

type Props = { fallback: ReactNode; children: ReactNode };
type State = { failed: boolean };

/** Renders `fallback` if anything below throws — e.g. the 3D scene failing to start. */
export class ExhibitionErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.warn("3D exhibition unavailable, showing the list instead:", error);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
