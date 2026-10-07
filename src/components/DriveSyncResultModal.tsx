import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  CheckCircle2,
  ExternalLink,
  FolderSync,
  FileText,
  FileSpreadsheet,
  Package,
  Layers,
  Building2,
  Paperclip,
  ShieldCheck,
} from "lucide-react";
import type { DriveSyncSummary } from "@/types/drive-sync.types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  summary: DriveSyncSummary | null;
}

export function DriveSyncResultModal({ open, onOpenChange, summary }: Props) {
  if (!summary) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-600/10 text-purple-600 dark:text-purple-400">
              <FolderSync className="size-6" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                Sincronização com Google Drive Concluída
                <Badge variant="outline" className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-300">
                  <ShieldCheck className="size-3 mr-1" />
                  100% Idempotente
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Pastas, materiais e inventário integrados ao inquilino CNPJ {summary.tenantCnpj}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* 4 Cards de Resumo */}
        <div className="p-6 pb-2 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="border-border/60 shadow-2xs bg-purple-50/40 dark:bg-purple-950/20">
            <CardContent className="p-3 text-center">
              <span className="text-[11px] text-muted-foreground font-medium flex items-center justify-center gap-1">
                <Building2 className="size-3 text-purple-600" /> Novos Parceiros
              </span>
              <p className="text-2xl font-bold text-purple-700 dark:text-purple-300 mt-0.5">
                {summary.novosParceiros}
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-2xs bg-blue-50/40 dark:bg-blue-950/20">
            <CardContent className="p-3 text-center">
              <span className="text-[11px] text-muted-foreground font-medium flex items-center justify-center gap-1">
                <Package className="size-3 text-blue-600" /> Produtos / Tabelas
              </span>
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-300 mt-0.5">
                {summary.produtosAtualizados}
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-2xs bg-indigo-50/40 dark:bg-indigo-950/20">
            <CardContent className="p-3 text-center">
              <span className="text-[11px] text-muted-foreground font-medium flex items-center justify-center gap-1">
                <Paperclip className="size-3 text-indigo-600" /> Arquivos Anexados
              </span>
              <p className="text-2xl font-bold text-indigo-700 dark:text-indigo-300 mt-0.5">
                {summary.arquivosAnexados}
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-2xs bg-emerald-50/40 dark:bg-emerald-950/20">
            <CardContent className="p-3 text-center">
              <span className="text-[11px] text-muted-foreground font-medium flex items-center justify-center gap-1">
                <CheckCircle2 className="size-3 text-emerald-600" /> Itens Duplicados
              </span>
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 mt-0.5">
                {summary.itensDuplicados}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Parceiros Processados */}
        <div className="px-6 py-2 flex-1 min-h-0 flex flex-col">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Detalhamento por Parceiro / Veículo ({summary.detalhes.length} processados)
          </p>
          <ScrollArea className="flex-1 border rounded-lg p-3 bg-muted/10">
            <div className="space-y-2.5">
              {summary.detalhes.map((p, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg border bg-card/60 hover:bg-card transition-colors flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-foreground">{p.nome}</span>
                      <Badge
                        variant="secondary"
                        className={
                          p.status === "criado"
                            ? "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 text-[10px]"
                            : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 text-[10px]"
                        }
                      >
                        {p.status === "criado" ? "Novo Parceiro" : "Atualizado"}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      {p.produtosAtualizados > 0 && (
                        <span className="inline-flex items-center gap-0.5 font-medium text-blue-600 dark:text-blue-400">
                          <Package className="size-3" /> {p.produtosAtualizados} itens
                        </span>
                      )}
                      {p.arquivosAnexados > 0 && (
                        <span className="inline-flex items-center gap-0.5 font-medium text-indigo-600 dark:text-indigo-400 ml-2">
                          <Paperclip className="size-3" /> {p.arquivosAnexados} anexos
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Arquivos do parceiro com links diretos */}
                  {p.arquivos && p.arquivos.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1 border-t border-border/40">
                      {p.arquivos.map((arq, aIdx) => (
                        <a
                          key={aIdx}
                          href={arq.viewUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-muted hover:bg-purple-50 dark:hover:bg-purple-950/40 text-muted-foreground hover:text-purple-600 transition-colors border border-border/60"
                        >
                          {arq.type === "xlsx" ? (
                            <FileSpreadsheet className="size-3 text-emerald-600" />
                          ) : (
                            <FileText className="size-3 text-rose-500" />
                          )}
                          <span className="truncate max-w-[220px]">{arq.name}</span>
                          <ExternalLink className="size-2.5 opacity-60" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter className="p-4 border-t bg-muted/20 sm:justify-between flex items-center">
          <span className="text-xs text-muted-foreground">
            Sincronização executada em {new Date(summary.timestamp).toLocaleTimeString("pt-BR")}
          </span>
          <Button onClick={() => onOpenChange(false)} className="bg-purple-600 hover:bg-purple-700 text-white">
            Concluir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
