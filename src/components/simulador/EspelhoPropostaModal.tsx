import { useState, useRef, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
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
  Printer,
  Sparkles,
  Handshake,
  FileCheck2,
  Download,
  Building2,
  Calendar,
  CheckCircle2,
  DollarSign,
  Loader2,
  Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import { formatBRL } from "@/lib/mock-data";
import { getProposalById } from "@/lib/simulador-propostas.functions";
import { TIPOS_COBRANCA_LABELS } from "@/types/representacao-comercial.types";
import { PROPOSAL_STATUS_LABELS } from "@/types/simulador-proposta.types";
import {
  gerarPdfPropostaExecutivaCoBranding,
  type PropostaApresentacao,
} from "@/lib/proposta-presentation";

interface EspelhoPropostaModalProps {
  proposalId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EspelhoPropostaModal({
  proposalId,
  open,
  onOpenChange,
}: EspelhoPropostaModalProps) {
  const getProposalFn = useServerFn(getProposalById);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const { data: proposal, isLoading } = useQuery({
    queryKey: ["proposal_mirror", proposalId],
    queryFn: () => getProposalFn({ data: { id: proposalId! } }),
    enabled: Boolean(proposalId && open),
  });

  const handlePrint = () => {
    window.print();
  };

  const handleExportExecutivePdf = async () => {
    if (!proposal) return;
    setGeneratingPdf(true);
    try {
      const propApres: PropostaApresentacao = {
        id: proposal.id,
        numero: proposal.id.slice(0, 8).toUpperCase(),
        titulo: proposal.campaign_title || "Plano Comercial Estratégico Multiveículos",
        client_name: proposal.client_name,
        client_logo_url: proposal.client_logo_url || null,
        cliente: {
          id: proposal.client_id || undefined,
          nome_fantasia: proposal.client_name,
          razao_social: proposal.client_name,
          logo_url: proposal.client_logo_url || null,
        },
        valor_tabela: proposal.total_gross,
        valor_negociado: proposal.total_gross - proposal.total_discount,
        valor_desconto: proposal.total_discount,
        total_insercoes: (proposal.items || []).reduce((acc, it) => acc + (it.quantity || 1), 0),
        itens: (proposal.items || []).map((it) => ({
          tipo: it.media_service?.categoria_midia || (it.is_own_product ? "Produto Próprio" : "Veículo Parceiro"),
          programa: it.product_name,
          formato: TIPOS_COBRANCA_LABELS[it.billing_type] || it.billing_type,
          insercoes_dia: it.quantity,
          total_insercoes: it.quantity,
          valor_unit: it.unit_price,
          valor_tabela: it.gross_price,
          desconto: it.discount_percent,
          valor_negociado: it.net_client_val,
          endereco_ponto: it.media_service?.cidade
            ? `${it.media_service?.cidade}/${it.media_service?.estado || ""}`
            : undefined,
        })),
        observacoes: proposal.notes,
      };

      await gerarPdfPropostaExecutivaCoBranding(propApres);
      toast.success("PDF Executivo Co-Branding gerado com sucesso!");
    } catch (err: any) {
      console.error("Erro ao gerar PDF:", err);
      toast.error("Erro ao gerar PDF: " + (err?.message || "falha na geração"));
    } finally {
      setGeneratingPdf(false);
    }
  };

  const statusCfg = proposal ? PROPOSAL_STATUS_LABELS[proposal.status] || PROPOSAL_STATUS_LABELS.draft : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-background">
        <DialogHeader className="p-5 border-b bg-muted/30 shrink-0 flex flex-row items-center justify-between">
          <div>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <FileCheck2 className="w-5 h-5 text-primary" />
              Espelho da Proposta Comercial & Plano de Mídia
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
              Documento oficial de cotação multiveículos e rateio financeiro
            </DialogDescription>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportExecutivePdf}
              disabled={generatingPdf || !proposal}
              className="gap-1.5 text-xs h-8 border-primary/30 text-primary hover:bg-primary/10"
              title="Baixar PDF Executivo Co-Branding oficial"
            >
              {generatingPdf ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Printer className="w-3.5 h-3.5" />
              )}
              PDF Executivo
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="gap-1.5 text-xs h-8"
            >
              <Printer className="w-3.5 h-3.5" />
              Imprimir
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 print:p-0">
          {isLoading ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              Carregando espelho da proposta...
            </div>
          ) : !proposal ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              Proposta não localizada.
            </div>
          ) : (
            <div className="space-y-6">
              {/* Header da Proposta com Co-Branding */}
              <div className="p-5 rounded-xl border bg-card/60 space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4">
                  {/* Co-branding do Cliente Anunciante */}
                  <div className="flex items-center gap-3.5">
                    {proposal.client_logo_url ? (
                      <div className="w-20 h-14 rounded-lg border bg-background p-1.5 flex items-center justify-center shrink-0 shadow-xs">
                        <img
                          src={proposal.client_logo_url}
                          alt={proposal.client_name}
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <Building2 className="w-6 h-6" />
                      </div>
                    )}
                    <div>
                      <span className="text-[10px] text-primary uppercase font-bold tracking-wider flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5" />
                        Proposta Exclusiva Desenvolvida Para:
                      </span>
                      <h3 className="text-xl font-bold text-foreground mt-0.5">{proposal.client_name}</h3>
                      {proposal.campaign_title && (
                        <p className="text-xs text-muted-foreground font-medium mt-0.5">
                          Campanha: <span className="text-foreground font-semibold">{proposal.campaign_title}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col sm:items-end gap-1.5 shrink-0">
                    {statusCfg && (
                      <Badge className={statusCfg.bgBadge}>{statusCfg.label}</Badge>
                    )}
                    <span className="text-[11px] text-muted-foreground">
                      Data: {new Date(proposal.created_at || "").toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                </div>

                {proposal.notes && (
                  <div className="text-xs text-muted-foreground bg-muted/40 p-3 rounded-lg">
                    <strong>Observações / Condições Comerciais:</strong> {proposal.notes}
                  </div>
                )}
              </div>

              {/* Tabela de Itens Veiculados */}
              <div className="border rounded-xl overflow-hidden bg-card">
                <div className="p-3 bg-muted/40 border-b font-semibold text-xs text-foreground flex items-center justify-between">
                  <span>Espaços e Veículos Contratados</span>
                  <span>{proposal.items?.length || 0} item(ns)</span>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow className="text-xs bg-muted/20">
                      <TableHead>Espaço / Produto</TableHead>
                      <TableHead>Origem / Veículo</TableHead>
                      <TableHead>Qtd / Modelo</TableHead>
                      <TableHead className="text-right">Valor Tabela</TableHead>
                      <TableHead className="text-right">Desconto</TableHead>
                      <TableHead className="text-right">Faturado Cliente</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(proposal.items || []).map((it) => (
                      <TableRow key={it.id} className="text-xs">
                        <TableCell className="font-semibold text-foreground">
                          {it.product_name}
                        </TableCell>
                        <TableCell>
                          {it.is_own_product ? (
                            <Badge className="bg-amber-600/90 text-white text-[9px] border-0">
                              ⭐ Produto Próprio
                            </Badge>
                          ) : (
                            <span className="text-xs text-purple-700 dark:text-purple-300 font-medium">
                              🤝 {it.partner?.nome_fantasia || it.partner?.razao_social || "Parceiro"}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {it.quantity}x ({TIPOS_COBRANCA_LABELS[it.billing_type] || it.billing_type})
                        </TableCell>
                        <TableCell className="text-right">
                          {formatBRL(it.gross_price)}
                        </TableCell>
                        <TableCell className="text-right text-rose-600 dark:text-rose-400 font-medium">
                          {it.discount > 0 ? `-${formatBRL(it.discount)}` : "—"}
                        </TableCell>
                        <TableCell className="text-right font-bold text-foreground">
                          {formatBRL(it.net_client_val)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Totais Executivos */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border bg-muted/30 space-y-1">
                  <span className="text-xs text-muted-foreground uppercase font-medium">
                    Total Bruto Tabela
                  </span>
                  <div className="text-lg font-bold">{formatBRL(proposal.total_gross)}</div>
                  <span className="text-[11px] text-rose-600 dark:text-rose-400 block">
                    Desconto total: -{formatBRL(proposal.total_discount)}
                  </span>
                </div>

                <div className="p-4 rounded-xl border bg-card shadow-xs space-y-1">
                  <span className="text-xs text-muted-foreground uppercase font-medium">
                    Faturado ao Anunciante
                  </span>
                  <div className="text-2xl font-extrabold text-foreground">
                    {formatBRL(proposal.total_gross - proposal.total_discount)}
                  </div>
                  <span className="text-[11px] text-muted-foreground block">
                    Valor total da proposta
                  </span>
                </div>

                <div className="p-4 rounded-xl border bg-emerald-500/10 border-emerald-500/30 space-y-1">
                  <span className="text-xs text-emerald-800 dark:text-emerald-300 uppercase font-medium">
                    Receita da Representação
                  </span>
                  <div className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-300">
                    {formatBRL(proposal.total_net_agency)}
                  </div>
                  <span className="text-[11px] text-emerald-700/90 dark:text-emerald-400 font-medium block">
                    Margem líquida de {proposal.profit_margin_percent}%
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="p-4 border-t bg-muted/20 shrink-0 flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={handleExportExecutivePdf}
              disabled={generatingPdf || !proposal}
              className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {generatingPdf ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Printer className="w-3.5 h-3.5" />
              )}
              Baixar PDF Co-Branding
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
