// Component: EmitirPisPropostaModal.tsx
// Modal de Emissão Oficial do Duplo Fluxo de PIs (Cliente vs. Parceiros) a partir de Proposta

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
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
import { Card, CardContent } from "@/components/ui/card";
import {
  FileText,
  Users,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Loader2,
  Layers,
  DollarSign,
  TrendingUp,
  Percent,
  Tv,
} from "lucide-react";
import { toast } from "sonner";
import {
  previewEmissaoPisDaProposta,
  emitirPisDaProposta,
  PreviewEmissaoResponse,
} from "@/lib/pi-emissao.functions";
import { useNavigate } from "@tanstack/react-router";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propostaId: string | null;
  propostaNumero?: string;
  onSuccess?: () => void;
}

const fmtBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

export function EmitirPisPropostaModal({
  open,
  onOpenChange,
  propostaId,
  propostaNumero,
  onSuccess,
}: Props) {
  const qc = useQueryClient();
  const navigate = useNavigate();

  const previewFn = useServerFn(previewEmissaoPisDaProposta);
  const emitirFn = useServerFn(emitirPisDaProposta);

  // Busca o preview de cálculo dos PIs
  const {
    data: preview,
    isLoading,
    error,
  } = useQuery<PreviewEmissaoResponse>({
    queryKey: ["pi-emissao-preview", propostaId],
    queryFn: () => previewFn({ data: { proposta_id: propostaId! } }),
    enabled: !!propostaId && open,
  });

  // Mutação para disparar a emissão oficial
  const emitirMutation = useMutation({
    mutationFn: () => emitirFn({ data: { proposta_id: propostaId!, confirmar_emissao: true } }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["propostas"] });
      qc.invalidateQueries({ queryKey: ["pis"] });
      qc.invalidateQueries({ queryKey: ["produtos"] });
      toast.success(res.mensagem || "PIs emitidos com sucesso!");
      onOpenChange(false);
      if (onSuccess) onSuccess();
      // Opcional: navegar para tela de PIs
      navigate({ to: "/pi" });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Falha ao emitir PIs da proposta.");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[850px] max-h-[92vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <FileText className="size-5 text-primary" />
              <span>Emissão Oficial de PIs · Proposta {propostaNumero || ""}</span>
            </DialogTitle>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold">
              <ShieldCheck className="size-3.5 mr-1" /> Esteira Financeira OOH
            </Badge>
          </div>
          <DialogDescription>
            Gere o PI consolidado de faturamento do cliente e desmembre automaticamente os PIs de veiculação e repasse individual para cada parceiro.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="size-7 animate-spin text-primary" />
            <p className="text-sm">Calculando desmembramentos e repasses por parceiro…</p>
          </div>
        ) : error || !preview ? (
          <div className="p-6 text-center space-y-3">
            <AlertCircle className="size-8 text-destructive mx-auto" />
            <p className="text-sm font-medium text-destructive">
              Não foi possível carregar o preview da proposta: {(error as any)?.message || "Erro desconhecido"}
            </p>
          </div>
        ) : (
          <div className="space-y-6 pt-2">
            {/* Banner Informativo da Regra */}
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3.5 text-xs text-indigo-900 flex items-start gap-2.5">
              <ShieldCheck className="size-4 text-indigo-600 mt-0.5 shrink-0" />
              <div>
                <span className="font-bold">Gatilho de Veiculação & Bloqueio Operacional:</span> A emissão oficial destes PIs libera os pontos para o status{" "}
                <span className="font-semibold text-emerald-700">"Veiculação Autorizada"</span>, permitindo o início do checking e auditoria de exibição no sistema.
              </div>
            </div>

            {/* SEÇÃO 1: 1x PI DO CLIENTE (FATURAMENTO) */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <span className="flex size-5 rounded-full bg-primary/10 text-primary items-center justify-center text-[11px] font-black">
                    1
                  </span>
                  PI do Cliente (Venda / Faturamento Total)
                </h4>
                <Badge variant="secondary" className="font-semibold text-[11px]">
                  Faturamento {preview.pi_cliente.pagador_tipo === "agencia" ? "Líquido (−20% BV)" : "Bruto"}
                </Badge>
              </div>

              <Card className="border border-border/80 shadow-xs bg-card/60">
                <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-4 gap-3 text-sm">
                  <div>
                    <span className="text-[11px] font-medium text-muted-foreground uppercase">Pagador</span>
                    <div className="font-semibold text-foreground truncate mt-0.5" title={preview.pi_cliente.pagador_nome}>
                      {preview.pi_cliente.pagador_nome}
                    </div>
                    {preview.pi_cliente.pagador_documento && (
                      <span className="text-[11px] text-muted-foreground font-mono">{preview.pi_cliente.pagador_documento}</span>
                    )}
                  </div>

                  <div>
                    <span className="text-[11px] font-medium text-muted-foreground uppercase">Valor Negociado</span>
                    <div className="font-semibold text-foreground mt-0.5">
                      {fmtBRL(preview.pi_cliente.valor_negociado)}
                    </div>
                    <span className="text-[11px] text-muted-foreground">{preview.pi_cliente.total_faces} faces / pontos</span>
                  </div>

                  <div>
                    <span className="text-[11px] font-medium text-muted-foreground uppercase">Comissão Agência</span>
                    <div className="font-semibold text-amber-700 mt-0.5">
                      {preview.pi_cliente.comissao_agencia_pct > 0
                        ? `- ${fmtBRL(preview.pi_cliente.valor_comissao_agencia)} (${preview.pi_cliente.comissao_agencia_pct}%)`
                        : "Isento / Direto"}
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] font-medium text-muted-foreground uppercase">Valor a Faturar</span>
                    <div className="text-base font-bold text-primary mt-0.5">
                      {fmtBRL(preview.pi_cliente.valor_liquido_faturamento)}
                    </div>
                    <span className="text-[10px] text-muted-foreground">Valor cobrado do pagador</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* SEÇÃO 2: Nx PIS DE PARCEIROS (DESMEMBRAMENTO DE REPASSE) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <span className="flex size-5 rounded-full bg-emerald-100 text-emerald-800 items-center justify-center text-[11px] font-black">
                    2
                  </span>
                  PIs de Veiculação & Compra (Desmembramento por Parceiro)
                </h4>
                <span className="text-xs text-muted-foreground font-medium">
                  {preview.pis_parceiros.length} {preview.pis_parceiros.length === 1 ? "parceiro" : "parceiros"} identificado(s)
                </span>
              </div>

              {preview.pis_parceiros.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed text-center text-xs text-muted-foreground">
                  Todos os itens desta proposta são de inventário próprio da empresa (sem parceiros terceirizados).
                </div>
              ) : (
                <div className="space-y-2.5">
                  {preview.pis_parceiros.map((parc, idx) => (
                    <Card key={parc.parceiro_id} className="border border-border/70 hover:border-border transition-colors">
                      <CardContent className="p-3.5 space-y-2.5">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <span className="size-6 rounded-md bg-muted flex items-center justify-center font-bold text-xs text-muted-foreground">
                              {idx + 1}
                            </span>
                            <div>
                              <div className="font-bold text-sm text-foreground">{parc.parceiro_nome}</div>
                              <div className="text-[11px] text-muted-foreground font-mono">
                                CNPJ: {parc.parceiro_cnpj || "Não informado"} {parc.chave_pix ? `· PIX: ${parc.chave_pix}` : ""}
                              </div>
                            </div>
                          </div>

                          <Badge variant="outline" className="bg-muted/50 text-[11px]">
                            {parc.quantidade_faces} {parc.quantidade_faces === 1 ? "face" : "faces"}
                          </Badge>
                        </div>

                        {/* Detalhes Financeiros do Desmembramento */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-border/50 text-xs">
                          <div>
                            <span className="text-muted-foreground text-[10px] uppercase">Valor Bruto</span>
                            <div className="font-medium text-foreground">{fmtBRL(parc.valor_bruto)}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground text-[10px] uppercase">Retenção Inquilino</span>
                            <div className="font-medium text-amber-700">
                              - {fmtBRL(parc.valor_margem_inquilino)} ({parc.margem_inquilino_pct}%)
                            </div>
                          </div>
                          <div>
                            <span className="text-muted-foreground text-[10px] uppercase">Abatimentos Totais</span>
                            <div className="font-medium text-destructive">
                              - {fmtBRL(parc.valor_abatimentos)}
                            </div>
                          </div>
                          <div>
                            <span className="text-muted-foreground text-[10px] uppercase font-semibold text-emerald-800">
                              Repasse Líquido
                            </span>
                            <div className="font-bold text-sm text-emerald-600">
                              {fmtBRL(parc.valor_liquido_repasse)}
                            </div>
                          </div>
                        </div>

                        {/* Lista resumida de pontos deste parceiro */}
                        <div className="bg-muted/30 rounded-lg p-2 text-[11px] text-muted-foreground space-y-1">
                          {parc.itens.map((it, i) => (
                            <div key={i} className="flex justify-between items-center">
                              <span className="truncate max-w-[400px]">
                                • {it.nome_ponto} ({it.tipo_midia} - {it.formato})
                              </span>
                              <span className="font-mono">{fmtBRL(it.valor_liquido)} líq.</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="mt-4 gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={emitirMutation.isPending}>
            Cancelar
          </Button>
          <Button
            variant="default"
            className="bg-emerald-600 hover:bg-emerald-700 font-semibold px-5"
            disabled={isLoading || emitirMutation.isPending || !preview}
            onClick={() => emitirMutation.mutate()}
          >
            {emitirMutation.isPending ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Emitindo PIs…
              </>
            ) : (
              <>
                <CheckCircle2 className="size-4 mr-2" />
                Emitir Todos os PIs Oficialmente
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
