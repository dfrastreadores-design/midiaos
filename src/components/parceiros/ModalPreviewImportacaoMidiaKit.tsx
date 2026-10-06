import { useState, useEffect, useMemo, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Building2,
  MapPin,
  ExternalLink,
  DollarSign,
  TrendingUp,
  Tag,
  Video,
  Layers,
  X,
  Plus,
  Loader2,
  FileSpreadsheet,
  FileText,
} from "lucide-react";
import { formatBRL } from "@/lib/mock-data";
import {
  ProdutoExtraidoMidiaKit,
  ResultadoExtracaoMidiaKit,
  RegraDescontoExtraida,
} from "@/lib/midia-kit-ai.functions";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resultado: ResultadoExtracaoMidiaKit | null;
  parceiroNome?: string;
  isSaving?: boolean;
  onConfirmar: (dados: {
    produtos: ProdutoExtraidoMidiaKit[];
    defesas: string[];
    regrasDesconto: RegraDescontoExtraida[];
    parceiroDetectado?: any;
  }) => Promise<void>;
}

export function ModalPreviewImportacaoMidiaKit({
  open,
  onOpenChange,
  resultado,
  parceiroNome,
  isSaving = false,
  onConfirmar,
}: Props) {
  const [produtos, setProdutos] = useState<ProdutoExtraidoMidiaKit[]>([]);
  const [defesas, setDefesas] = useState<string[]>([]);
  const [novaDefesa, setNovaDefesa] = useState("");
  const [regrasDesconto, setRegrasDesconto] = useState<RegraDescontoExtraida[]>([]);

  useEffect(() => {
    if (resultado) {
      setProdutos(
        (resultado.produtos || []).map((p) => ({
          ...p,
          selecionado: p.selecionado !== false,
        })),
      );
      setDefesas(resultado.defesasComerciais || []);
      setRegrasDesconto(resultado.regrasDesconto || []);
    }
  }, [resultado]);

  const selecionadosCount = useMemo(() => {
    return produtos.filter((p) => p.selecionado).length;
  }, [produtos]);

  const allSelected = useMemo(() => {
    return produtos.length > 0 && produtos.every((p) => p.selecionado);
  }, [produtos]);

  const toggleSelectAll = () => {
    const nextVal = !allSelected;
    setProdutos((prev) => prev.map((p) => ({ ...p, selecionado: nextVal })));
  };

  const toggleItem = (id_temp: string) => {
    setProdutos((prev) =>
      prev.map((p) => (p.id_temp === id_temp ? { ...p, selecionado: !p.selecionado } : p)),
    );
  };

  const updateItemPreco = (id_temp: string, valor: number) => {
    setProdutos((prev) =>
      prev.map((p) => (p.id_temp === id_temp ? { ...p, valor_unit: valor } : p)),
    );
  };

  const updateItemNome = (id_temp: string, nome: string) => {
    setProdutos((prev) =>
      prev.map((p) => (p.id_temp === id_temp ? { ...p, nome } : p)),
    );
  };

  const removerDefesa = (idx: number) => {
    setDefesas((prev) => prev.filter((_, i) => i !== idx));
  };

  const adicionarDefesa = () => {
    const val = novaDefesa.trim();
    if (!val) return;
    if (!defesas.includes(val)) {
      setDefesas((prev) => [...prev, val]);
    }
    setNovaDefesa("");
  };

  const handleSalvar = async () => {
    const selecionados = produtos.filter((p) => p.selecionado);
    await onConfirmar({
      produtos: selecionados,
      defesas,
      regrasDesconto,
      parceiroDetectado: resultado?.parceiroDetectado,
    });
  };

  if (!resultado) return null;

  const nomeExibidor =
    resultado.parceiroIdentificado ||
    resultado.parceiroDetectado?.nome ||
    parceiroNome ||
    "Veículo Parceiro";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-background">
        {/* Header */}
        <DialogHeader className="p-5 border-b bg-card/60 shrink-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold flex items-center gap-2">
                  Conferência & Importação de Inventário
                  <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-600 border-purple-500/20">
                    IA Mídia Kit
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Revise os pontos de mídia, argumentos persuasivos e descontos extraídos do arquivo de{" "}
                  <strong className="text-foreground">{nomeExibidor}</strong> antes de gravar no sistema.
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge className="bg-emerald-600 text-white text-xs px-2.5 py-1">
                {produtos.length} espaços identificados
              </Badge>
            </div>
          </div>
        </DialogHeader>

        {/* Body com Scroll */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* 1. Cards de Métricas Gerais Detectadas */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl border bg-muted/20">
              <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider block">
                Impacto Diário Estimado
              </span>
              <div className="text-base font-bold text-foreground mt-0.5">
                {resultado.metricasGerais?.impactosDiarios
                  ? `${resultado.metricasGerais.impactosDiarios.toLocaleString("pt-BR")}+`
                  : "820.000+"}
              </div>
              <span className="text-[10px] text-muted-foreground">pessoas/dia nos corredores</span>
            </div>

            <div className="p-3 rounded-xl border bg-muted/20">
              <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider block">
                Inserções Diárias / Tela
              </span>
              <div className="text-base font-bold text-purple-700 dark:text-purple-300 mt-0.5">
                {resultado.metricasGerais?.insercoesDiarias
                  ? `${resultado.metricasGerais.insercoesDiarias.toLocaleString("pt-BR")}x`
                  : "1.400x"}
              </div>
              <span className="text-[10px] text-muted-foreground">exibições por tela / dia</span>
            </div>

            <div className="p-3 rounded-xl border bg-muted/20">
              <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider block">
                Total de Telas / Pontos
              </span>
              <div className="text-base font-bold text-foreground mt-0.5">
                {produtos.length} painéis
              </div>
              <span className="text-[10px] text-muted-foreground">pontos mapeados</span>
            </div>

            <div className="p-3 rounded-xl border bg-muted/20">
              <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider block">
                Descontos por Prazo
              </span>
              <div className="text-xs font-semibold text-emerald-600 mt-0.5 flex flex-wrap gap-1">
                {regrasDesconto.length > 0
                  ? regrasDesconto.map((r, i) => (
                      <span key={i}>
                        {r.periodo}: {r.desconto_pct}%{i < regrasDesconto.length - 1 ? " • " : ""}
                      </span>
                    ))
                  : "Trim: 5% • Sem: 10% • Anual: 15%"}
              </div>
              <span className="text-[10px] text-muted-foreground">regras comerciais do veículo</span>
            </div>
          </div>

          {/* 2. Pilares de Defesa Comercial Extraídos do Mídia Kit */}
          <div className="p-4 rounded-xl border bg-amber-500/5 border-amber-500/20 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-amber-600" />
                  Pilares de Defesa Comercial do Veículo (Usados pela IA no Simulador):
                </span>
                <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30">
                  {defesas.length} argumentos
                </Badge>
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground">
              Estes argumentos e métricas reais serão consultados automaticamente pelo Simulador de Propostas para redigir a defesa estratégica de mídia do cliente anunciante.
            </p>

            <div className="flex flex-wrap gap-1.5 pt-1">
              {defesas.map((defesa, idx) => (
                <Badge
                  key={idx}
                  variant="secondary"
                  className="text-xs py-1 px-2.5 bg-background border flex items-center gap-1.5 hover:bg-muted/60 transition-colors"
                >
                  <span className="text-foreground">{defesa}</span>
                  <button
                    type="button"
                    onClick={() => removerDefesa(idx)}
                    className="text-muted-foreground hover:text-destructive transition-colors ml-0.5"
                    title="Remover argumento"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>

            <div className="flex gap-2 pt-1">
              <Input
                placeholder="Adicionar argumento ou métrica adicional da exibidora..."
                value={novaDefesa}
                onChange={(e) => setNovaDefesa(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    adicionarDefesa();
                  }
                }}
                className="h-8 text-xs bg-background"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={adicionarDefesa}
                className="h-8 text-xs gap-1 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" /> Adicionar
              </Button>
            </div>
          </div>

          {/* 3. Tabela de Espaços e Pontos de Mídia */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-primary" />
                  Pontos e Formatos Identificados no Inventário:
                </span>
                <span className="text-xs text-muted-foreground">
                  ({selecionadosCount} de {produtos.length} selecionados)
                </span>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={toggleSelectAll}
                className="h-7 text-xs text-primary"
              >
                {allSelected ? "Desmarcar Todos" : "Marcar Todos"}
              </Button>
            </div>

            <div className="border rounded-xl overflow-hidden bg-card">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="w-10 text-center">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead className="text-xs">Espaço / Ponto</TableHead>
                    <TableHead className="text-xs">Praça / Endereço</TableHead>
                    <TableHead className="text-xs">Mídia / Formato</TableHead>
                    <TableHead className="text-xs text-center">Inserções/Dia</TableHead>
                    <TableHead className="text-xs text-right">Valor Mensal (Tabela)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {produtos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-xs text-muted-foreground">
                        Nenhum produto detectado no arquivo.
                      </TableCell>
                    </TableRow>
                  ) : (
                    produtos.map((p) => (
                      <TableRow
                        key={p.id_temp}
                        className={p.selecionado ? "" : "opacity-50 bg-muted/10"}
                      >
                        <TableCell className="text-center">
                          <Checkbox
                            checked={p.selecionado}
                            onCheckedChange={() => toggleItem(p.id_temp)}
                          />
                        </TableCell>

                        <TableCell>
                          <div className="space-y-1">
                            <Input
                              value={p.nome}
                              onChange={(e) => updateItemNome(p.id_temp, e.target.value)}
                              className="h-7 text-xs font-semibold bg-background"
                            />
                            {p.detalhes_venda && (
                              <p className="text-[10px] text-muted-foreground line-clamp-1">
                                {p.detalhes_venda}
                              </p>
                            )}
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="text-xs">
                            <div className="font-medium flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-primary shrink-0" />
                              <span>{p.cidade || "Brasília"}/{p.estado || "DF"}</span>
                              {p.bairro && <span className="text-muted-foreground">• {p.bairro}</span>}
                            </div>
                            {p.endereco && (
                              <div className="text-[10px] text-muted-foreground truncate max-w-[220px]">
                                {p.endereco}
                              </div>
                            )}
                            {p.link_maps && (
                              <a
                                href={p.link_maps}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] text-primary hover:underline inline-flex items-center gap-0.5 mt-0.5"
                              >
                                Ver no Maps <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            )}
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex flex-col gap-0.5">
                            <Badge variant="outline" className="text-[10px] w-fit">
                              {p.midia} • {p.tipo || "Painel"}
                            </Badge>
                            {p.formato && (
                              <span className="text-[10px] text-muted-foreground">
                                {p.formato} • {p.duracao_segundos || 10}s
                              </span>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="text-center">
                          <span className="text-xs font-semibold text-purple-700 dark:text-purple-300">
                            {p.insercoes_dia ? `${p.insercoes_dia.toLocaleString("pt-BR")}x` : "1.400x"}
                          </span>
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="inline-flex items-center justify-end gap-1">
                            <span className="text-xs text-muted-foreground">R$</span>
                            <Input
                              type="number"
                              value={p.valor_unit || ""}
                              onChange={(e) => updateItemPreco(p.id_temp, parseFloat(e.target.value) || 0)}
                              className="h-7 text-xs font-bold text-right w-24 bg-background"
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="p-4 border-t bg-card/60 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground">
            {selecionadosCount === 0 ? (
              <span className="text-amber-600 flex items-center gap-1 font-medium">
                <AlertTriangle className="w-3.5 h-3.5" /> Nenhum espaço selecionado
              </span>
            ) : (
              <span className="text-emerald-600 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> {selecionadosCount} espaços selecionados para cadastro
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
              className="text-xs"
            >
              Cancelar
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handleSalvar}
              disabled={isSaving || selecionadosCount === 0}
              className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex-1 sm:flex-initial"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Cadastrando no Catálogo...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Confirmar e Cadastrar Produtos e Defesas no Mídia.OS
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
