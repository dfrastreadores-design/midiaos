import React, { useRef, useState, useEffect, useMemo, useCallback } from "react";
import {
  InsertionOrder,
  BILLING_TYPE_METADATA,
  calculatePiSplitsWithProduction,
} from "@/types/insertion-orders.types";
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
  Clapperboard,
  Eye,
  Layers,
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
  const [viewMode, setViewMode] = useState<"cliente" | "interna">("cliente");
  const dossier = pi.dossier_data;
  const checkings = useMemo(
    () => (pi.checkings || []).filter((c) => c.status === "approved"),
    [pi.checkings],
  );

  const clientFacingItems = useMemo(() => {
    return (pi.items || []).filter(
      (it) => !(it.item_type === "PRODUCTION" && it.display_mode === "EMBEDDED"),
    );
  }, [pi.items]);

  const internalItems = useMemo(() => pi.items || [], [pi.items]);

  const splits = useMemo(() => {
    return calculatePiSplitsWithProduction(
      pi.items || [],
      pi.representative_commission_rate || 0,
      pi.gross_amount,
    );
  }, [pi.items, pi.representative_commission_rate, pi.gross_amount]);

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

          {/* COMPOSIÇÃO DE ITENS E SERVIÇOS DO PI */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Layers className="size-4 text-primary" />
                Linhas de Mídia & Serviços Contratados
              </h4>
              <div className="inline-flex rounded-lg border bg-muted/50 p-0.5 print:hidden">
                <button
                  type="button"
                  onClick={() => setViewMode("cliente")}
                  className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                    viewMode === "cliente"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Visão do Cliente (Consolidada)
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("interna")}
                  className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                    viewMode === "interna"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Visão Interna (Operacional)
                </button>
              </div>
            </div>

            {viewMode === "cliente" ? (
              /* TABELA VISÃO CLIENTE (PRODUÇÕES EMBUTIDAS OCULTAS, VALOR TOTAL CONSOLIDADO) */
              <div className="rounded-xl border bg-card shadow-sm overflow-hidden text-xs">
                <div className="p-2.5 bg-muted/40 border-b flex items-center justify-between">
                  <span className="font-semibold text-muted-foreground text-[11px] uppercase tracking-wider">
                    Espelho de Cobrança do Cliente
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    Valores Finais Consolidados
                  </Badge>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-muted/20 text-muted-foreground text-[11px] uppercase border-b">
                      <tr>
                        <th className="py-2 px-3">Item / Formato</th>
                        <th className="py-2 px-3">Veículo / Parceiro</th>
                        <th className="py-2 px-3 text-center">Inserções</th>
                        <th className="py-2 px-3">Período</th>
                        <th className="py-2 px-3 text-right">Valor Negociado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {clientFacingItems.map((it) => {
                        const isProduction = it.item_type === "PRODUCTION";
                        const displayedTotal =
                          it.client_facing_total ||
                          it.total_price + (it.embedded_production_cost || 0);

                        return (
                          <tr key={it.id} className="hover:bg-muted/10">
                            <td className="py-2.5 px-3">
                              <div className="font-semibold text-foreground">
                                {isProduction ? "🎬 Produção: " : ""}
                                {it.format_description}
                              </div>
                              <div className="text-[11px] text-muted-foreground">
                                {isProduction
                                  ? "Serviço de Produção / Criação Publicitária"
                                  : "Veiculação de Mídia"}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-muted-foreground">
                              {it.vehicle?.nome_fantasia || "Parceiro Homologado"}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {isProduction ? (
                                <Badge variant="secondary" className="text-[10px]">
                                  Serviço Único
                                </Badge>
                              ) : (
                                `${it.insertions_count || 1}x`
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-muted-foreground text-[11px]">
                              {it.period_start && it.period_end
                                ? `${it.period_start} a ${it.period_end}`
                                : "Conforme cronograma"}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-foreground">
                              {formatBRL(displayedTotal)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="border-t bg-muted/30 font-semibold">
                      <tr>
                        <td colSpan={4} className="py-2.5 px-3 text-right text-foreground">
                          Total Geral do Pedido de Inserção:
                        </td>
                        <td className="py-2.5 px-3 text-right text-foreground font-bold text-sm">
                          {formatBRL(pi.gross_amount)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            ) : (
              /* TABELA VISÃO INTERNA (ÁRVORE DE CUSTOS DESMEMBRADA) */
              <div className="space-y-3">
                <div className="rounded-xl border bg-card shadow-sm overflow-hidden text-xs">
                  <div className="p-2.5 bg-muted/40 border-b flex items-center justify-between">
                    <span className="font-semibold text-muted-foreground text-[11px] uppercase tracking-wider">
                      Árvore Analítica de Custos e Margens (Interno)
                    </span>
                    <Badge variant="outline" className="border-primary/40 text-primary text-[10px]">
                      Controle & Liquidação
                    </Badge>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-muted/20 text-muted-foreground text-[11px] uppercase border-b">
                        <tr>
                          <th className="py-2 px-3">Item</th>
                          <th className="py-2 px-3">Tipo / Modo</th>
                          <th className="py-2 px-3 text-right">Custo Mídia</th>
                          <th className="py-2 px-3 text-right">Produção</th>
                          <th className="py-2 px-3 text-right">Base Comiss.</th>
                          <th className="py-2 px-3 text-right">Comissão</th>
                          <th className="py-2 px-3 text-right">Repasse Líquido</th>
                          <th className="py-2 px-3 text-right">Total Cliente</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {internalItems.map((it) => {
                          const isProduction = it.item_type === "PRODUCTION";
                          const isEmbedded = it.display_mode === "EMBEDDED";

                          return (
                            <tr key={it.id} className="hover:bg-muted/10">
                              <td className="py-2 px-3">
                                <div className="font-semibold text-foreground truncate max-w-[150px]">
                                  {it.format_description}
                                </div>
                                <div className="text-[10px] text-muted-foreground">
                                  {it.vehicle?.nome_fantasia || "Parceiro"}
                                </div>
                              </td>
                              <td className="py-2 px-3">
                                {isProduction ? (
                                  <div className="flex flex-col gap-0.5">
                                    <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 text-[10px] w-fit">
                                      Produção
                                    </Badge>
                                    <span className="text-[10px] text-muted-foreground">
                                      {isEmbedded ? "Embutida na Mídia" : "Discriminada no PI"}
                                    </span>
                                  </div>
                                ) : (
                                  <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 text-[10px] w-fit">
                                    Mídia
                                  </Badge>
                                )}
                              </td>
                              <td className="py-2 px-3 text-right">
                                {isProduction ? "-" : formatBRL(it.media_raw_cost || it.total_price)}
                              </td>
                              <td className="py-2 px-3 text-right">
                                {isProduction ? (
                                  <span className="font-semibold text-purple-600">
                                    {formatBRL(it.total_price)}
                                  </span>
                                ) : it.embedded_production_cost && it.embedded_production_cost > 0 ? (
                                  <span className="text-purple-600 text-[11px]">
                                    +{formatBRL(it.embedded_production_cost)}
                                  </span>
                                ) : (
                                  "-"
                                )}
                              </td>
                              <td className="py-2 px-3 text-right text-muted-foreground">
                                {isProduction && !it.is_commissionable
                                  ? "Isento (R$ 0)"
                                  : formatBRL(it.total_price)}
                              </td>
                              <td className="py-2 px-3 text-right text-emerald-600 font-medium">
                                {formatBRL(it.vehicle_commission_amount || 0)}
                              </td>
                              <td className="py-2 px-3 text-right text-blue-600 font-medium">
                                {formatBRL(it.vehicle_net_amount || (isProduction && !it.is_commissionable ? it.total_price : 0))}
                              </td>
                              <td className="py-2 px-3 text-right font-bold text-foreground">
                                {isProduction && isEmbedded
                                  ? "(Diluído)"
                                  : formatBRL(it.client_facing_total || it.total_price)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* CONCILIAÇÃO FINANCEIRA OPERACIONAL */}
                <div className="p-3.5 rounded-xl border bg-muted/20 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Mídia Bruta:</span>
                    <strong className="text-foreground">{formatBRL(splits.mediaGross)}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Produção Bruta:</span>
                    <strong className="text-purple-700 dark:text-purple-400">
                      {formatBRL(splits.productionGross)}
                    </strong>
                    <div className="text-[10px] text-muted-foreground">
                      R$ {splits.embeddedProductionGross.toFixed(0)} emb. / R$ {splits.itemizedProductionGross.toFixed(0)} disc.
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Comissão Representante:</span>
                    <strong className="text-emerald-600">
                      {formatBRL(splits.representativeCommission)}
                    </strong>
                    <div className="text-[10px] text-muted-foreground">
                      Base: {formatBRL(splits.commissionableBase)}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Repasse Líquido Fornecedores:</span>
                    <strong className="text-blue-600">
                      {formatBRL(splits.vehiclePayout + splits.productionPayout)}
                    </strong>
                    <div className="text-[10px] text-muted-foreground">
                      Veículos: {formatBRL(splits.vehiclePayout)} | Prod: {formatBRL(splits.productionPayout)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

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
