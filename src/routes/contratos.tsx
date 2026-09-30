import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileSignature,
  Plus,
  Search,
  Download,
  Eye,
  Pencil,
  Trash2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Building2,
  Handshake,
  Users,
  FileText,
  Copy,
  Sparkles,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import {
  listContratos,
  listContratoModelos,
  upsertContrato,
  upsertContratoModelo,
  deleteContrato,
  preencherVariaveisContrato,
  VARIAVEIS_CONTRATO,
  type Contrato,
  type ContratoModelo,
} from "@/lib/contratos.functions";
import { gerarPdfContrato } from "@/lib/contratos-pdf";
import { useTenantBranding } from "@/hooks/use-tenant-branding";
import { listClientes } from "@/lib/clientes.functions";
import { listAgencias } from "@/lib/agencias.functions";
import { listParceiros } from "@/lib/parceiros.functions";
import { listPis } from "@/lib/pi.functions";

export const Route = createFileRoute("/contratos")({
  head: () => ({ meta: [{ title: "Contratos & Modelos — Mídia.OS" }] }),
  component: ContratosPage,
});

function formatBRL(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
}

export function ContratosPage() {
  const qc = useQueryClient();
  const { nome: empresaNome, logoSrc } = useTenantBranding();

  const listContratosFn = useServerFn(listContratos);
  const listModelosFn = useServerFn(listContratoModelos);
  const upsertContratoFn = useServerFn(upsertContrato);
  const upsertModeloFn = useServerFn(upsertContratoModelo);
  const deleteContratoFn = useServerFn(deleteContrato);

  const listClientesFn = useServerFn(listClientes);
  const listAgenciasFn = useServerFn(listAgencias);
  const listParceirosFn = useServerFn(listParceiros);
  const listPisFn = useServerFn(listPis);

  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"contratos" | "modelos">("contratos");
  const [statusFiltro, setStatusFiltro] = useState<string>("todos");

  // Modais de Contrato
  const [modalContratoOpen, setModalContratoOpen] = useState(false);
  const [viewContrato, setViewContrato] = useState<Contrato | null>(null);

  // Form State Contrato
  const [formData, setFormData] = useState<{
    id?: string;
    numero?: string;
    tipo: string;
    titulo: string;
    modelo_id?: string;
    cliente_id?: string;
    agencia_id?: string;
    parceiro_id?: string;
    pi_id?: string;
    valor: number;
    comissao_pct: number;
    comissao_valor: number;
    repasse_valor: number;
    data_inicio: string;
    data_fim: string;
    status: Contrato["status"];
    conteudo_gerado: string;
    observacoes: string;
  }>({
    tipo: "cliente",
    titulo: "",
    valor: 0,
    comissao_pct: 0,
    comissao_valor: 0,
    repasse_valor: 0,
    data_inicio: "",
    data_fim: "",
    status: "rascunho",
    conteudo_gerado: "",
    observacoes: "",
  });

  // Modal de Modelo
  const [modalModeloOpen, setModalModeloOpen] = useState(false);
  const [modeloForm, setModeloForm] = useState<{
    id?: string;
    titulo: string;
    tipo: ContratoModelo["tipo"];
    conteudo: string;
  }>({
    titulo: "",
    tipo: "cliente",
    conteudo: "",
  });

  // Queries
  const { data: contratos = [], isLoading: loadingContratos } = useQuery({
    queryKey: ["contratos"],
    queryFn: () => listContratosFn(),
  });

  const { data: modelos = [], isLoading: loadingModelos } = useQuery({
    queryKey: ["contrato-modelos"],
    queryFn: () => listModelosFn(),
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ["clientes-select"],
    queryFn: () => listClientesFn(),
  });

  const { data: agencias = [] } = useQuery({
    queryKey: ["agencias-select"],
    queryFn: () => listAgenciasFn(),
  });

  const { data: parceiros = [] } = useQuery({
    queryKey: ["parceiros-select"],
    queryFn: () => listParceirosFn(),
  });

  const { data: pis = [] } = useQuery({
    queryKey: ["pis-select"],
    queryFn: () => listPisFn(),
  });

  // Filtros
  const contratosFiltrados = useMemo(() => {
    return contratos.filter((c) => {
      const matchSearch =
        c.numero.toLowerCase().includes(search.toLowerCase()) ||
        c.titulo.toLowerCase().includes(search.toLowerCase()) ||
        c.cliente?.razao_social?.toLowerCase().includes(search.toLowerCase()) ||
        c.parceiro?.razao_social?.toLowerCase().includes(search.toLowerCase());

      const matchStatus = statusFiltro === "todos" || c.status === statusFiltro;
      return matchSearch && matchStatus;
    });
  }, [contratos, search, statusFiltro]);

  // Handler para pré-preenchimento ao selecionar Modelo
  function handleSelectModelo(modeloId: string) {
    const mod = modelos.find((m) => m.id === modeloId);
    if (!mod) return;

    const cli = clientes.find((c: any) => c.id === formData.cliente_id);
    const age = agencias.find((a: any) => a.id === formData.agencia_id);
    const parc = parceiros.find((p: any) => p.id === formData.parceiro_id);
    const pi = pis.find((p: any) => p.id === formData.pi_id);

    const dadosSubstituicao: Record<string, string | number> = {
      NOME_EMPRESA: empresaNome || "Mídia OS",
      CNPJ_EMPRESA: "Consulte Dados Cadastrais",
      CLIENTE: cli ? (cli as any).razao_social || (cli as any).nome_fantasia : "Cliente",
      CNPJ_CLIENTE: cli ? (cli as any).cnpj || "—" : "—",
      AGENCIA: age ? (age as any).razao_social || (age as any).nome_fantasia : "Venda Direta",
      CNPJ_AGENCIA: age ? (age as any).cnpj || "—" : "—",
      PARCEIRO: parc ? (parc as any).razao_social || (parc as any).nome_fantasia : "Veículo",
      CNPJ_PARCEIRO: parc ? (parc as any).cnpj || "—" : "—",
      CAMPANHA: pi ? (pi as any).campanha : "Campanha de Mídia",
      VALOR: formatBRL(formData.valor),
      COMISSAO: `${formData.comissao_pct}% (${formatBRL(formData.comissao_valor)})`,
      REPASSE: formatBRL(formData.repasse_valor),
      DATA_INICIO: formData.data_inicio || new Date().toLocaleDateString("pt-BR"),
      DATA_FIM: formData.data_fim || "A definir",
      RESPONSAVEL: "Diretoria Comercial",
    };

    const textoGerado = preencherVariaveisContrato(mod.conteudo, dadosSubstituicao);
    setFormData((f) => ({
      ...f,
      modelo_id: modeloId,
      titulo: f.titulo || mod.titulo,
      conteudo_gerado: textoGerado,
    }));
  }

  // Mutações
  const saveContratoMut = useMutation({
    mutationFn: (data: any) => upsertContratoFn({ data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contratos"] });
      toast.success("Contrato salvo com sucesso!");
      setModalContratoOpen(false);
    },
    onError: (err: any) => toast.error(err.message || "Erro ao salvar contrato"),
  });

  const saveModeloMut = useMutation({
    mutationFn: (data: any) => upsertModeloFn({ data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contrato-modelos"] });
      toast.success("Modelo de contrato salvo com sucesso!");
      setModalModeloOpen(false);
    },
    onError: (err: any) => toast.error(err.message || "Erro ao salvar modelo"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteContratoFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contratos"] });
      toast.success("Contrato removido!");
    },
  });

  return (
    <AppShell>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Cabeçalho */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <FileSignature className="size-6 text-primary" />
              <h1 className="text-2xl font-bold tracking-tight">Contratos & Instrumentos Jurídicos</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Gestão de contratos com anunciantes, agências e veículos com variáveis dinâmicas e modelos editáveis.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {tab === "contratos" ? (
              <Button
                onClick={() => {
                  setFormData({
                    tipo: "cliente",
                    titulo: "",
                    valor: 0,
                    comissao_pct: 0,
                    comissao_valor: 0,
                    repasse_valor: 0,
                    data_inicio: new Date().toISOString().split("T")[0],
                    data_fim: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
                    status: "rascunho",
                    conteudo_gerado: "",
                    observacoes: "",
                  });
                  setModalContratoOpen(true);
                }}
                className="gap-2"
              >
                <Plus className="size-4" />
                Novo Contrato
              </Button>
            ) : (
              <Button
                onClick={() => {
                  setModeloForm({ titulo: "", tipo: "cliente", conteudo: "" });
                  setModalModeloOpen(true);
                }}
                className="gap-2"
              >
                <Plus className="size-4" />
                Novo Modelo
              </Button>
            )}
          </div>
        </div>

        {/* Alerta de Revisão Jurídica */}
        <div className="p-3.5 rounded-lg border border-amber-500/30 bg-amber-500/10 flex items-start gap-3">
          <ShieldAlert className="size-5 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-900 dark:text-amber-200">
            <strong>Aviso de Conformidade Jurídica:</strong> Os modelos disponibilizados são minutas comerciais.
            Recomendamos que cada contrato seja revisado pelo departamento jurídico da sua empresa antes da assinatura definitiva.
          </p>
        </div>

        {/* Abas */}
        <Tabs value={tab} onValueChange={(v: any) => setTab(v)}>
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="contratos">Contratos Emitidos ({contratos.length})</TabsTrigger>
            <TabsTrigger value="modelos">Modelos de Minutas ({modelos.length})</TabsTrigger>
          </TabsList>

          {/* ABA CONTRATOS */}
          <TabsContent value="contratos" className="space-y-4 pt-2">
            {/* Filtros */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative w-full sm:w-80">
                <Search className="size-4 absolute left-3 top-3 text-muted-foreground" />
                <Input
                  placeholder="Buscar contrato, cliente ou parceiro..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="flex gap-2 w-full sm:w-auto">
                <Select value={statusFiltro} onValueChange={setStatusFiltro}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os Status</SelectItem>
                    <SelectItem value="rascunho">Rascunho</SelectItem>
                    <SelectItem value="em_aprovacao">Em Aprovação</SelectItem>
                    <SelectItem value="aguardando_assinatura">Aguardando Assinatura</SelectItem>
                    <SelectItem value="assinado">Assinado</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Tabela de Contratos */}
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Número / Título</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Cliente / Parceiro</TableHead>
                      <TableHead>Valor Total</TableHead>
                      <TableHead>Comissão / Repasse</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contratosFiltrados.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          Nenhum contrato encontrado.
                        </TableCell>
                      </TableRow>
                    ) : (
                      contratosFiltrados.map((c) => {
                        const statusColors: Record<string, string> = {
                          assinado: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
                          aguardando_assinatura: "bg-amber-500/10 text-amber-600 border-amber-500/20",
                          em_aprovacao: "bg-blue-500/10 text-blue-600 border-blue-500/20",
                          rascunho: "bg-slate-500/10 text-slate-600 border-slate-500/20",
                          cancelado: "bg-rose-500/10 text-rose-600 border-rose-500/20",
                        };

                        return (
                          <TableRow key={c.id}>
                            <TableCell>
                              <div className="font-semibold text-sm">{c.numero}</div>
                              <div className="text-xs text-muted-foreground line-clamp-1">{c.titulo}</div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize text-xs">
                                {c.tipo}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm font-medium">
                                {c.cliente?.razao_social || c.parceiro?.razao_social || "—"}
                              </div>
                              {c.agencia && (
                                <div className="text-xs text-muted-foreground">
                                  Agência: {c.agencia.razao_social}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="font-semibold text-sm">
                              {formatBRL(c.valor)}
                            </TableCell>
                            <TableCell>
                              <div className="text-xs text-emerald-600 font-medium">
                                Com: {formatBRL(c.comissao_valor)} ({c.comissao_pct}%)
                              </div>
                              <div className="text-xs text-slate-500">
                                Rep: {formatBRL(c.repasse_valor)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={statusColors[c.status] || ""}>
                                {c.status.replace("_", " ").toUpperCase()}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right space-x-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setViewContrato(c)}
                                title="Visualizar Contrato"
                              >
                                <Eye className="size-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => gerarPdfContrato(c, { nome: empresaNome })}
                                title="Baixar PDF do Contrato"
                              >
                                <Download className="size-4 text-primary" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  if (confirm("Deseja realmente excluir este contrato?")) {
                                    deleteMut.mutate(c.id);
                                  }
                                }}
                                title="Excluir"
                              >
                                <Trash2 className="size-4 text-destructive" />
                              </Button>
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

          {/* ABA MODELOS DE CONTRATOS */}
          <TabsContent value="modelos" className="space-y-4 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {modelos.map((m) => (
                <Card key={m.id} className="flex flex-col justify-between">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="capitalize text-xs">
                        Modelo: {m.tipo}
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setModeloForm({
                            id: m.id,
                            titulo: m.titulo,
                            tipo: m.tipo,
                            conteudo: m.conteudo,
                          });
                          setModalModeloOpen(true);
                        }}
                      >
                        <Pencil className="size-4 mr-1" />
                        Editar
                      </Button>
                    </div>
                    <CardTitle className="text-base">{m.titulo}</CardTitle>
                    <CardDescription className="line-clamp-3 text-xs font-mono bg-muted/40 p-2 rounded">
                      {m.conteudo.slice(0, 200)}…
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="text-xs text-muted-foreground flex flex-wrap gap-1">
                      {VARIAVEIS_CONTRATO.slice(0, 6).map((v) => (
                        <span key={v.key} className="bg-muted px-1.5 py-0.5 rounded">
                          {`{{${v.key}}}`}
                        </span>
                      ))}
                      <span>+ mais variáveis</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* DIALOG: NOVO / EDITAR CONTRATO */}
        <Dialog open={modalContratoOpen} onOpenChange={setModalContratoOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Elaborar Contrato Comercial</DialogTitle>
              <DialogDescription>
                Selecione o modelo e as partes para gerar o instrumento com dados integrados.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
              <div className="space-y-2">
                <Label>Modelo de Contrato</Label>
                <Select
                  value={formData.modelo_id}
                  onValueChange={(v) => handleSelectModelo(v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um modelo base..." />
                  </SelectTrigger>
                  <SelectContent>
                    {modelos.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.titulo} ({m.tipo})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Título do Contrato</Label>
                <Input
                  value={formData.titulo}
                  onChange={(e) => setFormData((f) => ({ ...f, titulo: e.target.value }))}
                  placeholder="Ex: Contrato de Veiculação — Cliente X"
                />
              </div>

              <div className="space-y-2">
                <Label>Cliente / Anunciante</Label>
                <Select
                  value={formData.cliente_id}
                  onValueChange={(v) => setFormData((f) => ({ ...f, cliente_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o cliente..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clientes.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.razao_social || c.nome_fantasia}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Veículo / Parceiro de Mídia (Quando aplicável)</Label>
                <Select
                  value={formData.parceiro_id}
                  onValueChange={(v) => setFormData((f) => ({ ...f, parceiro_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o parceiro..." />
                  </SelectTrigger>
                  <SelectContent>
                    {parceiros.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nome_fantasia || p.razao_social}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Valor Comercializado (R$)</Label>
                <Input
                  type="number"
                  value={formData.valor || ""}
                  onChange={(e) => {
                    const v = Number(e.target.value) || 0;
                    const cVal = v * (formData.comissao_pct / 100);
                    setFormData((f) => ({
                      ...f,
                      valor: v,
                      comissao_valor: cVal,
                      repasse_valor: v - cVal,
                    }));
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label>Comissão (%)</Label>
                <Input
                  type="number"
                  value={formData.comissao_pct || ""}
                  onChange={(e) => {
                    const pct = Number(e.target.value) || 0;
                    const cVal = formData.valor * (pct / 100);
                    setFormData((f) => ({
                      ...f,
                      comissao_pct: pct,
                      comissao_valor: cVal,
                      repasse_valor: formData.valor - cVal,
                    }));
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label>Data Início</Label>
                <Input
                  type="date"
                  value={formData.data_inicio}
                  onChange={(e) => setFormData((f) => ({ ...f, data_inicio: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Data Término</Label>
                <Input
                  type="date"
                  value={formData.data_fim}
                  onChange={(e) => setFormData((f) => ({ ...f, data_fim: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Texto Integral do Contrato (Variáveis preenchidas)</Label>
              <Textarea
                rows={10}
                className="font-mono text-xs"
                value={formData.conteudo_gerado}
                onChange={(e) => setFormData((f) => ({ ...f, conteudo_gerado: e.target.value }))}
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setModalContratoOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => saveContratoMut.mutate(formData)}
                disabled={saveContratoMut.isPending || !formData.titulo}
              >
                Salvar Contrato
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* DIALOG: MODELO DE CONTRATO */}
        <Dialog open={modalModeloOpen} onOpenChange={setModalModeloOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editor de Modelo de Minuta</DialogTitle>
              <DialogDescription>
                Crie um modelo padrão. Utilize as tags {"{{VARIAVEL}}"} para substituição automática.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <div className="space-y-2">
                <Label>Título do Modelo</Label>
                <Input
                  value={modeloForm.titulo}
                  onChange={(e) => setModeloForm((f) => ({ ...f, titulo: e.target.value }))}
                  placeholder="Ex: Contrato Padrão Anunciante Mídia"
                />
              </div>

              <div className="space-y-2">
                <Label>Tipo de Instrumento</Label>
                <Select
                  value={modeloForm.tipo}
                  onValueChange={(v: any) => setModeloForm((f) => ({ ...f, tipo: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cliente">Cliente / Anunciante</SelectItem>
                    <SelectItem value="parceiro">Veículo / Parceiro</SelectItem>
                    <SelectItem value="agencia">Agência de Publicidade</SelectItem>
                    <SelectItem value="prestacao_servicos">Prestação de Serviços</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Variáveis Disponíveis (Clique para copiar):</Label>
                <div className="flex flex-wrap gap-1.5 p-2 bg-muted/40 rounded border">
                  {VARIAVEIS_CONTRATO.map((v) => (
                    <button
                      key={v.key}
                      type="button"
                      onClick={() => {
                        setModeloForm((f) => ({
                          ...f,
                          conteudo: f.conteudo + ` {{${v.key}}}`,
                        }));
                        toast.info(`Variável {{${v.key}}} inserida no texto.`);
                      }}
                      className="text-xs font-mono bg-background hover:bg-primary hover:text-primary-foreground border px-1.5 py-0.5 rounded transition"
                      title={v.label}
                    >
                      {`{{${v.key}}}`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Texto do Contrato</Label>
                <Textarea
                  rows={12}
                  className="font-mono text-xs"
                  value={modeloForm.conteudo}
                  onChange={(e) => setModeloForm((f) => ({ ...f, conteudo: e.target.value }))}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setModalModeloOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => saveModeloMut.mutate(modeloForm)}
                disabled={saveModeloMut.isPending || !modeloForm.titulo || !modeloForm.conteudo}
              >
                Salvar Modelo
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* DIALOG: VISUALIZAR CONTRATO */}
        {viewContrato && (
          <Dialog open={!!viewContrato} onOpenChange={() => setViewContrato(null)}>
            <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <Badge variant="outline">{viewContrato.numero}</Badge>
                  <Button
                    size="sm"
                    onClick={() => gerarPdfContrato(viewContrato, { nome: empresaNome })}
                    className="gap-1.5"
                  >
                    <Download className="size-4" />
                    Exportar PDF
                  </Button>
                </div>
                <DialogTitle>{viewContrato.titulo}</DialogTitle>
                <DialogDescription>
                  Valor Total: {formatBRL(viewContrato.valor)} | Comissão: {formatBRL(viewContrato.comissao_valor)} | Repasse: {formatBRL(viewContrato.repasse_valor)}
                </DialogDescription>
              </DialogHeader>

              <div className="p-4 bg-muted/30 rounded border font-mono text-xs whitespace-pre-wrap leading-relaxed">
                {viewContrato.conteudo_gerado || viewContrato.observacoes || "Sem conteúdo textual registrado."}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setViewContrato(null)}>
                  Fechar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </AppShell>
  );
}
