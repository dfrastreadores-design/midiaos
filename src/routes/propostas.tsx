import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Plus,
  Pencil,
  Trash2,
  ArrowRightCircle,
  Presentation,
  Eye,
  Settings,
  Copy,
  ThumbsDown,
  FileUp,
  Paperclip,
  Sliders,
  Compass,
  Calculator,
  Sparkles,
  Handshake,
  FileCheck2,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { Planejamento360Modal } from "@/components/planejamento360/Planejamento360Modal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PropostaFormDialog } from "@/components/PropostaFormDialog";
import { ImportarPropostaDialog } from "@/components/ImportarPropostaDialog";
import { ImportarModeloPropostaDialog } from "@/components/ImportarModeloPropostaDialog";
import { ConverterPropostaDialog } from "@/components/ConverterPropostaDialog";
import { GerarApresentacaoDialog } from "@/components/GerarApresentacaoDialog";
import { VisualizarPropostaDialog } from "@/components/VisualizarPropostaDialog";
import { LayoutManagerDialog } from "@/components/LayoutManagerDialog";
import { RecusarPropostaDialog } from "@/components/RecusarPropostaDialog";
import { SimuladorPropostaModal } from "@/components/simulador/SimuladorPropostaModal";
import { EspelhoPropostaModal } from "@/components/simulador/EspelhoPropostaModal";
import {
  listProposals,
  deleteProposal,
  convertProposalToPi,
} from "@/lib/simulador-propostas.functions";
import {
  PROPOSAL_STATUS_LABELS,
  Proposal,
} from "@/types/simulador-proposta.types";
import { formatBRL } from "@/lib/mock-data";
import { useUserRoles } from "@/hooks/use-roles";
import { usePropostas } from "@/hooks/use-propostas";
import { PROPOSTA_STATUS_CONFIG, formatCurrency } from "@/lib/services/proposta-utils";
import { Proposta } from "@/types/proposta";

export const Route = createFileRoute("/propostas")({
  head: () => ({ meta: [{ title: "Propostas — Mídia.OS" }] }),
  component: Propostas,
});

function Propostas() {
  const { isAdmin } = useUserRoles();
  const { propostas, isLoading, search, setSearch, deleteProposta } = usePropostas();

  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [modeloEmpresaOpen, setModeloEmpresaOpen] = useState(false);
  const [layoutOpen, setLayoutOpen] = useState(false);
  const [editing, setEditing] = useState<Proposta | null>(null);
  const [converting, setConverting] = useState<Proposta | null>(null);
  const [apresentando, setApresentando] = useState<Proposta | null>(null);
  const [visualizando, setVisualizando] = useState<Proposta | null>(null);
  const [recusando, setRecusando] = useState<Proposta | null>(null);
  const [planejamento360Open, setPlanejamento360Open] = useState(false);

  // Estados e Queries do Simulador de Propostas
  const qc = useQueryClient();
  const [mainTab, setMainTab] = useState<"formais" | "simulador">("formais");
  const [simuladorOpen, setSimuladorOpen] = useState(false);
  const [editingSimuladorId, setEditingSimuladorId] = useState<string | null>(null);
  const [espelhoProposalId, setEspelhoProposalId] = useState<string | null>(null);
  const [simuladorSearch, setSimuladorSearch] = useState("");

  const fetchSimulationsFn = useServerFn(listProposals);
  const deleteSimPropFn = useServerFn(deleteProposal);
  const convertSimToPiFn = useServerFn(convertProposalToPi);

  const { data: simulatedProposals = [], isLoading: isLoadingSimulations } = useQuery({
    queryKey: ["proposals"],
    queryFn: () => fetchSimulationsFn({ data: {} }),
  });

  const deleteSimMutation = useMutation({
    mutationFn: (id: string) => deleteSimPropFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["proposals"] });
      toast.success("Simulação de proposta removida");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const convertSimMutation = useMutation({
    mutationFn: (id: string) => convertSimToPiFn({ data: { proposal_id: id } }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["proposals"] });
      qc.invalidateQueries({ queryKey: ["pis"] });
      toast.success(`Pedido de Inserção gerado com sucesso! (${res.pi_numero})`);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const totalSimFaturado = simulatedProposals.reduce(
    (acc, p) => acc + (Number(p.total_gross) - Number(p.total_discount)),
    0,
  );
  const totalSimAgencia = simulatedProposals.reduce(
    (acc, p) => acc + Number(p.total_net_agency),
    0,
  );
  const totalSimVeiculos = simulatedProposals.reduce(
    (acc, p) => acc + Number(p.total_payout_partners),
    0,
  );

  const totalBruto = propostas.reduce((s, p) => s + Number(p.valor_tabela || 0), 0);
  const totalLiquido = propostas.reduce((s, p) => s + Number(p.valor_negociado || 0), 0);

  const handleAplicarPlano360Direto = (itens: any[], defesa: string) => {
    if (!itens || itens.length === 0) return;
    const novosItens = itens.map((it) => ({
      tipo: it.tipo || "DOOH",
      programa: it.nome,
      horario: "Rotativo",
      formato: it.formato,
      mes: new Date().getMonth() + 1,
      ano: new Date().getFullYear(),
      insercoes_dia: Math.max(1, Math.round((it.insercoes_mes || 30) / 30)),
      dias_semana: ["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"],
      dias_mes: Array.from({ length: 30 }, (_, i) => i + 1),
      desconto: it.desconto_pct || 0,
      valor_unit: it.valor_negociado / Math.max(1, it.insercoes_mes || 1),
      valor_tabela: it.valor_tabela || it.valor_negociado,
      valor_negociado: it.valor_negociado,
      total_insercoes: it.insercoes_mes || 30,
      produto_id: it.produto_id || null,
      parceiro_nome: it.parceiro_nome || null,
      latitude: it.latitude || null,
      longitude: it.longitude || null,
      link_maps: it.link_maps || null,
      sentido_via: it.sentido_via || null,
      ponto_referencia: it.ponto_referencia || null,
      endereco_ponto: it.localizacao || null,
      canal_macro: "OFF" as const,
    }));

    setEditing({
      id: "",
      numero: "",
      campanha: `Estratégia 360° — ${itens[0]?.regiao || "DF"}`,
      status: "rascunho",
      cliente_id: null,
      agencia_id: null,
      cliente_avulso: "Cliente Comercial em Reunião",
      validade: null,
      observacao: defesa,
      valor_tabela: itens.reduce((s, it) => s + (it.valor_tabela || 0), 0),
      valor_desconto: itens.reduce((s, it) => s + ((it.valor_tabela || it.valor_negociado) - it.valor_negociado), 0),
      valor_negociado: itens.reduce((s, it) => s + (it.valor_negociado || 0), 0),
      total_insercoes: itens.reduce((s, it) => s + (it.insercoes_mes || 30), 0),
      comissao_pct: 0,
      itens: novosItens,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any);

    setFormOpen(true);
  };

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-semibold tracking-tight">
            Propostas Comerciais
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Crie, envie e converta em PI com um clique.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            className="border-sky-500/50 bg-sky-500/10 text-sky-700 dark:text-sky-300 hover:bg-sky-500/20 font-semibold"
            onClick={() => setPlanejamento360Open(true)}
            title="Diagnóstico ao vivo na reunião, perfil de público do DF e radar de expansão regional"
          >
            <Compass className="size-4 mr-2 text-sky-600 dark:text-sky-400 animate-pulse" />
            Planejamento 360°
          </Button>
          <Button
            variant="outline"
            className="border-primary/40 text-primary hover:bg-primary/10"
            onClick={() => setModeloEmpresaOpen(true)}
            title="Importe a apresentação institucional em PDF/slides e mapeie a tabela de produtos e valores"
          >
            <Sliders className="size-4 mr-2" /> Modelo da Empresa
          </Button>
          {isAdmin && (
            <Button variant="outline" onClick={() => setLayoutOpen(true)}>
              <Settings className="size-4 mr-2" /> Layouts
            </Button>
          )}
          <Button
            variant="outline"
            className="border-primary/40 text-primary hover:bg-primary/10"
            onClick={() => setImportOpen(true)}
          >
            <FileUp className="size-4 mr-2" /> Importar PDF / PPTX
          </Button>

          <Button
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm"
            onClick={() => {
              setEditingSimuladorId(null);
              setSimuladorOpen(true);
            }}
            title="Simulador Multiveículos de Mídia com rateio de comissões e repasses aos parceiros"
          >
            <Calculator className="size-4" />
            Simulador de Propostas
          </Button>

          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="size-4 mr-2" /> Nova Proposta
          </Button>
        </div>
      </div>

      {/* Switcher de Visão: Propostas Formais vs Simulador */}
      <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as any)} className="space-y-4">
        <TabsList className="bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="formais" className="gap-2 text-xs">
            <span>📋 Propostas Formais ({propostas.length})</span>
          </TabsTrigger>
          <TabsTrigger value="simulador" className="gap-2 text-xs">
            <Calculator className="w-3.5 h-3.5 text-primary" />
            <span>⚡ Simulador & Pacotes Multiveículos ({simulatedProposals.length})</span>
            <Badge variant="secondary" className="text-[10px] px-1 py-0 bg-primary/10 text-primary">
              Comissões
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="formais" className="space-y-4 mt-0">

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Total de Propostas</div>
            <div className="text-2xl font-semibold mt-1">{propostas.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Valor Bruto</div>
            <div className="text-2xl font-semibold mt-1">{formatCurrency(totalBruto)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Valor Líquido</div>
            <div className="text-2xl font-semibold mt-1 text-primary">
              {formatCurrency(totalLiquido)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="p-4 border-b">
            <Input
              placeholder="Buscar…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-md"
            />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nº</TableHead>
                <TableHead>Cliente / Campanha</TableHead>
                <TableHead>Criado por</TableHead>
                <TableHead className="text-right">Inserções</TableHead>
                <TableHead className="text-right">Valor Bruto</TableHead>
                <TableHead className="text-right">Valor Líquido</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Carregando…
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && propostas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Nenhuma proposta encontrada.
                  </TableCell>
                </TableRow>
              )}
              {propostas.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs">{p.numero}</TableCell>
                  <TableCell>
                    <div className="font-medium">
                      {p.cliente?.nome_fantasia ||
                        p.cliente?.razao_social ||
                        p.agencia?.nome_fantasia ||
                        p.agencia?.razao_social ||
                        p.cliente_avulso ||
                        "—"}
                    </div>
                    <div className="text-xs text-muted-foreground">{p.campanha}</div>
                  </TableCell>
                  <TableCell className="text-sm">{p.criado_por || "—"}</TableCell>
                  <TableCell className="text-right text-sm">{p.total_insercoes}</TableCell>
                  <TableCell className="text-right text-sm">
                    {formatCurrency(p.valor_tabela)}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(p.valor_negociado)}
                  </TableCell>

                  <TableCell>
                    <Badge className={PROPOSTA_STATUS_CONFIG[p.status]?.className}>
                      {p.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-end">
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Visualizar"
                        onClick={() => setVisualizando(p)}
                      >
                        <Eye className="size-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Editar"
                        onClick={() => {
                          setEditing(p);
                          setFormOpen(true);
                        }}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Duplicar para outro cliente"
                        onClick={() => {
                          setEditing({ ...p, isCopy: true } as any);
                          setFormOpen(true);
                        }}
                      >
                        <Copy className="size-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Gerar Apresentação"
                        onClick={() => setApresentando(p)}
                      >
                        <Presentation className="size-4 text-primary" />
                      </Button>
                      {p.status !== "convertida" && (
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Converter em PI"
                          onClick={() => setConverting(p)}
                        >
                          <ArrowRightCircle className="size-4 text-primary" />
                        </Button>
                      )}
                      {p.status !== "convertida" && p.status !== "recusada" && (
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Cliente não tem interesse"
                          onClick={() => setRecusando(p)}
                        >
                          <ThumbsDown className="size-4 text-destructive" />
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Excluir"
                        onClick={() => deleteProposta(p.id)}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && propostas.length > 0 && (
                <TableRow className="bg-muted/40 font-semibold">
                  <TableCell colSpan={4} className="text-right">
                    Totais
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(totalBruto)}</TableCell>
                  <TableCell className="text-right text-primary">
                    {formatCurrency(totalLiquido)}
                  </TableCell>
                  <TableCell colSpan={2} />
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      </TabsContent>

      {/* ABA: SIMULADOR & PACOTES MULTIVEÍCULOS */}
      <TabsContent value="simulador" className="space-y-4 mt-0">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground uppercase font-medium">
                Total de Simulações
              </div>
              <div className="text-2xl font-bold mt-1 text-foreground">
                {simulatedProposals.length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground uppercase font-medium">
                Faturamento Total Cliente
              </div>
              <div className="text-2xl font-bold mt-1 text-foreground">
                {formatBRL(totalSimFaturado)}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-900/50">
            <CardContent className="p-4">
              <div className="text-xs text-emerald-700 dark:text-emerald-400 uppercase font-medium">
                Receita da Agência (Comissões)
              </div>
              <div className="text-2xl font-bold mt-1 text-emerald-700 dark:text-emerald-300">
                {formatBRL(totalSimAgencia)}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-purple-50/40 dark:bg-purple-950/20 border-purple-200/60 dark:border-purple-900/50">
            <CardContent className="p-4">
              <div className="text-xs text-purple-700 dark:text-purple-400 uppercase font-medium">
                Repasses a Veículos
              </div>
              <div className="text-2xl font-bold mt-1 text-purple-700 dark:text-purple-300">
                {formatBRL(totalSimVeiculos)}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="p-4 border-b flex items-center justify-between gap-3">
              <Input
                placeholder="Buscar simulação por cliente ou campanha..."
                value={simuladorSearch}
                onChange={(e) => setSimuladorSearch(e.target.value)}
                className="max-w-md text-xs"
              />
              <Button
                size="sm"
                onClick={() => {
                  setEditingSimuladorId(null);
                  setSimuladorOpen(true);
                }}
                className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Plus className="w-3.5 h-3.5" />
                Nova Simulação de Pacote
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="text-xs bg-muted/30">
                  <TableHead>Cliente / Anunciante</TableHead>
                  <TableHead>Campanha</TableHead>
                  <TableHead className="text-center">Espaços</TableHead>
                  <TableHead className="text-right">Faturado Cliente</TableHead>
                  <TableHead className="text-right">Receita Agência</TableHead>
                  <TableHead className="text-right">Repasse Veículos</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center w-[140px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingSimulations ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10 text-muted-foreground text-xs">
                      Carregando propostas simuladas...
                    </TableCell>
                  </TableRow>
                ) : simulatedProposals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground text-xs">
                      Nenhuma simulação multiveículos salva ainda.
                    </TableCell>
                  </TableRow>
                ) : (
                  simulatedProposals
                    .filter((p) => {
                      if (!simuladorSearch) return true;
                      const q = simuladorSearch.toLowerCase();
                      return (
                        p.client_name.toLowerCase().includes(q) ||
                        (p.campaign_title && p.campaign_title.toLowerCase().includes(q))
                      );
                    })
                    .map((p) => {
                      const netClient = Number(p.total_gross) - Number(p.total_discount);
                      const st = PROPOSAL_STATUS_LABELS[p.status] || PROPOSAL_STATUS_LABELS.draft;
                      return (
                        <TableRow key={p.id} className="text-xs hover:bg-muted/30">
                          <TableCell className="font-semibold text-foreground">
                            {p.client_name}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {p.campaign_title || "—"}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="text-[10px]">
                              {p.items_count} espaço(s)
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-bold text-foreground">
                            {formatBRL(netClient)}
                          </TableCell>
                          <TableCell className="text-right font-bold text-emerald-700 dark:text-emerald-400">
                            {formatBRL(p.total_net_agency)}
                            <span className="text-[10px] text-muted-foreground block font-normal">
                              ({p.profit_margin_percent}%)
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-semibold text-purple-700 dark:text-purple-300">
                            {formatBRL(p.total_payout_partners)}
                          </TableCell>
                          <TableCell>
                            <Badge className={st.bgBadge}>{st.label}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-primary hover:bg-primary/10"
                                onClick={() => {
                                  setEditingSimuladorId(p.id);
                                  setSimuladorOpen(true);
                                }}
                                title="Editar Simulação"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 hover:bg-muted"
                                onClick={() => setEspelhoProposalId(p.id)}
                                title="Ver Espelho da Proposta"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </Button>
                              {p.status !== "converted_to_pi" && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                                  onClick={() => convertSimMutation.mutate(p.id)}
                                  disabled={convertSimMutation.isPending}
                                  title="Gerar Pedido de Inserção (PI)"
                                >
                                  <FileCheck2 className="w-3.5 h-3.5" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:bg-destructive/10"
                                onClick={() => deleteSimMutation.mutate(p.id)}
                                disabled={deleteSimMutation.isPending}
                                title="Excluir Simulação"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>
      </Tabs>

      {formOpen && (
        <PropostaFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          initial={
            editing
              ? {
                  id: editing.id,
                  isCopy: editing.isCopy,
                  cliente_id: editing.cliente_id,
                  agencia_id: editing.agencia_id,
                  executivo_id: editing.executivo_id,
                  cliente_avulso: editing.cliente_avulso,
                  campanha: editing.campanha,
                  validade: editing.validade,
                  observacao: editing.observacao,
                }
              : undefined
          }
          onOpenImport={() => setImportOpen(true)}
        />
      )}

      <ImportarPropostaDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onSuccess={(id) => {
          setVisualizando({ id } as any);
        }}
      />

      <GerarApresentacaoDialog
        open={!!apresentando}
        onOpenChange={(v) => !v && setApresentando(null)}
        propostaId={apresentando?.id ?? null}
      />

      <ConverterPropostaDialog
        propostaId={converting?.id ?? null}
        numero={converting?.numero ?? ""}
        open={!!converting}
        onOpenChange={(v) => !v && setConverting(null)}
      />

      <VisualizarPropostaDialog
        open={!!visualizando}
        onOpenChange={(v) => !v && setVisualizando(null)}
        propostaId={visualizando?.id ?? null}
      />

      <RecusarPropostaDialog
        open={!!recusando}
        onOpenChange={(v) => !v && setRecusando(null)}
        propostaId={recusando?.id ?? null}
        numero={recusando?.numero}
      />

      <LayoutManagerDialog open={layoutOpen} onOpenChange={setLayoutOpen} />

      <ImportarModeloPropostaDialog open={modeloEmpresaOpen} onOpenChange={setModeloEmpresaOpen} />

      <Planejamento360Modal
        open={planejamento360Open}
        onOpenChange={setPlanejamento360Open}
        onAplicarAoPlano={handleAplicarPlano360Direto}
      />

      {/* Modais do Simulador de Propostas */}
      <SimuladorPropostaModal
        open={simuladorOpen}
        onOpenChange={setSimuladorOpen}
        proposalId={editingSimuladorId}
        onSuccess={() => qc.invalidateQueries({ queryKey: ["proposals"] })}
      />

      <EspelhoPropostaModal
        open={!!espelhoProposalId}
        onOpenChange={(op) => !op && setEspelhoProposalId(null)}
        proposalId={espelhoProposalId}
      />
    </AppShell>
  );
}
