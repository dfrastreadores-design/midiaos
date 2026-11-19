import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary] Capturou erro não tratado:", error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleSignOut = async () => {
    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      /* ignore */
    }
    window.location.href = "/login?logout=1";
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6 select-none">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl text-center">
            <div className="size-14 mx-auto rounded-full bg-rose-100 dark:bg-rose-950/50 flex items-center justify-center text-rose-600 dark:text-rose-400 mb-4">
              <AlertTriangle className="size-7" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Ocorreu um erro inesperado
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 mb-4 leading-relaxed">
              O sistema interrompeu a execução para proteger seus dados. Você pode recarregar a tela ou reiniciar sua sessão com segurança.
            </p>
            {this.state.error?.message && (
              <div className="bg-slate-100 dark:bg-slate-800/60 rounded-lg p-3 mb-6 text-left">
                <p className="text-xs font-mono text-slate-600 dark:text-slate-300 break-words line-clamp-3">
                  {this.state.error.message}
                </p>
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                onClick={this.handleReload}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all shadow-sm"
              >
                <RefreshCw className="size-4" /> Recarregar Aplicação
              </button>
              <button
                type="button"
                onClick={this.handleSignOut}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-medium transition-all"
              >
                <LogOut className="size-4" /> Sair da Conta
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
