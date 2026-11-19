import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  FileCheck,
  AlertCircle,
  XCircle,
} from "lucide-react";
import type { ResultadoValidacaoPlanilha } from "@/lib/midia-kit-excel";

interface PlanilhaPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resultado: ResultadoValidacaoPlanilha | null;
  nomeArquivo?: string;
  onConfirmarAplicacao: () => void;
  onReenviarPlanilha: () => void;
}

export function PlanilhaPreviewDialog({
  open,
  onOpenChange,
  resultado,
  nomeArquivo,
  onConfirmarAplicacao,
  onReenviarPlanilha,
}: PlanilhaPreviewDialogProps) {
  if (!resultado) return null;

  const temErros = resultado.erros.length > 0;
  const temAlteracoes = resultado.alteracoes.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[88vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader className="pb-3 border-b shrink-0">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${temErros ? "bg-amber-500/10 text-amber-600" : "bg-emerald-500/10 text-emerald-600"}`}>
              <FileSpreadsheet className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                Prévia da Planilha Corrigida
                {nomeArquivo && (
                  <Badge variant="outline" className="text-xs font-mono">
                    {nomeArquivo}
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Revise os dados antes de aplicar. Nenhuma modificação é gravada até a sua confirmação expressa.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* RESUMO DOS RESULTADOS */}
        <div className="grid grid-cols-3 gap-2 py-2 text-xs">
          <div className="p-2.5 rounded-lg border bg-muted/30">
            <span className="text-muted-foreground block text-[11px]">Total de Linhas</span>
            <span className="text-base font-bold text-foreground">{resultado.totalLinhas}</span>
          </div>

          <div className={`p-2.5 rounded-lg border ${temAlteracoes ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300" : "bg-muted/30"}`}>
            <span className="text-muted-foreground block text-[11px]">Produtos com Alteração</span>
            <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
              {resultado.alteracoes.length}
            </span>
          </div>

          <div className={`p-2.5 rounded-lg border ${temErros ? "bg-red-50/50 dark:bg-red-950/20 border-red-300" : "bg-muted/30"}`}>
            <span className="text-muted-foreground block text-[11px]">Erros Detectados</span>
            <span className={`text-base font-bold ${temErros ? "text-destructive" : "text-emerald-600"}`}>
              {resultado.erros.length}
            </span>
          </div>
        </div>

        {/* CORPO DE PRÉVIA: ERROS E ALTERAÇÕES */}
        <div className="space-y-4 py-2 overflow-y-auto pr-1 flex-1 text-xs">
          {/* TABELA DE ERROS (se houver) */}
          {temErros && (
            <div className="p-3 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50/30 dark:bg-red-950/20 space-y-2">
              <div className="flex items-center gap-2 text-destructive font-semibold">
                <AlertCircle className="size-4" />
                <span>Erros que impedem a aplicação ({resultado.erros.length})</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Corrija os problemas apontados na planilha e envie novamente para garantir a integridade dos dados.
              </p>
              <div className="max-h-40 overflow-y-auto border rounded-lg bg-background">
                <Table>
                  <TableHeader className="bg-muted/50 sticky top-0">
                    <TableRow>
                      <TableHead className="w-16 text-center">Linha</TableHead>
                      <TableHead className="w-32">Coluna</TableHead>
                      <TableHead>Mensagem de Erro</TableHead>
                      <TableHead className="w-24">Valor Inválido</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resultado.erros.map((err, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="text-center font-mono font-semibold text-red-600">
                          {err.linha}
                        </TableCell>
                        <TableCell className="font-mono text-[11px]">{err.coluna}</TableCell>
                        <TableCell className="text-foreground">{err.mensagem}</TableCell>
                        <TableCell className="font-mono text-muted-foreground text-[10px] truncate max-w-[120px]">
                          {String(err.valorInvalido ?? "-")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* LISTA DE ALTERAÇÕES DETECTADAS */}
          {temAlteracoes ? (
            <div className="space-y-2">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <FileCheck className="size-4 text-emerald-600" />
                Alterações que serão aplicadas ({resultado.alteracoes.length} produtos):
              </span>

              <div className="border rounded-lg divide-y max-h-64 overflow-y-auto bg-background">
                {resultado.alteracoes.map((alt) => (
                  <div key={alt.id_temp} className="p-2.5 space-y-1.5 hover:bg-muted/20 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-foreground">{alt.nomeProduto}</span>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {alt.id_temp}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] pl-2">
                      {alt.camposAlterados.map((c, cIdx) => (
                        <div key={cIdx} className="flex items-center gap-1.5 p-1 rounded bg-muted/40">
                          <span className="text-muted-foreground font-medium">{c.rotulo}:</span>
                          <span className="line-through text-muted-foreground truncate max-w-[90px]">
                            {String(c.valorAntigo || "(vazio)")}
                          </span>
                          <ArrowRight className="size-3 text-primary shrink-0" />
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400 truncate max-w-[120px]">
                            {String(c.valorNovo || "(vazio)")}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : !temErros ? (
            <div className="p-6 text-center text-muted-foreground border rounded-xl space-y-2">
              <CheckCircle2 className="size-8 mx-auto text-emerald-600 opacity-80" />
              <p className="font-semibold text-foreground">Nenhuma alteração detectada</p>
              <p className="text-xs">Os valores da planilha são idênticos aos produtos já extraídos.</p>
            </div>
          ) : null}
        </div>

        <DialogFooter className="pt-3 border-t flex flex-row items-center justify-between sm:justify-between shrink-0">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="text-xs">
            Fechar
          </Button>

          <div className="flex items-center gap-2">
            {temErros && (
              <Button type="button" variant="outline" size="sm" onClick={onReenviarPlanilha} className="text-xs gap-1">
                Tentar Novamente com Outro Arquivo
              </Button>
            )}

            <Button
              type="button"
              onClick={onConfirmarAplicacao}
              disabled={!resultado.podeAplicar}
              className="text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <CheckCircle2 className="size-3.5" />
              Confirmar e Aplicar {resultado.alteracoes.length} Alteração(ões)
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
