import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Upload,
  Download,
  Plus,
  FileText,
  BarChart3,
  Tv,
  Radio,
  Share2,
  Copy,
  CheckCircle2,
  Sparkles,
  Building2,
  TrendingUp,
  ShieldCheck,
  ExternalLink,
  Trash2,
  Pencil,
  FileSpreadsheet,
  Paperclip,
} from "lucide-react";
import { toast } from "sonner";
import {
  listParceirosMetricas,
  upsertParceiroMetrica,
  importarParceirosMetricasLote,
  getDefesaVeiculacaoTextoConsolidado,
  METRICAS_MODELO_DF,
  type ParceiroMetrica,
} from "@/lib/parceiros-metricas.functions";
import { UniversalAnexosModal } from "@/components/anexos/UniversalAnexosModal";

export function ParceirosMetricasManager() {
  const qc = useQueryClient();
  const listFn = useServerFn(listParceirosMetricas);
  const upsertFn = useServerFn(upsertParceiroMetrica);
  const importarLoteFn = useServerFn(importarParceirosMetricasLote);
  const getDefesaFn = useServerFn(getDefesaVeiculacaoTextoConsolidado);

  const { data: metricas = [], isLoading } = useQuery({
    queryKey: ["parceiros-metricas-lista"],
    queryFn: () => listFn(),
  });

  const [busca, setBusca] = useState("");
  const [modalNovoAberto, setModalNovoAberto] = useState(false);
  const [modalImportarAberto, setModalImportarAberto] = useState(false);
  const [modalDefesaAberto, setModalDefesaAberto] = useState(false);
  const [textoDefesaGerado, setTextoDefesaGerado] = useState("");

  // Estado para Anexo de Documentos
  const [modalAnexoAberto, setModalAnexoAberto] = useState(false);
  const [anexoAlvo, setAnexoAlvo] = useState<{ id: string; nome: string }>({ id: "", nome: "" });

  // Formulário de Cadastro Manual
  const [editando, setEditando] = useState<ParceiroMetrica | null>(null);
  const [form, setForm] = useState<ParceiroMetrica>({
    parceiro_nome: "",
    tipo_midia: "TV Aberta",
    veiculo_programa: "",
    praca: "Brasília - DF e Entorno",
    alcance_estimado: "",
    impactos_mes: "",
    fluxo_diario: "",
    perfil_publico: "Classes A, B e C, 25 a 55 anos",
    audiencia_share: "",
    fonte_dados: "Kantar IBOPE Media / Auditoria de Tráfego",
    defesa_tecnica: "",
    destaques_comerciais: [],
    ativo: true,
  });

  // Área de Colar CSV / Planilha
  const [csvTexto, setCsvTexto] = useState("");

  const upsertMutation = useMutation({
    mutationFn: (data: ParceiroMetrica) => upsertFn({ data }),
    onSuccess: () => {
      toast.success("Métrica do parceiro salva com sucesso!");
      qc.invalidateQueries({ queryKey: ["parceiros-metricas-lista"] });
      setModalNovoAberto(false);
      setEditando(null);
    },
    onError: (err: any) => toast.error(err?.message || "Erro ao salvar métrica"),
  });

  const importarMutation = useMutation({
    mutationFn: (itens: ParceiroMetrica[]) => importarLoteFn({ data: { itens } }),
    onSuccess: (res) => {
      toast.success(`${res.totalImportados} métricas e números de parceiros importados!`);
      qc.invalidateQueries({ queryKey: ["parceiros-metricas-lista"] });
      setModalImportarAberto(false);
      setCsvTexto("");
    },
    onError: (err: any) => toast.error(err?.message || "Erro ao importar planilha"),
  });

  const abrirEdicao = (m: ParceiroMetrica) => {
    setEditando(m);
    setForm(m);
    setModalNovoAberto(true);
  };

  const abrirNovo = () => {
    setEditando(null);
    setForm({
      parceiro_nome: "",
      tipo_midia: "Painéis de LED / DOOH",
      veiculo_programa: "",
      praca: "Brasília - DF",
      alcance_estimado: "",
      impactos_mes: "",
      fluxo_diario: "",
      perfil_publico: "Classes A e B, 25 a 55 anos",
      audiencia_share: "",
      fonte_dados: "Auditoria de Tráfego Viário",
      defesa_tecnica: "",
      destaques_comerciais: [],
      ativo: true,
    });
    setModalNovoAberto(true);
  };

  // Processa texto CSV ou colado do Excel
  const processarCsvColado = () => {
    if (!csvTexto.trim()) {
      toast.error("Cole os dados da planilha ou CSV");
      return;
    }

    try {
      const linhas = csvTexto.trim().split("\n");
      const itensImportados: ParceiroMetrica[] = [];

      for (let i = 0; i < linhas.length; i++) {
        const linha = linhas[i].trim();
        if (!linha) continue;

        // Se for cabeçalho, pula
        if (i === 0 && (linha.toLowerCase().includes("parceiro") || linha.toLowerCase().includes("midia"))) {
          continue;
        }

        // Divide por vírgula, ponto-e-vírgula ou tabulação (Excel)
        const partes = linha.includes("\t")
          ? linha.split("\t")
          : linha.includes(";")
            ? linha.split(";")
            : linha.split(",");

        if (partes.length >= 3) {
          itensImportados.push({
            parceiro_nome: partes[0]?.trim() || "Parceiro",
            tipo_midia: partes[1]?.trim() || "Mídia Exterior",
            veiculo_programa: partes[2]?.trim() || "Grade Principal",
            praca: partes[3]?.trim() || "Brasília - DF",
            alcance_estimado: partes[4]?.trim() || "1.000.000 pessoas/mês",
            impactos_mes: partes[5]?.trim() || "3.000.000 impactos",
            fluxo_diario: partes[6]?.trim() || "100.000 fluxo/dia",
            perfil_publico: partes[7]?.trim() || "Público Geral",
            fonte_dados: partes[8]?.trim() || "Auditoria Própria",
            defesa_tecnica:
              partes[9]?.trim() ||
              "Veículo com excelente penetração de público e alto índice de frequência comprovada.",
            destaques_comerciais: partes[10] ? [partes[10].trim()] : ["Alta visibilidade"],
            ativo: true,
          });
        }
      }

      if (itensImportados.length === 0) {
        toast.error("Nenhuma linha válida identificada no formato");
        return;
      }

      importarMutation.mutate(itensImportados);
    } catch (e: any) {
      toast.error("Erro ao interpretar dados colados: " + e.message);
    }
  };

  const baixarTemplateCsv = () => {
    const csvContent =
      "Parceiro;Tipo Midia;Veiculo ou Programa;Praca;Alcance Estimado;Impactos Mes;Fluxo Diario;Perfil Publico;Fonte Dados;Defesa Tecnica;Destaque\n" +
      "TV Brasília;TV Aberta;Jornal Local;DF e Entorno;1.680.000 pessoas;5.400.000 impactos;320.000 lares;Classes B e C;Kantar IBOPE;Mais de 60 anos de autoridade e credibilidade regional;Liderança local no almoço\n" +
      "Circuito DOOH Eixo;Painéis de LED;Eixo Monumental;Brasília - DF;920.000 pessoas;4.200.000 impactos;195.000 veic/dia;Classes A e B;DER-DF;Tempo semafórico ideal para memorização;Full HD de alto brilho\n";

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "modelo_metricas_parceiros_midiaos.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Modelo CSV baixado!");
  };

  const carregarDadosPadraoDF = () => {
    importarMutation.mutate(METRICAS_MODELO_DF);
  };

  const gerarDefesaConsolidada = async () => {
    try {
      const res = await getDefesaFn({
        data: {
          cliente_nome: "Cliente em Prospecção",
          campanha: "Planejamento Estratégico Integrado",
        },
      });
      setTextoDefesaGerado(res.textoDefesa);
      setModalDefesaAberto(true);
    } catch (e: any) {
      toast.error("Erro ao gerar defesa: " + e.message);
    }
  };

  const filtrados = metricas.filter(
    (m) =>
      m.parceiro_nome.toLowerCase().includes(busca.toLowerCase()) ||
      m.tipo_midia.toLowerCase().includes(busca.toLowerCase()) ||
      m.veiculo_programa.toLowerCase().includes(busca.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      {/* Topo com Ações de Importação e Gestão */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 via-background to-transparent">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                <BarChart3 className="size-3.5" />
                Métricas & Defesa de Veiculação
              </div>
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                Números Oficiais dos Veículos & Parceiros de Mídia
              </h2>
              <p className="text-xs text-muted-foreground max-w-3xl">
                Cadastre ou importe os números de audiência, alcance, fluxo diário e dados de IBOPE de cada veículo parceiro.
                Esses dados são utilizados automaticamente pela Inteligência Artificial na criação de <strong>defesas de veiculação irrefutáveis</strong> para convencer os decisores de compra.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={gerarDefesaConsolidada}
                className="text-xs gap-1.5"
              >
                <FileText className="size-3.5" />
                Ver Defesa de Mídia
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setModalImportarAberto(true)}
                className="text-xs gap-1.5 bg-background"
              >
                <Upload className="size-3.5" />
                Importar Planilha / CSV
              </Button>

              <Button size="sm" onClick={abrirNovo} className="text-xs gap-1.5 font-semibold">
                <Plus className="size-3.5" />
                Nova Métrica
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Barra de Filtro e Atalhos */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="w-full sm:w-80">
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por parceiro, tipo de mídia ou programa..."
            className="text-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={baixarTemplateCsv}
            className="text-xs text-muted-foreground gap-1"
          >
            <Download className="size-3.5" />
            Baixar Modelo CSV
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={carregarDadosPadraoDF}
            className="text-xs text-primary gap-1"
          >
            <Sparkles className="size-3.5" />
            Recarregar Números Modelo DF
          </Button>
        </div>
      </div>

      {/* Grid de Cards dos Parceiros */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtrados.map((item, idx) => (
          <Card key={item.id || idx} className="hover:border-primary/50 transition-all shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-[10px] font-mono">
                  {item.tipo_midia}
                </Badge>
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7 text-primary hover:bg-primary/10"
                    onClick={() => {
                      setAnexoAlvo({
                        id: item.id || item.parceiro_nome,
                        nome: `${item.parceiro_nome} (${item.tipo_midia})`,
                      });
                      setModalAnexoAberto(true);
                    }}
                    title="Anexar documento / Mídia Kit"
                  >
                    <Paperclip className="size-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7"
                    onClick={() => abrirEdicao(item)}
                    title="Editar métrica"
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                </div>
              </div>
              <CardTitle className="text-base font-bold text-foreground mt-1">
                {item.parceiro_nome}
              </CardTitle>
              <CardDescription className="text-xs font-medium text-primary">
                {item.veiculo_programa} ({item.praca})
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              {/* Números Chave */}
              <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-muted/40 border text-center">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase block">Alcance / Mês</span>
                  <span className="font-bold text-foreground text-xs">{item.alcance_estimado || "—"}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase block">Impactos / Fluxo</span>
                  <span className="font-bold text-indigo-600 text-xs">
                    {item.impactos_mes || item.fluxo_diario || "—"}
                  </span>
                </div>
              </div>

              {/* Perfil & Fonte */}
              <div className="space-y-1 text-[11px] text-muted-foreground">
                <div>
                  <strong className="text-foreground">Público: </strong>
                  {item.perfil_publico}
                </div>
                <div>
                  <strong className="text-foreground">Fonte Auditada: </strong>
                  {item.fonte_dados}
                </div>
              </div>

              {/* Defesa Técnica */}
              <div className="p-2.5 rounded bg-primary/5 border border-primary/20 text-[11px] text-muted-foreground leading-relaxed">
                <strong className="text-primary block font-semibold mb-0.5">Defesa de Veiculação:</strong>
                "{item.defesa_tecnica}"
              </div>

              {/* Destaques */}
              {item.destaques_comerciais?.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {item.destaques_comerciais.map((dest, dIdx) => (
                    <span
                      key={dIdx}
                      className="px-1.5 py-0.5 rounded bg-muted text-[10px] text-foreground font-medium"
                    >
                      ✓ {dest}
                    </span>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filtrados.length === 0 && !isLoading && (
        <Card className="p-12 text-center border-dashed">
          <p className="text-sm text-muted-foreground">Nenhuma métrica encontrada com o filtro informado.</p>
        </Card>
      )}

      {/* MODAL 1: CADASTRO / EDIÇÃO MANUAL */}
      <Dialog open={modalNovoAberto} onOpenChange={setModalNovoAberto}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editando ? "Editar Métrica do Parceiro" : "Nova Métrica de Parceiro / Mídia"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Insira os números oficiais e a defesa técnica deste canal para uso no planejamento.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-xs py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Nome do Parceiro / Veículo *</Label>
                <Input
                  value={form.parceiro_nome}
                  onChange={(e) => setForm({ ...form, parceiro_nome: e.target.value })}
                  placeholder="Ex: TV Brasília, Clube FM, Circuito DOOH..."
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Tipo de Mídia *</Label>
                <Input
                  value={form.tipo_midia}
                  onChange={(e) => setForm({ ...form, tipo_midia: e.target.value })}
                  placeholder="Ex: TV Aberta, Painéis de LED, Rádio FM..."
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Canal, Circuito ou Programa *</Label>
                <Input
                  value={form.veiculo_programa}
                  onChange={(e) => setForm({ ...form, veiculo_programa: e.target.value })}
                  placeholder="Ex: Grade Nobre, Eixo Monumental, 105.5 FM..."
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Praça de Cobertura</Label>
                <Input
                  value={form.praca}
                  onChange={(e) => setForm({ ...form, praca: e.target.value })}
                  placeholder="Ex: Brasília - DF e Entorno"
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs font-semibold">Alcance Estimado / Mês</Label>
                <Input
                  value={form.alcance_estimado}
                  onChange={(e) => setForm({ ...form, alcance_estimado: e.target.value })}
                  placeholder="Ex: 1.500.000 pessoas"
                  className="mt-1 font-mono"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Impactos Visuais / Mês</Label>
                <Input
                  value={form.impactos_mes}
                  onChange={(e) => setForm({ ...form, impactos_mes: e.target.value })}
                  placeholder="Ex: 4.800.000 impactos"
                  className="mt-1 font-mono"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Fluxo Diário / Veículos</Label>
                <Input
                  value={form.fluxo_diario}
                  onChange={(e) => setForm({ ...form, fluxo_diario: e.target.value })}
                  placeholder="Ex: 180.000 veículos/dia"
                  className="mt-1 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Perfil do Público</Label>
                <Input
                  value={form.perfil_publico}
                  onChange={(e) => setForm({ ...form, perfil_publico: e.target.value })}
                  placeholder="Ex: Classes A e B, 25 a 55 anos..."
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Fonte dos Dados Auditados</Label>
                <Input
                  value={form.fonte_dados}
                  onChange={(e) => setForm({ ...form, fonte_dados: e.target.value })}
                  placeholder="Ex: Kantar IBOPE Media / DER-DF"
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">Texto da Defesa Técnica de Veiculação *</Label>
              <Textarea
                rows={3}
                value={form.defesa_tecnica}
                onChange={(e) => setForm({ ...form, defesa_tecnica: e.target.value })}
                placeholder="Por que este veículo é indispensável para o plano do cliente? (Argumento técnico e de audiência)"
                className="mt-1 text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setModalNovoAberto(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              disabled={upsertMutation.isPending}
              onClick={() => {
                if (!form.parceiro_nome || !form.defesa_tecnica) {
                  toast.error("Preencha o nome do parceiro e a defesa técnica");
                  return;
                }
                upsertMutation.mutate(form);
              }}
            >
              Salvar Métrica
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: IMPORTAÇÃO VIA PLANILHA / CSV */}
      <Dialog open={modalImportarAberto} onOpenChange={setModalImportarAberto}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="size-5 text-primary" />
              Importar Números e Métricas de Mídia
            </DialogTitle>
            <DialogDescription className="text-xs">
              Copie as linhas da sua planilha Excel ou arquivo CSV e cole na área abaixo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="flex items-center justify-between">
              <Label className="font-semibold">Cole as colunas da planilha:</Label>
              <Button
                variant="link"
                size="sm"
                onClick={baixarTemplateCsv}
                className="h-auto p-0 text-xs text-primary"
              >
                Baixar planilha de exemplo
              </Button>
            </div>

            <Textarea
              rows={8}
              value={csvTexto}
              onChange={(e) => setCsvTexto(e.target.value)}
              placeholder={`Parceiro\tTipo Midia\tPrograma/Circuito\tPraca\tAlcance\tImpactos\tFluxo\tPublico\tFonte\tDefesa\nTV Brasília\tTV Aberta\tGrade Local\tDF\t1.680.000\t5.400.000\t320.000\tClasses B e C\tIBOPE\tTradição e audiência líder`}
              className="font-mono text-xs"
            />
            <p className="text-[11px] text-muted-foreground">
              Dica: Você pode selecionar as células no Excel (Ctrl+C) e colar diretamente aqui (Ctrl+V).
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setModalImportarAberto(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              disabled={importarMutation.isPending}
              onClick={processarCsvColado}
              className="bg-primary font-semibold"
            >
              Processar e Importar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: VISUALIZAÇÃO DA DEFESA DE VEICULAÇÃO CONSOLIDADA */}
      <Dialog open={modalDefesaAberto} onOpenChange={setModalDefesaAberto}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="size-5 text-emerald-600" />
              Defesa de Veiculação Consolidada para Apresentação
            </DialogTitle>
            <DialogDescription className="text-xs">
              Documento técnico pronto para envio ao anunciante ou anexo à proposta comercial.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <Textarea
              rows={16}
              value={textoDefesaGerado}
              readOnly
              className="font-mono text-xs bg-muted/30 leading-relaxed"
            />
          </div>

          <DialogFooter>
            <Button
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(textoDefesaGerado);
                toast.success("Defesa técnica copiada com sucesso!");
              }}
              className="gap-1.5"
            >
              <Copy className="size-3.5" />
              Copiar Defesa Completa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Universal de Anexos do Parceiro */}
      <UniversalAnexosModal
        isOpen={modalAnexoAberto}
        onClose={() => setModalAnexoAberto(false)}
        entidadeTipo="parceiro"
        entidadeId={anexoAlvo.id}
        entidadeNome={anexoAlvo.nome}
        tituloCustomizado={`Anexos & Mídia Kit — ${anexoAlvo.nome}`}
      />
    </div>
  );
}
