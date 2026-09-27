import { Component, type ReactNode } from 'react';

/** In caso di errore mostra il messaggio invece di una pagina nera. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="safe-top flex flex-col gap-4 p-6">
        <h1 className="text-2xl font-bold">Qualcosa è andato storto</h1>
        <pre id="app-error" className="whitespace-pre-wrap rounded-xl bg-card p-3 text-sm text-red-300">
          {this.state.error.message}
          {'\n'}
          {this.state.error.stack}
        </pre>
        <button type="button" className="rounded-2xl bg-line p-4 text-lg" onClick={() => location.reload()}>
          Ricarica
        </button>
      </div>
    );
  }
}
