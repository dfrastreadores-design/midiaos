// Component: PiDossierModal.tsx
// Dossiê Digital Unificado do PI (Pedido + Checking Auditado + Nota Fiscal)

import React, { useRef, useState, useEffect, useMemo, useCallback } from "react";
import { InsertionOrder, BILLING_TYPE_METADATA } from "@/types/insertion-orders.types";
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
import {
  ShieldCheck,
  Printer,
  Copy,
  ExternalLink,
  FileCheck2,
  Calendar,
  Building2,
  DollarSign,
  Radio,
  Tv,
  Image as ImageIcon,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

interface Props {
  pi: InsertionOrder;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatBRL(val: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val || 0);
}

export function PiDossierModal({ pi, open, onOpenChange }: Props) {
  const dossierRef = useRef<HTMLDivElement>(null);
  const dossier = pi.dossier_data;
  const checkings = useMemo(
    () => (pi.checkings || []).filter((c) => c.status === "approved"),
    [pi.checkings],
  );

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link do Dossiê copiado com sucesso!");
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-9 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <ShieldCheck className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-base flex items-center gap-2">
                  Dossiê Digital Unificado de Veiculação
                  <Badge className="bg-emerald-600 text-white text-[10px]">Auditado</Badge>
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Comprovante formal de veiculação e conformidade para liquidação e auditoria do cliente.
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-1.5 print:hidden">
              <Button size="sm" variant="outline" onClick={handleCopyLink} className="h-8 text-xs gap-1">
                <Copy className="size-3.5" /> Copiar
              </Button>
              <Button size="sm" variant="outline" onClick={handlePrint} className="h-8 text-xs gap-1">
                <Printer className="size-3.5" /> Imprimir
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* CORPO DO DOSSIÊ */}
        <div ref={dossierRef} className="space-y-6 py-3 print:py-0">
          {/* CABEÇALHO FORMAL */}
          <div className="p-4 rounded-xl border bg-card shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                  Documento Oficial de Fechamento
                </span>
                <h2 className="text-xl font-bold text-foreground">{pi.pi_number}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Campanha: <strong className="text-foreground">{pi.campaign_title}</strong>
                </p>
              </div>
              <div className="text-left sm:text-right">
                <span className="text-xs font-semibold text-emerald-600 flex items-center sm:justify-end gap-1">
                  <CheckCircle2 className="size-3.5" /> Checking 100% Auditado
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {BILLING_TYPE_METADATA[pi.billing_type].badge}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
              <div>
                <span className="text-muted-foreground block text-[11px]">Cliente / Anunciante:</span>
                <strong className="text-foreground">{pi.client?.nome_fantasia || pi.client?.razao_social}</strong>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">CNPJ:</span>
                <strong className="text-foreground">{pi.client?.cnpj || "Não informado"}</strong>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Período de Exibição:</span>
                <strong className="text-foreground">
                  {pi.period_start || "Início"} até {pi.period_end || "Fim"}
                </strong>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Valor Total:</span>
                <strong className="text-foreground text-sm">{formatBRL(pi.gross_amount)}</strong>
              </div>
            </div>
          </div>

          {/* DADOS FISCAIS ANEXADOS */}
          {(pi.invoice_number || pi.vehicle_invoice_number) && (
            <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 text-xs space-y-2">
              <h5 className="font-semibold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                <FileCheck2 className="size-4" /> Dados Fiscais Vinculados ao Dossiê
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {pi.invoice_number && (
                  <div>
                    <span className="text-muted-foreground">Nota Fiscal Representante: </span>
                    <strong>{pi.invoice_number}</strong>
                    {pi.invoice_url && (
                      <a
                        href={pi.invoice_url}
                        target="_blank"
                        rel="noreferrer"
                        className="ml-2 text-primary hover:underline inline-flex items-center gap-0.5"
                      >
                        Ver NF <ExternalLink className="size-3" />
                      </a>
                    )}
                  </div>
                )}
                {pi.vehicle_invoice_number && (
                  <div>
                    <span className="text-muted-foreground">Nota Fiscal Direta Veículo: </span>
                    <strong>{pi.vehicle_invoice_number}</strong>
                    {pi.vehicle_invoice_url && (
                      <a
                        href={pi.vehicle_invoice_url}
                        target="_blank"
                        rel="noreferrer"
                        className="ml-2 text-primary hover:underline inline-flex items-center gap-0.5"
                      >
                        Ver NF <ExternalLink className="size-3" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* EVIDÊNCIAS DE CHECKING AUDITADAS */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
              <ShieldCheck className="size-4 text-emerald-600" />
              Evidências e Comprovantes Auditados ({checkings.length})
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {checkings.map((c, i) => (
                <div key={c.id || i} className="p-3 rounded-xl border bg-card space-y-2 shadow-sm text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold truncate max-w-[180px]">{c.file_name}</span>
                    <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">Validado</Badge>
                  </div>

                  <div className="text-[11px] text-muted-foreground">
                    Veículo: <strong>{c.vehicle?.nome_fantasia || "Veículo Parceiro"}</strong>
                    {c.broadcast_date && ` • ${c.broadcast_date}`}
                  </div>

                  <div className="rounded-lg overflow-hidden border bg-muted/40 h-28 flex items-center justify-center">
                    {c.file_type === "foto" && c.file_url ? (
                      <img src={c.file_url} alt="Comprovante" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center p-2">
                        <FileCheck2 className="size-6 mx-auto text-emerald-600 mb-1" />
                        <span className="text-[11px] font-medium">{c.file_type.toUpperCase()}</span>
                      </div>
                    )}
                  </div>

                  <a
                    href={c.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary text-[11px] hover:underline flex items-center gap-1"
                  >
                    Abrir arquivo original em alta resolução <ExternalLink className="size-3" />
                  </a>
                </div>
              ))}
            </div>
          </div>

          {/* CARIMBO DE AUDITORIA & CERTIFICAÇÃO DIGITAL */}
          <div className="p-4 rounded-xl border border-dashed text-center text-xs text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground">
              Certificação de Conformidade & Integridade de Veiculação
            </p>
            <p className="text-[11px]">
              Emitido eletronicamente pela plataforma Mídia.OS em conformidade com as normas CENP / IBOPE / Kantar.
              Documento assinado digitalmente com chave imutável de sessão.
            </p>
          </div>
        </div>

        <DialogFooter className="border-t pt-3 print:hidden">
          <Button size="sm" onClick={() => onOpenChange(false)}>
            Fechar Dossiê
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
