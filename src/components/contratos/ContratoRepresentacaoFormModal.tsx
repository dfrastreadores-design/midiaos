import { useState, useEffect, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
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
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  FileSignature,
  Building2,
  Calendar,
  Sparkles,
  ShieldCheck,
  Percent,
  Plus,
  Trash2,
  Loader2,
  Eye,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Receipt,
  FileText,
  MapPin,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import {
  ContratoRepresentacao,
  RegraGatilhoFaixa,
  TipoComissaoRepresentacao,
} from "@/types/representacao-contratos.types";
import { upsertContratoRepresentacao } from "@/lib/representacao-contratos.functions";
import { generateContractContent, fmtBRL } from "@/lib/representacao-contratos";

interface ContratoRepresentacaoFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contratoParaEditar?: ContratoRepresentacao | null;
  parceiros: any[];
}

const PRODUTOS_PRESET = [
  "Painéis de LED Digital (DOOH)",
  "Frontlights Rodoviários e Urbanos (OOH)",
  "DOOH em Elevadores Residenciais e Comerciais",
  "Outdoors Bi-Semana",
  "Totens de Rua e Mobiliário Urbano",
  "Telas em Restaurantes e Gastronomia",
  "Empenas Cegas",
];

export function ContratoRepresentacaoFormModal({
  open,
  onOpenChange,
  contratoParaEditar,
  parceiros,
}: ContratoRepresentacaoFormModalProps) {
  const qc = useQueryClient();
  const upsertContratoFn = useServerFn(upsertContratoRepresentacao);

  const [activeTab, setActiveTab] = useState<"formulario" | "preview">("formulario");

  // Estado do Formulário
  const [parceiroId, setParceiroId] = useState<string>("");
  const [numeroContrato, setNumeroContrato] = useState<string>("");
  const [territorio, setTerritorio] = useState<string>("Distrito Federal e Entorno");
  const [vigenciaMeses, setVigenciaMeses] = useState<number>(12);
  const [dataInicio, setDataInicio] = useState<string>("");
  const [dataFim, setDataFim] = useState<string>("");
  const [produtosRepresentados, setProdutosRepresentados] = useState<string[]>([]);
  const [novoProdutoInput, setNovoProdutoInput] = useState<string>("");

  // Modelos de Faturamento
  const [permiteCentralizado, setPermiteCentralizado] = useState<boolean>(true);
  const [aliquotaImpostoNexo, setAliquotaImpostoNexo] = useState<number>(6.0);
  const [permiteDiretoParceiro, setPermiteDiretoParceiro] = useState<boolean>(true);
  const [prazoRepasseDias, setPrazoRepasseDias] = useState<number>(3);

  // Remuneração
  const [tipoComissao, setTipoComissao] = useState<TipoComissaoRepresentacao>("fixa");
  const [comissaoFixa, setComissaoFixa] = useState<number>(25.0);
  const [regrasGatilho, setRegrasGatilho] = useState<RegraGatilhoFaixa[]>([
    { faixa: 1, de: 0, ate: 30000, comissao_percentual: 30.0 },
    { faixa: 2, de: 30001, ate: 70000, comissao_percentual: 35.0 },
    { faixa: 3, de: 70001, ate: null, comissao_percentual: 40.0 },
  ]);

  // Blindagem Jurídica
  const [garantiaPosRescisao, setGarantiaPosRescisao] = useState<boolean>(true);
  const [comissaoRenovacoes, setComissaoRenovacoes] = useState<boolean>(true);
  const [statusContrato, setStatusContrato] = useState<ContratoRepresentacao["status"]>("rascunho");

  // Parceiro selecionado para preview
  const parceiroSelecionado = useMemo(() => {
    return parceiros.find((p) => p.id === parceiroId);
  }, [parceiros, parceiroId]);

  // Carregar dados para edição ou inicialização
  useEffect(() => {
    if (contratoParaEditar) {
      setParceiroId(contratoParaEditar.parceiro_id);
      setNumeroContrato(contratoParaEditar.numero_contrato);
      setTerritorio(contratoParaEditar.territorio);
      setVigenciaMeses(contratoParaEditar.vigencia_meses || 12);
      setDataInicio(contratoParaEditar.data_inicio || "");
      setDataFim(contratoParaEditar.data_fim || "");
      setProdutosRepresentados(contratoParaEditar.produtos_representados || []);
      setPermiteCentralizado(contratoParaEditar.permite_faturamento_centralizado_nexo);
      setAliquotaImpostoNexo(contratoParaEditar.aliquota_imposto_nexo_percentual || 6.0);
      setPermiteDiretoParceiro(contratoParaEditar.permite_faturamento_direto_parceiro);
      setPrazoRepasseDias(contratoParaEditar.prazo_repasse_dias || 3);
      setTipoComissao(contratoParaEditar.tipo_comissao);
      setComissaoFixa(contratoParaEditar.comissao_fixa_percentual || 25.0);
      setRegrasGatilho(
        contratoParaEditar.regras_gatilho && contratoParaEditar.regras_gatilho.length > 0
          ? contratoParaEditar.regras_gatilho
          : [
              { faixa: 1, de: 0, ate: 30000, comissao_percentual: 30.0 },
              { faixa: 2, de: 30001, ate: 70000, comissao_percentual: 35.0 },
              { faixa: 3, de: 70001, ate: null, comissao_percentual: 40.0 },
            ],
      );
      setGarantiaPosRescisao(contratoParaEditar.garantia_comissao_pos_rescisao);
      setComissaoRenovacoes(contratoParaEditar.comissao_sobre_renovacoes);
      setStatusContrato(contratoParaEditar.status);
    } else {
      const ano = new Date().getFullYear();
      const rand = Math.floor(100 + Math.random() * 900);
      setNumeroContrato(`REP-${ano}-NEXO-${rand}`);
      setParceiroId("");
      setTerritorio("Distrito Federal e Entorno");
      setVigenciaMeses(12);
      const hoje = new Date().toISOString().split("T")[0];
      const fim = new Date(Date.now() + 365 * 86400000).toISOString().split("T")[0];
      setDataInicio(hoje);
      setDataFim(fim);
      setProdutosRepresentados([
        "Painéis de LED Digital (DOOH)",
        "Frontlights Rodoviários e Urbanos (OOH)",
      ]);
      setPermiteCentralizado(true);
      setAliquotaImpostoNexo(6.0);
      setPermiteDiretoParceiro(true);
      setPrazoRepasseDias(3);
      setTipoComissao("fixa");
      setComissaoFixa(25.0);
      setGarantiaPosRescisao(true);
      setComissaoRenovacoes(true);
      setStatusContrato("rascunho");
    }
  }, [contratoParaEditar, open]);

  // Live preview do contrato gerado dinamicamente
  const liveContractMarkdown = useMemo(() => {
    return generateContractContent({
      numero_contrato: numeroContrato || "REP-2026-NEXO-000",
      parceiro_nome: parceiroSelecionado?.nome_fantasia || parceiroSelecionado?.razao_social || "Parceiro de Mídia",
      parceiro_razao_social: parceiroSelecionado?.razao_social,
      parceiro_cnpj: parceiroSelecionado?.cnpj,
      parceiro_endereco: parceiroSelecionado?.endereco,
      parceiro_pix: parceiroSelecionado?.chave_pix,
      territorio,
      produtos_representados: produtosRepresentados,
      permite_faturamento_centralizado_nexo: permiteCentralizado,
      aliquota_imposto_nexo_percentual: aliquotaImpostoNexo,
      permite_faturamento_direto_parceiro: permiteDiretoParceiro,
      prazo_repasse_dias: prazoRepasseDias,
      tipo_comissao: tipoComissao,
      comissao_fixa_percentual: comissaoFixa,
      regras_gatilho: regrasGatilho,
      garantia_comissao_pos_rescisao: garantiaPosRescisao,
      comissao_sobre_renovacoes: comissaoRenovacoes,
      vigencia_meses: vigenciaMeses,
      data_inicio: dataInicio,
      data_fim: dataFim,
    });
  }, [
    numeroContrato,
    parceiroSelecionado,
    territorio,
    produtosRepresentados,
    permiteCentralizado,
    aliquotaImpostoNexo,
    permiteDiretoParceiro,
    prazoRepasseDias,
    tipoComissao,
    comissaoFixa,
    regrasGatilho,
    garantiaPosRescisao,
    comissaoRenovacoes,
    vigenciaMeses,
    dataInicio,
    dataFim,
  ]);

  // Manipulação de Faixas de Gatilhos
  const handleAddFaixa = () => {
    const ultima = regrasGatilho[regrasGatilho.length - 1];
    const novaFaixaNum = regrasGatilho.length + 1;
    const novoDe = ultima ? (ultima.ate ? ultima.ate + 1 : ultima.de + 50000) : 0;
    const novaComissao = ultima ? Math.min(100, ultima.comissao_percentual + 5) : 30;

    setRegrasGatilho([
      ...regrasGatilho,
      { faixa: novaFaixaNum, de: novoDe, ate: null, comissao_percentual: novaComissao },
    ]);
  };

  const handleUpdateFaixa = (index: number, field: keyof RegraGatilhoFaixa, val: any) => {
    const atualizadas = [...regrasGatilho];
    atualizadas[index] = { ...atualizadas[index], [field]: val };
    setRegrasGatilho(atualizadas);
  };

  const handleRemoveFaixa = (index: number) => {
    if (regrasGatilho.length <= 1) {
      toast.warning("O contrato com gatilho precisa de pelo menos uma faixa.");
      return;
    }
    const filtradas = regrasGatilho
      .filter((_, i) => i !== index)
      .map((f, i) => ({ ...f, faixa: i + 1 }));
    setRegrasGatilho(filtradas);
  };

  // Mutação para Salvar
  const saveMutation = useMutation({
    mutationFn: (data: any) => upsertContratoFn({ data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contratos_representacao"] });
      toast.success(
        contratoParaEditar
          ? "Contrato de representação atualizado com sucesso!"
          : "Contrato de representação criado com sucesso!",
      );
      onOpenChange(false);
    },
    onError: (err: any) => {
      console.error("Erro ao salvar contrato:", err);
      toast.error("Erro ao salvar contrato: " + (err.message || "falha na gravação"));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!parceiroId) {
      toast.error("Por favor, selecione o parceiro/veículo para este contrato.");
      return;
    }
    if (!numeroContrato.trim()) {
      toast.error("Informe o número do contrato.");
      return;
    }
    if (!permiteCentralizado && !permiteDiretoParceiro) {
      toast.error("Ao menos uma modalidade de faturamento deve estar habilitada.");
      return;
    }

    saveMutation.mutate({
      id: contratoParaEditar?.id,
      tenant_cnpj: "68.279.031/0001-67",
      parceiro_id: parceiroId,
      numero_contrato: numeroContrato.trim(),
      status: statusContrato,
      produtos_representados: produtosRepresentados,
      territorio,
      permite_faturamento_centralizado_nexo: permiteCentralizado,
      aliquota_imposto_nexo_percentual: aliquotaImpostoNexo,
      permite_faturamento_direto_parceiro: permiteDiretoParceiro,
      prazo_repasse_dias: prazoRepasseDias,
      tipo_comissao: tipoComissao,
      comissao_fixa_percentual: tipoComissao === "fixa" ? comissaoFixa : null,
      regras_gatilho: tipoComissao === "gatilho_volume" ? regrasGatilho : [],
      garantia_comissao_pos_rescisao: garantiaPosRescisao,
      comissao_sobre_renovacoes: comissaoRenovacoes,
      vigencia_meses: vigenciaMeses,
      data_inicio: dataInicio || null,
      data_fim: dataFim || null,
      conteudo_contrato_markdown: liveContractMarkdown,
    });
  };

  const handleAddProduto = () => {
    if (novoProdutoInput.trim() && !produtosRepresentados.includes(novoProdutoInput.trim())) {
      setProdutosRepresentados([...produtosRepresentados, novoProdutoInput.trim()]);
      setNovoProdutoInput("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-background">
        <DialogHeader className="p-5 border-b bg-muted/30 shrink-0 flex flex-row items-center justify-between">
          <div>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <FileSignature className="size-5 text-primary" />
              {contratoParaEditar ? "Editar Contrato de Representação" : "Novo Contrato de Representação & Veículos"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
              Definição de regras de intermediação, split de faturamento e comissionamento comercial
            </DialogDescription>
          </div>

          <div className="flex items-center gap-2">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
              <TabsList className="h-8">
                <TabsTrigger value="formulario" className="text-xs">
                  Configurações
                </TabsTrigger>
                <TabsTrigger value="preview" className="text-xs gap-1.5">
                  <Eye className="size-3.5" />
                  Live Preview Jurídico
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === "preview" ? (
            /* PREVIEW DO CONTRATO EM MARKDOWN */
            <div className="space-y-4">
              <div className="p-3 bg-muted/40 border rounded-xl flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5 font-medium text-foreground">
                  <FileText className="size-4 text-primary" />
                  Prévia do Instrumento Jurídico (Atualizado em Tempo Real)
                </span>
                <span>Contrato #{numeroContrato}</span>
              </div>
              <div className="p-6 rounded-xl border bg-card/60 shadow-inner font-mono text-xs whitespace-pre-wrap leading-relaxed text-foreground/90 max-h-[60vh] overflow-y-auto">
                {liveContractMarkdown}
              </div>
            </div>
          ) : (
            /* FORMULÁRIO COMPLETO */
            <form id="contrato-form" onSubmit={handleSubmit} className="space-y-6">
              {/* SEÇÃO 1: DADOS CADASTRAIS */}
              <div className="p-4 rounded-xl border bg-card space-y-4">
                <div className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5 border-b pb-2">
                  <Building2 className="size-3.5" />
                  1. Qualificação do Parceiro & Vigência
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-xs font-semibold">Veículo / Parceiro de Mídia *</Label>
                    <Select value={parceiroId} onValueChange={setParceiroId}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Selecione a empresa exibidora/veículo" />
                      </SelectTrigger>
                      <SelectContent>
                        {parceiros.map((p) => (
                          <SelectItem key={p.id} value={p.id} className="text-xs">
                            <span className="font-semibold">{p.nome_fantasia || p.razao_social}</span>
                            {p.cnpj && <span className="text-muted-foreground ml-1.5">({p.cnpj})</span>}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1 sm:col-span-1">
                    <Label className="text-xs font-semibold">Número do Contrato *</Label>
                    <Input
                      value={numeroContrato}
                      onChange={(e) => setNumeroContrato(e.target.value)}
                      className="h-9 text-xs font-mono font-bold"
                      placeholder="REP-2026-NEXO-001"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-xs font-semibold">Território de Atuação</Label>
                    <div className="relative">
                      <MapPin className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                      <Input
                        value={territorio}
                        onChange={(e) => setTerritorio(e.target.value)}
                        className="h-9 pl-8 text-xs"
                        placeholder="Distrito Federal e Entorno"
                      />
                    </div>
                  </div>

                  <div className="space-y-1 sm:col-span-1">
                    <Label className="text-xs font-semibold">Vigência (Meses)</Label>
                    <Input
                      type="number"
                      min="1"
                      max="120"
                      value={vigenciaMeses}
                      onChange={(e) => setVigenciaMeses(Number(e.target.value) || 12)}
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-1">
                    <Label className="text-xs font-semibold">Status do Instrumento</Label>
                    <Select value={statusContrato} onValueChange={(v) => setStatusContrato(v as any)}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="rascunho">Rascunho</SelectItem>
                        <SelectItem value="enviado_assinatura">Enviado p/ Assinatura</SelectItem>
                        <SelectItem value="ativo">Ativo / Vigente</SelectItem>
                        <SelectItem value="suspenso">Suspenso</SelectItem>
                        <SelectItem value="rescindido">Rescindido</SelectItem>
                        <SelectItem value="vencido">Vencido</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Data de Início</Label>
                    <Input
                      type="date"
                      value={dataInicio}
                      onChange={(e) => setDataInicio(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Data de Término</Label>
                    <Input
                      type="date"
                      value={dataFim}
                      onChange={(e) => setDataFim(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>

                {/* Produtos Representados */}
                <div className="space-y-2 pt-1 border-t">
                  <Label className="text-xs font-semibold">Produtos e Formatos de Mídia Representados</Label>
                  <div className="flex flex-wrap gap-1.5 pb-2">
                    {produtosRepresentados.map((prod, idx) => (
                      <Badge
                        key={idx}
                        variant="secondary"
                        className="text-xs py-1 px-2.5 gap-1.5 bg-muted font-normal"
                      >
                        {prod}
                        <button
                          type="button"
                          onClick={() => setProdutosRepresentados(produtosRepresentados.filter((_, i) => i !== idx))}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          ✕
                        </button>
                      </Badge>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <Input
                      value={novoProdutoInput}
                      onChange={(e) => setNovoProdutoInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddProduto();
                        }
                      }}
                      placeholder="Adicione um formato (ex: Frontlight EPTG, Telas em Shopping)"
                      className="h-8 text-xs flex-1"
                    />
                    <Button type="button" size="sm" variant="outline" onClick={handleAddProduto} className="h-8 text-xs">
                      <Plus className="size-3 mr-1" /> Adicionar
                    </Button>
                  </div>
                </div>
              </div>

              {/* SEÇÃO 2: MODELOS DE FATURAMENTO E LIQUIDAÇÃO */}
              <div className="p-4 rounded-xl border bg-card space-y-4">
                <div className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5 border-b pb-2">
                  <Receipt className="size-3.5" />
                  2. Modelos de Faturamento e Liquidação Habilitados
                </div>

                {/* Toggle Modalidade 1 */}
                <div className="p-3.5 rounded-xl border bg-muted/20 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold flex items-center gap-2 text-foreground">
                        <CheckCircle2 className="size-4 text-primary" />
                        Modalidade 1: Faturamento Centralizado via Nexo (Nota Única ao Anunciante)
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        A Nexo fatura o cliente ou agência diretamente com emissão de NFS-e, deduz o imposto retido e a comissão, e repassa o líquido ao veículo.
                      </p>
                    </div>
                    <Switch
                      checked={permiteCentralizado}
                      onCheckedChange={setPermiteCentralizado}
                    />
                  </div>

                  {permiteCentralizado && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border/60">
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">Alíquota de Imposto Retido da NF Nexo (%)</Label>
                        <div className="relative">
                          <Percent className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.5"
                            value={aliquotaImpostoNexo}
                            onChange={(e) => setAliquotaImpostoNexo(Number(e.target.value) || 0)}
                            className="h-8 pl-8 text-xs font-semibold"
                            placeholder="6.0"
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground block">
                          Taxa de impostos deduzida antes do repasse líquido ao parceiro.
                        </span>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">Prazo de Repasse Líquido ao Parceiro</Label>
                        <div className="relative">
                          <Clock className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                          <Input
                            type="number"
                            min="1"
                            max="60"
                            value={prazoRepasseDias}
                            onChange={(e) => setPrazoRepasseDias(Number(e.target.value) || 3)}
                            className="h-8 pl-8 text-xs"
                            placeholder="3"
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground block">
                          Dias úteis após a compensação efetiva do cliente anunciante.
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Toggle Modalidade 2 */}
                <div className="p-3.5 rounded-xl border bg-muted/20 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold flex items-center gap-2 text-foreground">
                        <CheckCircle2 className="size-4 text-purple-600" />
                        Modalidade 2: Faturamento Direto pelo Parceiro (RT / Comissão de Intermediação)
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        O parceiro emite a nota fiscal diretamente ao cliente. A Nexo centraliza os documentos e emite NFS-e cobrando sua comissão após o pagamento.
                      </p>
                    </div>
                    <Switch
                      checked={permiteDiretoParceiro}
                      onCheckedChange={setPermiteDiretoParceiro}
                    />
                  </div>
                </div>
              </div>

              {/* SEÇÃO 3: REGRA DE REMUNERAÇÃO (FIXA OU GATILHO) */}
              <div className="p-4 rounded-xl border bg-card space-y-4">
                <div className="text-xs font-bold uppercase tracking-wider text-primary flex items-center justify-between border-b pb-2">
                  <span className="flex items-center gap-1.5">
                    <TrendingUp className="size-3.5" />
                    3. Regra de Remuneração e Comissionamento Comercial
                  </span>

                  <div className="flex items-center gap-1 bg-muted p-0.5 rounded-lg">
                    <Button
                      type="button"
                      size="sm"
                      variant={tipoComissao === "fixa" ? "default" : "ghost"}
                      onClick={() => setTipoComissao("fixa")}
                      className="h-6 text-[11px] px-2.5"
                    >
                      Comissão Fixa
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={tipoComissao === "gatilho_volume" ? "default" : "ghost"}
                      onClick={() => setTipoComissao("gatilho_volume")}
                      className="h-6 text-[11px] px-2.5"
                    >
                      Gatilhos de Volume
                    </Button>
                  </div>
                </div>

                {tipoComissao === "fixa" ? (
                  <div className="p-4 rounded-xl border bg-muted/10 space-y-2 max-w-sm">
                    <Label className="text-xs font-semibold">Percentual de Comissão Fixa (%)</Label>
                    <div className="relative">
                      <Percent className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                      <Input
                        type="number"
                        min="1"
                        max="100"
                        step="0.5"
                        value={comissaoFixa}
                        onChange={(e) => setComissaoFixa(Number(e.target.value) || 0)}
                        className="pl-8 text-sm font-bold text-primary"
                        placeholder="25.0"
                      />
                    </div>
                    <span className="text-[11px] text-muted-foreground block">
                      Aplicada uniformemente sobre todas as vendas brutas dos espaços representados.
                    </span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground">
                        Tabela de Escalonamento por Faixa de Volume Bruto
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleAddFaixa}
                        className="h-7 text-xs gap-1 border-primary/30 text-primary hover:bg-primary/10"
                      >
                        <Plus className="size-3" /> Adicionar Faixa
                      </Button>
                    </div>

                    <div className="border rounded-xl overflow-hidden bg-background">
                      <table className="w-full text-xs">
                        <thead className="bg-muted/40 border-b text-muted-foreground font-semibold">
                          <tr>
                            <th className="p-2 text-left w-16">Faixa</th>
                            <th className="p-2 text-left">Valor De (R$)</th>
                            <th className="p-2 text-left">Valor Até (R$)</th>
                            <th className="p-2 text-left w-32">Comissão (%)</th>
                            <th className="p-2 text-center w-12"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {regrasGatilho.map((f, idx) => (
                            <tr key={idx} className="hover:bg-muted/20">
                              <td className="p-2 font-bold font-mono">#{f.faixa}</td>
                              <td className="p-2">
                                <Input
                                  type="number"
                                  min="0"
                                  step="1000"
                                  value={f.de}
                                  onChange={(e) =>
                                    handleUpdateFaixa(idx, "de", Number(e.target.value) || 0)
                                  }
                                  className="h-7 text-xs"
                                />
                              </td>
                              <td className="p-2">
                                <Input
                                  type="number"
                                  min="0"
                                  step="1000"
                                  value={f.ate ?? ""}
                                  placeholder="Sem limite (Teto)"
                                  onChange={(e) =>
                                    handleUpdateFaixa(
                                      idx,
                                      "ate",
                                      e.target.value === "" ? null : Number(e.target.value) || null,
                                    )
                                  }
                                  className="h-7 text-xs"
                                />
                              </td>
                              <td className="p-2">
                                <div className="relative">
                                  <Input
                                    type="number"
                                    min="1"
                                    max="100"
                                    step="0.5"
                                    value={f.comissao_percentual}
                                    onChange={(e) =>
                                      handleUpdateFaixa(
                                        idx,
                                        "comissao_percentual",
                                        Number(e.target.value) || 0,
                                      )
                                    }
                                    className="h-7 text-xs font-bold text-primary pr-6"
                                  />
                                  <span className="absolute right-2 top-1.5 text-[10px] text-muted-foreground font-bold">
                                    %
                                  </span>
                                </div>
                              </td>
                              <td className="p-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveFaixa(idx)}
                                  className="text-muted-foreground hover:text-destructive"
                                  title="Remover faixa"
                                >
                                  <Trash2 className="size-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* SEÇÃO 4: GARANTIAS E BLINDAGEM JURÍDICA */}
              <div className="p-4 rounded-xl border bg-card space-y-4">
                <div className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5 border-b pb-2">
                  <ShieldCheck className="size-3.5" />
                  4. Garantias de Continuidade e Blindagem Comercial
                </div>

                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3 p-3 rounded-lg border bg-muted/20">
                    <div className="space-y-0.5">
                      <Label className="text-xs font-bold text-foreground">
                        Garantia de Comissionamento Pós-Rescisão
                      </Label>
                      <p className="text-[11px] text-muted-foreground">
                        Assegura o recebimento integral de comissões sobre todos os contratos e veiculações fechados pela Nexo até o fim da vigência de cada anunciante, mesmo em caso de distrato da parceria.
                      </p>
                    </div>
                    <Switch
                      checked={garantiaPosRescisao}
                      onCheckedChange={setGarantiaPosRescisao}
                    />
                  </div>

                  <div className="flex items-start justify-between gap-3 p-3 rounded-lg border bg-muted/20">
                    <div className="space-y-0.5">
                      <Label className="text-xs font-bold text-foreground">
                        Comissionamento sobre Renovações e Aditivos
                      </Label>
                      <p className="text-[11px] text-muted-foreground">
                        Garante o pagamento de comissões caso o cliente captado pela Nexo renove ou amplie seu plano de mídia no período subsequente.
                      </p>
                    </div>
                    <Switch
                      checked={comissaoRenovacoes}
                      onCheckedChange={setComissaoRenovacoes}
                    />
                  </div>
                </div>
              </div>
            </form>
          )}
        </div>

        <DialogFooter className="p-4 border-t bg-muted/20 shrink-0 flex items-center justify-between">
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>

          <div className="flex items-center gap-2">
            {activeTab === "formulario" && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setActiveTab("preview")}
                className="text-xs gap-1.5"
              >
                <Eye className="size-3.5" /> Visualizar Contrato
              </Button>
            )}

            <Button
              type="submit"
              form="contrato-form"
              size="sm"
              disabled={saveMutation.isPending}
              className="gap-1.5 text-xs bg-primary font-semibold"
            >
              {saveMutation.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="size-3.5" />
              )}
              {contratoParaEditar ? "Salvar Alterações" : "Emitir Contrato"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
