import React from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  Plus,
  FileCheck2,
  Tv,
  Camera,
  Search,
  Sparkles,
  Command,
  Zap,
} from "lucide-react";

export function QuickActionsBar() {
  const navigate = useNavigate();

  const triggerSpotlight = () => {
    // Simula Ctrl+K para abrir o GlobalSpotlightCommand
    const event = new KeyboardEvent("keydown", {
      key: "k",
      ctrlKey: true,
      bubbles: true,
    });
    document.dispatchEvent(event);
  };

  return (
    <div className="rounded-2xl border border-primary/20 bg-gradient-to-r from-card via-background to-card p-3 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">
            <Zap className="size-4 animate-pulse fill-current" />
          </div>
          <div>
            <div className="font-bold text-xs sm:text-sm text-foreground flex items-center gap-1.5">
              <span>Central de Ações Rápidas</span>
              <span className="text-[10px] text-muted-foreground font-normal hidden md:inline">
                • Fluxo comercial & operacional OOH
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Acesse tarefas rotineiras com 1 clique ou navegue pelo teclado
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Nova Proposta */}
          <Button
            size="sm"
            onClick={() => navigate({ to: "/propostas" })}
            className="h-8 text-xs gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-2xs"
          >
            <Plus className="size-3.5" />
            <span>Nova Proposta</span>
          </Button>

          {/* Emitir PIs Pendentes */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate({ to: "/pi" })}
            className="h-8 text-xs gap-1.5 border-emerald-500/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 font-semibold"
          >
            <FileCheck2 className="size-3.5 text-emerald-600" />
            <span>Emitir PIs</span>
          </Button>

          {/* Cadastrar Ponto/Ativo */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate({ to: "/produtos" })}
            className="h-8 text-xs gap-1.5 border-sky-500/40 text-sky-700 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/40 font-semibold"
          >
            <Tv className="size-3.5 text-sky-600" />
            <span>Cadastrar Ponto</span>
          </Button>

          {/* Subir Comprovante de Checking */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate({ to: "/historico-veiculacao" })}
            className="h-8 text-xs gap-1.5 border-purple-500/40 text-purple-700 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 font-semibold"
          >
            <Camera className="size-3.5 text-purple-600" />
            <span className="hidden sm:inline">Subir Checking</span>
            <span className="sm:hidden">Checking</span>
          </Button>

          {/* Spotlight Trigger */}
          <button
            type="button"
            onClick={triggerSpotlight}
            className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-dashed border-border bg-muted/40 hover:bg-muted text-[11px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title="Abrir busca global rápida (Ctrl+K)"
          >
            <Search className="size-3" />
            <kbd className="hidden sm:inline-flex items-center font-mono text-[9px] font-semibold bg-background px-1 py-0.2 rounded border">
              Ctrl+K
            </kbd>
          </button>
        </div>
      </div>
    </div>
  );
}
