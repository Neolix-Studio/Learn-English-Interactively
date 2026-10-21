import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children?: ReactNode;
  // What to show instead of the children; `retry` renders them again.
  fallback: (error: Error, retry: () => void) => ReactNode;
  // A new value clears the error, so moving to another route leaves the fallback (RouteBoundary).
  resetKey?: unknown;
}

interface State {
  error: Error | null;
  resetKey?: unknown;
}

// Catches a render error below it. main.tsx has one around the whole app, RouteBoundary one around the
// routes (UX3-2, #400; N4).
export class ErrorBoundary extends Component<Props, State> {
  public state: State = { error: null, resetKey: this.props.resetKey };

  public static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    return props.resetKey !== state.resetKey ? { error: null, resetKey: props.resetKey } : null;
  }

  private retry = () => this.setState({ error: null });

  public render() {
    if (this.state.error) return this.props.fallback(this.state.error, this.retry);
    return this.props.children;
  }
}
