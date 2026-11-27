import { Component, type ReactNode } from "react";

/* Keeps one broken view from blanking the whole platform during a demo. */
export default class ErrorBoundary extends Component<{ children: ReactNode; name?: string }, { err: Error | null }> {
  state = { err: null as Error | null };
  static getDerivedStateFromError(err: Error) {
    return { err };
  }
  componentDidCatch(err: Error) {
    console.error("[" + (this.props.name || "view") + "]", err);
  }
  render() {
    if (this.state.err) {
      return (
        <div className="fm-page">
          <div className="fm-note bad">
            This view hit a problem and was stopped so the rest of the platform keeps working.
            <div style={{ marginTop: 10 }}>
              <button className="fm-btn sm" onClick={() => this.setState({ err: null })}>Try again</button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
