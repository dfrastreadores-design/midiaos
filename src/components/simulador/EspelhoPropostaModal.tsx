import { useRef, useState, useEffect, useMemo, useCallback } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
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
  FileCheck2,
  Building2,
  Loader2,
  MapPin,
  CheckSquare,
  Square,
  Layers,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { formatBRL } from "@/lib/mock-data";
import { getProposalById } from "@/lib/simulador-propostas.functions";
import { TIPOS_COBRANCA_LABELS } from "@/types/representacao-comercial.types";
import { PROPOSAL_STATUS_LABELS, ProposalItem } from "@/types/simulador-proposta.types";
import {
  gerarPdfPropostaExecutivaCoBranding,
  type PropostaApresentacao,
} from "@/lib/proposta-presentation";

interface EspelhoPropostaModalProps {
  proposalId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Extrai dados técnicos neutros do ponto de mídia sem qualquer citação ao parceiro/fornecedor
function parseItemPresentation(it: ProposalItem, index: number) {
  // 1. Código / Identificação do Ponto
  let codigo = "";
  const spec = it.media_service?.especificacoes_tecnicas as any;
  if ((it as any).codigo) {
    codigo = (it as any).codigo;
  } else if (spec?.codigo) {
    codigo = spec.codigo;
  } else {
    // Tenta extrair código do início do nome: ex "FL-01 - Frontlight" ou "LED-03" ou "DLED-02"
    const m = (it.product_name || "").match(/^([A-Za-z0-9]+-[A-Za-z0-9]+|[A-Za-z]{2,5}\s*\d+)/);
    if (m) {
      codigo = m[0].trim();
    } else {
      codigo = `PT-${String(index + 1).padStart(2, "0")}`;
    }
  }

  // 2. Descrição / Localização
  let descricao = it.product_name || "Ponto de Mídia";
  // Remove código inicial se presente para não duplicar visualmente
  descricao = descricao.replace(/^[A-Za-z0-9]+-[A-Za-z0-9]+\s*[-·:]*\s*/, "").trim() || it.product_name;

  const locParts: string[] = [];
  if (it.media_service?.endereco || (it as any).endereco_ponto || it.media_service?.bairro) {
    locParts.push(it.media_service?.endereco || (it as any).endereco_ponto || it.media_service?.bairro);
  }
  if (it.media_service?.cidade) {
    locParts.push(`${it.media_service.cidade}${it.media_service?.estado ? `/${it.media_service.estado}` : ""}`);
  }
  const localizacaoCompleta = locParts.length > 0 ? locParts.join(" · ") : "";

  // 3. Formato / Tipo
  let formato = it.media_service?.categoria_midia || "";
  const rawText = `${it.product_name} ${it.billing_type || ""} ${formato}`.toLowerCase();
  if (rawText.includes("frontlight") || rawText.includes("front-light")) {
    formato = "Frontlight";
  } else if (rawText.includes("led") || rawText.includes("painel led") || rawText.includes("dooh")) {
    formato = "Painel de LED Digital";
  } else if (rawText.includes("elevador")) {
    formato = "DOOH Elevador";
  } else if (rawText.includes("outdoor") || rawText.includes("bi-semana") || rawText.includes("bissemana")) {
    formato = "Outdoor";
  } else if (rawText.includes("totem")) {
    formato = "Totem Iluminado";
  } else if (rawText.includes("empena")) {
    formato = "Empena";
  } else if (formato === "ooh_dooh") {
    formato = "Mídia Exterior OOH/DOOH";
  } else if (!formato || formato === "tv_audio") {
    formato = "Mídia Exterior";
  }

  // 4. Dimensões / Especificações
  let dimensoes = "";
  if (spec?.dimensoes_metros_pixels) {
    dimensoes = spec.dimensoes_metros_pixels;
  } else if ((it as any).dimensoes || (it.media_service as any)?.dimensoes) {
    dimensoes = (it as any).dimensoes || (it.media_service as any)?.dimensoes;
  } else if (it.media_service?.screen_resolution) {
    dimensoes = it.media_service.screen_resolution;
  } else {
    const dimMatch = (it.product_name || "").match(/\d+[,.]?\d*\s*[xX]\s*\d+[,.]?\d*\s*m?/);
    if (dimMatch) {
      dimensoes = dimMatch[0];
    } else {
      dimensoes = formato.includes("LED") ? "Painel P8/P10 Full HD" : "Engenharia Padrão OOH";
    }
  }

  // 5. Período / Veiculação
  let periodo = "";
  const billing = it.billing_type || "quinzenal";
  const qtd = it.quantity || 1;
  if (billing === "quinzenal" || billing === "bissemana") {
    periodo = `${qtd * 14} dias (${qtd} Bissemana${qtd > 1 ? "s" : ""})`;
  } else if (billing === "mensal") {
    periodo = `${qtd * 30} dias (${qtd} Mês${qtd > 1 ? "es" : ""})`;
  } else if (billing === "semanal") {
    periodo = `${qtd * 7} dias (${qtd} Sem)`;
  } else if (billing === "diaria") {
    periodo = `${qtd} dia${qtd > 1 ? "s" : ""}`;
  } else if (billing === "insercao") {
    periodo = `${qtd} Inserções`;
  } else {
    periodo = `${qtd}x (${TIPOS_COBRANCA_LABELS[billing as any] || billing})`;
  }

  return {
    codigo,
    descricao,
    localizacaoCompleta,
    formato,
    dimensoes,
    periodo,
  };
}

export function EspelhoPropostaModal({
  proposalId,
  open,
  onOpenChange,
}: EspelhoPropostaModalProps) {
  const getProposalFn = useServerFn(getProposalById);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);

  const { data: proposal, isLoading } = useQuery({
    queryKey: ["proposal_mirror", proposalId],
    queryFn: () => getProposalFn({ data: { id: proposalId! } }),
    enabled: Boolean(proposalId && open),
  });

  // Inicializa todos os pontos selecionados por padrão ao carregar a proposta
  useEffect(() => {
    if (proposal?.items) {
      setSelectedItemIds(proposal.items.map((it) => it.id));
    }
  }, [proposal?.items]);

  const handleToggleSelectAll = () => {
    if (!proposal?.items) return;
    if (selectedItemIds.length === proposal.items.length) {
      setSelectedItemIds([]);
    } else {
      setSelectedItemIds(proposal.items.map((it) => it.id));
    }
  };

  const handleToggleItem = (itemId: string) => {
    setSelectedItemIds((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  };

  // Itens atualmente marcados pelo cliente
  const selectedItems = useMemo(() => {
    if (!proposal?.items) return [];
    return proposal.items.filter((it) => selectedItemIds.includes(it.id));
  }, [proposal?.items, selectedItemIds]);

  // Recálculo dinâmico instantâneo baseado exclusivamente nos itens selecionados
  const subtotalBruto = useMemo(() => {
    return selectedItems.reduce((acc, it) => acc + (it.gross_price || 0), 0);
  }, [selectedItems]);

  const descontoTotal = useMemo(() => {
    return selectedItems.reduce((acc, it) => acc + (it.discount || 0), 0);
  }, [selectedItems]);

  const investimentoFinal = useMemo(() => {
    return selectedItems.reduce((acc, it) => acc + (it.net_client_val || 0), 0);
  }, [selectedItems]);

  const totalInsercoes = useMemo(() => {
    return selectedItems.reduce((acc, it) => acc + (it.quantity || 1), 0);
  }, [selectedItems]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportExecutivePdf = async () => {
    if (!proposal) return;
    if (selectedItems.length === 0) {
      toast.warning("Selecione ao menos um ponto de mídia para gerar o PDF da proposta.");
      return;
    }
    setGeneratingPdf(true);
    try {
      const propApres: PropostaApresentacao = {
        id: proposal.id,
        numero: proposal.id.slice(0, 8).toUpperCase(),
        titulo: proposal.campaign_title || "Plano Comercial Estratégico",
        client_name: proposal.client_name,
        client_logo_url: proposal.client_logo_url || null,
        cliente: {
          id: proposal.client_id || undefined,
          nome_fantasia: proposal.client_name,
          razao_social: proposal.client_name,
          logo_url: proposal.client_logo_url || null,
        },
        valor_tabela: subtotalBruto,
        valor_negociado: investimentoFinal,
        valor_desconto: descontoTotal,
        total_insercoes: totalInsercoes,
        itens: selectedItems.map((it, idx) => {
          const parsed = parseItemPresentation(it, idx);
          return {
            tipo: parsed.formato,
            programa: `${parsed.codigo} - ${parsed.descricao}`,
            formato: `${parsed.dimensoes} (${parsed.periodo})`,
            insercoes_dia: it.quantity,
            total_insercoes: it.quantity,
            valor_unit: it.unit_price,
            valor_tabela: it.gross_price,
            desconto: it.discount_percent,
            valor_negociado: it.net_client_val,
            endereco_ponto: parsed.localizacaoCompleta || undefined,
          };
        }),
        observacoes: proposal.notes,
      };

      await gerarPdfPropostaExecutivaCoBranding(propApres);
      toast.success("PDF da Proposta Comercial gerado com sucesso!");
    } catch (err: any) {
      console.error("Erro ao gerar PDF:", err);
      toast.error("Erro ao gerar PDF: " + (err?.message || "falha na geração"));
    } finally {
      setGeneratingPdf(false);
    }
  };

  const statusCfg = proposal ? PROPOSAL_STATUS_LABELS[proposal.status] || PROPOSAL_STATUS_LABELS.draft : null;
  const isAllSelected = proposal?.items && selectedItemIds.length === proposal.items.length && proposal.items.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-background">
        <DialogHeader className="p-5 border-b bg-muted/30 shrink-0 flex flex-row items-center justify-between">
          <div>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <FileCheck2 className="w-5 h-5 text-primary" />
              Proposta Comercial & Plano de Mídia
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
              Cotação executiva oficial de pontos de mídia e investimento publicitário
            </DialogDescription>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportExecutivePdf}
              disabled={generatingPdf || !proposal || selectedItems.length === 0}
              className="gap-1.5 text-xs h-8 border-primary/30 text-primary hover:bg-primary/10"
              title="Baixar PDF Oficial da Proposta Comercial (sem exibidoras)"
            >
              {generatingPdf ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Printer className="w-3.5 h-3.5" />
              )}
              PDF da Proposta
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
              Carregando proposta comercial...
            </div>
          ) : !proposal ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              Proposta não localizada.
            </div>
          ) : (
            <div className="space-y-6">
              {/* Header da Proposta com Co-Branding do Cliente */}
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

              {/* Tabela de Produtos / Pontos de Mídia Cotados */}
              <div className="border rounded-xl overflow-hidden bg-card shadow-xs">
                {/* Barra de Ações e Seleção de Pacote */}
                <div className="p-3 bg-muted/40 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleToggleSelectAll}
                      className="h-7 text-xs font-semibold gap-1.5 border-primary/40 text-primary hover:bg-primary/10"
                    >
                      {isAllSelected ? (
                        <>
                          <CheckSquare className="w-3.5 h-3.5 text-primary" />
                          Desmarcar Todos
                        </>
                      ) : (
                        <>
                          <CheckSquare className="w-3.5 h-3.5 text-primary" />
                          Selecionar Todos (Pacote Completo)
                        </>
                      )}
                    </Button>
                    <span className="text-xs text-muted-foreground font-medium">
                      {selectedItems.length} de {proposal.items?.length || 0} ponto(s) selecionado(s)
                    </span>
                  </div>

                  <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-primary" />
                    <span>Selecione itens avulsos ou o pacote completo para recalcular o plano</span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="text-xs bg-muted/20 font-semibold border-b">
                        <TableHead className="w-10 text-center">
                          <Checkbox
                            checked={Boolean(isAllSelected)}
                            onCheckedChange={handleToggleSelectAll}
                            aria-label="Selecionar todos os pontos"
                          />
                        </TableHead>
                        <TableHead className="w-24">Código</TableHead>
                        <TableHead className="min-w-[220px]">Descrição / Localização</TableHead>
                        <TableHead>Formato / Tipo</TableHead>
                        <TableHead>Dimensões / Specs</TableHead>
                        <TableHead className="text-center">Período / Veiculação</TableHead>
                        <TableHead className="text-right">Valor Tabela</TableHead>
                        <TableHead className="text-right">Desconto</TableHead>
                        <TableHead className="text-right font-bold text-foreground">Valor Final</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(proposal.items || []).map((it, idx) => {
                        const parsed = parseItemPresentation(it, idx);
                        const isSelected = selectedItemIds.includes(it.id);

                        return (
                          <TableRow
                            key={it.id}
                            className={`text-xs transition-colors cursor-pointer ${
                              isSelected
                                ? "bg-background hover:bg-muted/30"
                                : "opacity-40 bg-muted/10 hover:opacity-75"
                            }`}
                            onClick={() => handleToggleItem(it.id)}
                          >
                            {/* Checkbox de Seleção */}
                            <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => handleToggleItem(it.id)}
                                aria-label={`Selecionar ponto ${parsed.codigo}`}
                              />
                            </TableCell>

                            {/* Código / Identificação do Ponto */}
                            <TableCell className="font-mono font-bold text-foreground">
                              <Badge variant="outline" className="font-mono text-[10px] bg-muted/50 border-primary/20 text-primary">
                                {parsed.codigo}
                              </Badge>
                            </TableCell>

                            {/* Descrição / Localização */}
                            <TableCell>
                              <div className="font-semibold text-foreground">
                                {parsed.descricao}
                              </div>
                              {parsed.localizacaoCompleta && (
                                <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                  <MapPin className="w-3 h-3 text-primary/70 shrink-0" />
                                  <span>{parsed.localizacaoCompleta}</span>
                                </div>
                              )}
                            </TableCell>

                            {/* Formato / Tipo */}
                            <TableCell>
                              <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] font-medium whitespace-nowrap">
                                {parsed.formato}
                              </Badge>
                            </TableCell>

                            {/* Dimensões / Especificações */}
                            <TableCell className="text-muted-foreground font-medium whitespace-nowrap">
                              {parsed.dimensoes}
                            </TableCell>

                            {/* Período / Veiculação */}
                            <TableCell className="text-center font-medium whitespace-nowrap">
                              {parsed.periodo}
                            </TableCell>

                            {/* Valor Tabela (Bruto) */}
                            <TableCell className="text-right text-muted-foreground">
                              {formatBRL(it.gross_price)}
                            </TableCell>

                            {/* Desconto Aplicado */}
                            <TableCell className="text-right text-rose-600 dark:text-rose-400 font-medium whitespace-nowrap">
                              {it.discount > 0 ? (
                                <span>-{formatBRL(it.discount)} <span className="text-[10px]">({it.discount_percent}%)</span></span>
                              ) : (
                                "—"
                              )}
                            </TableCell>

                            {/* Valor Final (Líquido) em Destaque */}
                            <TableCell className="text-right font-bold text-foreground">
                              <span className="text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded text-xs">
                                {formatBRL(it.net_client_val)}
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Totais Executivos da Proposta (Recálculo Dinâmico dos Itens Selecionados) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border bg-muted/30 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground uppercase font-medium">
                      Subtotal Bruto (Tabela)
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {selectedItems.length} ponto(s)
                    </span>
                  </div>
                  <div className="text-xl font-bold text-foreground">{formatBRL(subtotalBruto)}</div>
                  <span className="text-[11px] text-muted-foreground block">
                    Soma de tabela dos espaços selecionados
                  </span>
                </div>

                <div className="p-4 rounded-xl border bg-rose-500/5 border-rose-500/20 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-rose-700 dark:text-rose-400 uppercase font-medium">
                      Desconto Total Aplicado
                    </span>
                    {subtotalBruto > 0 && descontoTotal > 0 && (
                      <Badge className="bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 text-[10px] py-0">
                        {Math.round((descontoTotal / subtotalBruto) * 100)}% OFF
                      </Badge>
                    )}
                  </div>
                  <div className="text-xl font-bold text-rose-600 dark:text-rose-400">
                    -{formatBRL(descontoTotal)}
                  </div>
                  <span className="text-[11px] text-muted-foreground block">
                    Economia comercial negociada
                  </span>
                </div>

                <div className="p-4 rounded-xl border-2 border-emerald-500/40 bg-emerald-500/10 shadow-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-emerald-800 dark:text-emerald-300 uppercase font-bold">
                      Investimento Final (Líquido)
                    </span>
                    <Badge className="bg-emerald-600 text-white text-[9px] py-0">
                      Proposta Comercial
                    </Badge>
                  </div>
                  <div className="text-2xl font-black text-emerald-700 dark:text-emerald-300">
                    {formatBRL(investimentoFinal)}
                  </div>
                  <span className="text-[11px] text-emerald-800/80 dark:text-emerald-400 font-medium block">
                    Valor faturado ao anunciante ({selectedItems.length} ponto{selectedItems.length > 1 ? "s" : ""})
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
              disabled={generatingPdf || !proposal || selectedItems.length === 0}
              className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {generatingPdf ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Printer className="w-3.5 h-3.5" />
              )}
              Baixar PDF da Proposta ({selectedItems.length} pontos)
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
