import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Handshake,
  Plus,
  Upload,
  Search,
  Building2,
  Percent,
  Phone,
  Mail,
  MapPin,
  MoreVertical,
  Pencil,
  Trash2,
  ExternalLink,
  Layers,
  DollarSign,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  Tv,
  MessageSquare,
  Download,
  Paperclip,
  Sparkles,
  Globe,
  Instagram,
  Linkedin,
  Facebook,
  LayoutGrid,
  Table as TableIcon,
} from "lucide-react";
import { toast } from "sonner";
import { LogoImg } from "@/components/LogoImg";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UniversalAnexosModal } from "@/components/anexos/UniversalAnexosModal";
import {
  listParceiros,
  deleteParceiro,
  SEGMENTOS_MIDIA,
  type Parceiro,
} from "@/lib/parceiros.functions";
import { ParceiroFormDialog } from "@/components/ParceiroFormDialog";
import { ImportarProdutosDialog } from "@/components/ImportarProdutosDialog";
import { ImportarMidiaKitDialog } from "@/components/ImportarMidiaKitDialog";
import { useUserRoles } from "@/hooks/use-roles";
import { downloadModeloProdutosExcel } from "@/lib/exportar-modelo-produtos";

export const Route = createFileRoute("/parceiros")({
  head: () => ({ meta: [{ title: "Parceiros de Mídia — Mídia.OS" }] }),
  component: ParceirosPage,
});

export function ParceirosPage() {
  const qc = useQueryClient();
  const { isAdmin, can, hasPermission } = useUserRoles();
  const canManage = isAdmin || can("/produtos") || hasPermission("module.produtos");

  const listFn = useServerFn(listParceiros);
  const deleteFn = useServerFn(deleteParceiro);

  const [search, setSearch] = useState("");
  const [segmentoFiltro, setSegmentoFiltro] = useState<string>("todos");
  const [statusFiltro, setStatusFiltro] = useState<"todos" | "ativos" | "inativos">("todos");
  const [viewMode, setViewMode] = useState<"cards" | "tabela">("cards");

  // Dialogs
  const [formOpen, setFormOpen] = useState(false);
  const [editingParceiro, setEditingParceiro] = useState<Partial<Parceiro> | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importParceiroId, setImportParceiroId] = useState<string | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<Parceiro | null>(null);
  const [anexoParceiro, setAnexoParceiro] = useState<Parceiro | null>(null);
  const [midiaKitOpen, setMidiaKitOpen] = useState(false);
  const [midiaKitParceiroId, setMidiaKitParceiroId] = useState<string | undefined>(undefined);

  // Queries
  const { data: parceiros = [], isLoading } = useQuery<Parceiro[]>({
    queryKey: ["parceiros"],
    queryFn: () => listFn(),
  });

  // Mutação de exclusão
  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["parceiros"] });
      qc.invalidateQueries({ queryKey: ["produtos"] });
      toast.success("Parceiro removido com sucesso");
      setDeleteTarget(null);
    },
    onError: (e: Error) => {
      toast.error(e.message || "Erro ao remover parceiro");
    },
  });

  // Filtragem
  const filtrados = useMemo(() => {
    return parceiros.filter((p) => {
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        p.razao_social.toLowerCase().includes(q) ||
        (p.nome_fantasia && p.nome_fantasia.toLowerCase().includes(q)) ||
        (p.cnpj && p.cnpj.replace(/\D/g, "").includes(q.replace(/\D/g, ""))) ||
        (p.cidade && p.cidade.toLowerCase().includes(q)) ||
        (p.contato_nome && p.contato_nome.toLowerCase().includes(q));

      const matchSegmento =
        segmentoFiltro === "todos" || (p.segmentos && p.segmentos.includes(segmentoFiltro));

      const matchStatus =
        statusFiltro === "todos" ||
        (statusFiltro === "ativos" && p.ativo) ||
        (statusFiltro === "inativos" && !p.ativo);

      return matchSearch && matchSegmento && matchStatus;
    });
  }, [parceiros, search, segmentoFiltro, statusFiltro]);

  // Métricas
  const stats = useMemo(() => {
    const total = parceiros.length;
    const ativos = parceiros.filter((p) => p.ativo).length;
    const totalProdutos = parceiros.reduce((acc, p) => acc + (p.produtos_count || 0), 0);
    const mediaComissao =
      parceiros.length > 0
        ? parceiros.reduce((acc, p) => acc + (p.comissao_padrao_pct || 0), 0) / parceiros.length
        : 0;

    return { total, ativos, totalProdutos, mediaComissao };
  }, [parceiros]);

  const handleOpenImport = (parceiroId?: string) => {
    setImportParceiroId(parceiroId);
    setImportOpen(true);
  };

  return (
    <AppShell>
      <div className="flex flex-col gap-6 p-4 md:p-8 max-w-7xl mx-auto">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-600/10 text-purple-600 dark:text-purple-400">
              <Handshake className="size-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                Parceiros de Mídia
                <Badge
                  variant="secondary"
                  className="text-xs bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300"
                >
                  {parceiros.length}
                </Badge>
              </h1>
              <p className="text-sm text-muted-foreground">
                Gestão comercial de fornecedores de mídia, remuneração acordada sobre vendas e
                importação de inventário.
              </p>
            </div>
          </div>

          {canManage && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="gap-2 border-slate-200 dark:border-slate-800"
                onClick={() => {
                  downloadModeloProdutosExcel("modelo-importacao-produtos-cliente.xlsx");
                  toast.success("Modelo de planilha (.xlsx) baixado com sucesso!");
                }}
                title="Baixar planilha modelo (.xlsx) para preenchimento de produtos e pontos"
              >
                <Download className="size-4 text-emerald-600" />
                Baixar Modelo (.xlsx)
              </Button>
              <Button
                variant="outline"
                className="gap-2 border-purple-200 dark:border-purple-800 hover:bg-purple-50 dark:hover:bg-purple-950/50"
                onClick={() => handleOpenImport()}
              >
                <FileSpreadsheet className="size-4 text-purple-600" />
                Importar Planilha
              </Button>
              <Button
                variant="outline"
                className="gap-2 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 shadow-xs"
                onClick={() => {
                  setMidiaKitParceiroId(undefined);
                  setMidiaKitOpen(true);
                }}
                title="Cadastrar parceiro e produtos a partir de PDF (Mídia Kit) ou Planilha (Excel/CSV)"
              >
                <Sparkles className="size-4 text-indigo-600" />
                Importar PDF ou Excel (IA)
              </Button>
              <Button
                className="gap-2 bg-purple-600 hover:bg-purple-700 text-white shadow-sm"
                onClick={() => {
                  setEditingParceiro(null);
                  setFormOpen(true);
                }}
              >
                <Plus className="size-4" />
                Novo Parceiro
              </Button>
            </div>
          )}
        </div>

        {/* Cards de Métricas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-border/60 shadow-xs">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Total de Parceiros</p>
                <h3 className="text-2xl font-bold mt-1">{stats.total}</h3>
              </div>
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
                <Building2 className="size-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-xs">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Parceiros Ativos</p>
                <h3 className="text-2xl font-bold mt-1 text-emerald-600">{stats.ativos}</h3>
              </div>
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
                <CheckCircle2 className="size-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-xs">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Produtos / Mídias</p>
                <h3 className="text-2xl font-bold mt-1 text-purple-600">{stats.totalProdutos}</h3>
              </div>
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600">
                <Layers className="size-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-xs">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Média de Comissão</p>
                <h3 className="text-2xl font-bold mt-1 text-amber-600">
                  {stats.mediaComissao.toFixed(1)}%
                </h3>
              </div>
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600">
                <Percent className="size-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Barra de Filtros e Busca */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por razão social, nome fantasia, CNPJ, cidade..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-background"
              />
            </div>

            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-lg border bg-muted/40 p-1">
                <button
                  type="button"
                  onClick={() => setStatusFiltro("todos")}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    statusFiltro === "todos"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Todos ({parceiros.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFiltro("ativos")}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    statusFiltro === "ativos"
                      ? "bg-background text-emerald-600 shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Ativos ({stats.ativos})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFiltro("inativos")}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    statusFiltro === "inativos"
                      ? "bg-background text-destructive shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Inativos ({stats.total - stats.ativos})
                </button>
              </div>

              {/* Alternador de Visualização Cards / Tabela */}
              <div className="inline-flex rounded-lg border bg-muted/40 p-1">
                <button
                  type="button"
                  onClick={() => setViewMode("cards")}
                  className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    viewMode === "cards"
                      ? "bg-background text-primary shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Visualização em Cards"
                >
                  <LayoutGrid className="size-3.5" />
                  Cards
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("tabela")}
                  className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    viewMode === "tabela"
                      ? "bg-background text-primary shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Visualização em Tabela"
                >
                  <TableIcon className="size-3.5" />
                  Tabela
                </button>
              </div>
            </div>
          </div>

          {/* Segmentos de Mídia Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
            <Badge
              variant={segmentoFiltro === "todos" ? "default" : "outline"}
              className="cursor-pointer text-xs shrink-0 select-none"
              onClick={() => setSegmentoFiltro("todos")}
            >
              Todos os Segmentos
            </Badge>
            {SEGMENTOS_MIDIA.map((seg) => (
              <Badge
                key={seg}
                variant={segmentoFiltro === seg ? "default" : "outline"}
                className={`cursor-pointer text-xs shrink-0 select-none transition-colors ${
                  segmentoFiltro === seg
                    ? "bg-purple-600 hover:bg-purple-700 text-white"
                    : "hover:bg-muted text-muted-foreground"
                }`}
                onClick={() => setSegmentoFiltro(segmentoFiltro === seg ? "todos" : seg)}
              >
                {seg}
              </Badge>
            ))}
          </div>
        </div>

        {/* Lista / Grid de Parceiros */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="h-64 animate-pulse bg-muted/40" />
            ))}
          </div>
        ) : filtrados.length === 0 ? (
          <Card className="border-dashed border-2 p-12 text-center">
            <div className="flex flex-col items-center justify-center max-w-md mx-auto">
              <div className="p-4 rounded-full bg-purple-50 dark:bg-purple-950/40 text-purple-600 mb-4">
                <Handshake className="size-8" />
              </div>
              <h3 className="text-lg font-semibold">Nenhum parceiro encontrado</h3>
              <p className="text-sm text-muted-foreground mt-1 mb-6">
                {search || segmentoFiltro !== "todos" || statusFiltro !== "todos"
                  ? "Tente ajustar os filtros ou o termo de busca para visualizar os parceiros."
                  : "Cadastre fornecedores de mídia (DOOH, front lights, elevadores, shoppings) para gerenciar o inventário e condições comerciais de repasse."}
              </p>
              {canManage && (
                <div className="flex items-center gap-3">
                  <Button variant="outline" className="gap-2" onClick={() => handleOpenImport()}>
                    <Upload className="size-4" />
                    Importar Planilha
                  </Button>
                  <Button
                    className="gap-2 bg-purple-600 hover:bg-purple-700 text-white"
                    onClick={() => {
                      setEditingParceiro(null);
                      setFormOpen(true);
                    }}
                  >
                    <Plus className="size-4" />
                    Cadastrar Primeiro Parceiro
                  </Button>
                </div>
              )}
            </div>
          </Card>
        ) : viewMode === "tabela" ? (
          <Card className="border-border/70 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="w-14 text-center">Logo</TableHead>
                    <TableHead>Veículo / Parceiro</TableHead>
                    <TableHead>Tipo de Mídia</TableHead>
                    <TableHead>CNPJ</TableHead>
                    <TableHead className="text-center">Espaços Vinculados</TableHead>
                    <TableHead className="text-right">Comissão Padrão</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Cidade / UF</TableHead>
                    <TableHead className="text-right pr-4">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtrados.map((parceiro) => (
                    <TableRow key={parceiro.id} className="hover:bg-muted/30">
                      <TableCell className="text-center">
                        <div className="size-9 rounded-lg bg-muted/60 border border-border flex items-center justify-center overflow-hidden mx-auto shadow-xs">
                          {parceiro.logo_url ? (
                            <LogoImg
                              stored={parceiro.logo_url}
                              alt={parceiro.nome_fantasia || parceiro.razao_social}
                              className="size-full object-contain p-1 bg-white"
                            />
                          ) : (
                            <span className="font-bold text-[10px] text-purple-700 dark:text-purple-300">
                              {(parceiro.nome_fantasia || parceiro.razao_social).slice(0, 2).toUpperCase()}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-bold text-xs text-foreground">
                          {parceiro.nome_fantasia || parceiro.razao_social}
                        </div>
                        {parceiro.nome_fantasia && (
                          <div className="text-[11px] text-muted-foreground truncate max-w-[200px]">
                            {parceiro.razao_social}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="text-[10px] bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-800 font-medium"
                        >
                          {parceiro.tipo_veiculo || "Painel OOH/DOOH"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-[11px] text-muted-foreground">
                        {parceiro.cnpj || "—"}
                      </TableCell>
                      <TableCell className="text-center font-bold text-xs text-purple-700 dark:text-purple-300">
                        {parceiro.produtos_count || 0}
                      </TableCell>
                      <TableCell className="text-right font-bold text-xs text-emerald-600 dark:text-emerald-400">
                        {parceiro.comissao_padrao_percentual || parceiro.comissao_padrao_pct || 20}%
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={parceiro.status === "ativo" || parceiro.ativo ? "default" : "secondary"}
                          className={`text-[10px] ${
                            parceiro.status === "em_negociacao"
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 font-semibold"
                              : parceiro.status === "inativo" || !parceiro.ativo
                                ? "bg-muted text-muted-foreground"
                                : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-semibold"
                          }`}
                        >
                          {parceiro.status === "em_negociacao"
                            ? "Em Negociação"
                            : parceiro.ativo || parceiro.status === "ativo"
                              ? "Ativo"
                              : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {parceiro.cidade ? `${parceiro.cidade}${parceiro.uf ? `/${parceiro.uf}` : ""}` : "—"}
                      </TableCell>
                      <TableCell className="text-right pr-4">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => {
                              setEditingParceiro(parceiro);
                              setFormOpen(true);
                            }}
                          >
                            <Pencil className="size-3.5 mr-1" />
                            Editar
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => setAnexoParceiro(parceiro)}
                          >
                            <Paperclip className="size-3.5 mr-1 text-blue-600" />
                            Anexos
                          </Button>
                          <Button variant="outline" size="sm" className="h-7 px-2 text-xs" asChild>
                            <Link to="/produtos" search={{ parceiro: parceiro.razao_social } as any}>
                              Mídias
                              <ExternalLink className="size-3 ml-1" />
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtrados.map((parceiro) => {
              const cleanPhone = parceiro.contato_telefone
                ? parceiro.contato_telefone.replace(/\D/g, "")
                : "";
              const whatsappUrl = cleanPhone ? `https://wa.me/55${cleanPhone}` : "";

              return (
                <Card
                  key={parceiro.id}
                  className="flex flex-col justify-between hover:shadow-md transition-shadow border-border/70"
                >
                  <CardHeader className="pb-3 space-y-3">
                    {/* Header do Card: Status & Ações */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="size-11 rounded-xl bg-muted/60 flex items-center justify-center font-bold text-purple-700 dark:text-purple-300 text-sm border border-purple-200 dark:border-purple-800 overflow-hidden shrink-0 shadow-xs">
                          {parceiro.logo_url ? (
                            <LogoImg
                              stored={parceiro.logo_url}
                              alt={parceiro.nome_fantasia || parceiro.razao_social}
                              className="size-full object-contain p-1 bg-white"
                            />
                          ) : (
                            <span>
                              {parceiro.nome_fantasia
                                ? parceiro.nome_fantasia.slice(0, 2).toUpperCase()
                                : parceiro.razao_social.slice(0, 2).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4
                            className="font-bold text-base leading-tight truncate text-foreground"
                            title={parceiro.nome_fantasia || parceiro.razao_social}
                          >
                            {parceiro.nome_fantasia || parceiro.razao_social}
                          </h4>
                          {parceiro.nome_fantasia && (
                            <p
                              className="text-xs text-muted-foreground truncate"
                              title={parceiro.razao_social}
                            >
                              {parceiro.razao_social}
                            </p>
                          )}
                          {parceiro.cnpj && (
                            <p className="text-[11px] font-mono text-muted-foreground/80 mt-0.5">
                              {parceiro.cnpj}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <Badge
                          variant="outline"
                          className="text-[10px] bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-800 font-medium"
                        >
                          {parceiro.tipo_veiculo || "Painel OOH/DOOH"}
                        </Badge>
                        <Badge
                          variant={parceiro.status === "ativo" || parceiro.ativo ? "default" : "secondary"}
                          className={`text-[10px] ${
                            parceiro.status === "em_negociacao"
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 font-semibold"
                              : parceiro.status === "inativo" || !parceiro.ativo
                                ? "bg-muted text-muted-foreground"
                                : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-semibold"
                          }`}
                        >
                          {parceiro.status === "em_negociacao"
                            ? "Em Negociação"
                            : parceiro.ativo || parceiro.status === "ativo"
                              ? "Ativo"
                              : "Inativo"}
                        </Badge>

                        {canManage && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-7">
                                <MoreVertical className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditingParceiro(parceiro);
                                  setFormOpen(true);
                                }}
                              >
                                <Pencil className="size-3.5 mr-2" />
                                Editar Parceiro
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleOpenImport(parceiro.id)}>
                                <FileSpreadsheet className="size-3.5 mr-2 text-purple-600" />
                                Importar Planilha de Produtos
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setMidiaKitParceiroId(parceiro.id);
                                  setMidiaKitOpen(true);
                                }}
                                className="text-indigo-600 dark:text-indigo-400 font-medium"
                              >
                                <Sparkles className="size-3.5 mr-2 text-indigo-600" />
                                Ler Mídia Kit & Preços com IA
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setAnexoParceiro(parceiro)}>
                                <Paperclip className="size-3.5 mr-2 text-blue-600" />
                                Anexar Documentos / Mídia Kit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => setDeleteTarget(parceiro)}
                              >
                                <Trash2 className="size-3.5 mr-2" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>

                    {/* Segmentos de Mídia */}
                    {parceiro.segmentos && parceiro.segmentos.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {parceiro.segmentos.slice(0, 3).map((seg) => (
                          <Badge
                            key={seg}
                            variant="secondary"
                            className="text-[10px] bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-medium"
                          >
                            {seg}
                          </Badge>
                        ))}
                        {parceiro.segmentos.length > 3 && (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">
                            +{parceiro.segmentos.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                  </CardHeader>

                  <CardContent className="pt-0 pb-3 flex flex-col gap-3 text-xs">
                    {/* Condições Comerciais e Remuneração */}
                    <div className="p-2.5 rounded-lg bg-muted/40 border flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground font-medium">
                          Remuneração do Inquilino:
                        </span>
                        <Badge className="bg-purple-600 text-white font-bold text-xs">
                          {parceiro.comissao_padrao_pct}% comissão
                        </Badge>
                      </div>

                      {parceiro.prazo_repasse && (
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-muted-foreground">Prazo de Repasse:</span>
                          <span className="font-medium text-foreground">
                            {parceiro.prazo_repasse}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Contatos & Localização */}
                    <div className="space-y-1 text-muted-foreground">
                      {parceiro.contato_nome && (
                        <p className="flex items-center gap-1.5 font-medium text-foreground">
                          <span>👤 {parceiro.contato_nome}</span>
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5">
                        {parceiro.contato_telefone && (
                          <div className="flex items-center gap-1">
                            <Phone className="size-3 text-emerald-600" />
                            <span>{parceiro.contato_telefone}</span>
                            {whatsappUrl && (
                              <a
                                href={whatsappUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-emerald-600 hover:text-emerald-700 font-semibold ml-0.5"
                                title="Abrir WhatsApp"
                              >
                                [WhatsApp]
                              </a>
                            )}
                          </div>
                        )}

                        {parceiro.contato_email && (
                          <div
                            className="flex items-center gap-1 truncate max-w-[200px]"
                            title={parceiro.contato_email}
                          >
                            <Mail className="size-3 text-blue-600" />
                            <a
                              href={`mailto:${parceiro.contato_email}`}
                              className="hover:underline"
                            >
                              {parceiro.contato_email}
                            </a>
                          </div>
                        )}
                      </div>

                      {(parceiro.cidade || parceiro.uf) && (
                        <div className="flex items-center gap-1 pt-0.5">
                          <MapPin className="size-3 text-muted-foreground" />
                          <span>
                            {[parceiro.cidade, parceiro.uf].filter(Boolean).join(" - ")}
                            {parceiro.endereco && ` • ${parceiro.endereco}`}
                          </span>
                        </div>
                      )}

                      {/* Presença Digital & Redes Sociais */}
                      {Boolean(
                        parceiro.site ||
                          parceiro.instagram ||
                          parceiro.linkedin ||
                          parceiro.facebook,
                      ) && (
                        <div className="flex flex-wrap items-center gap-2 pt-1.5 border-t border-border/40 mt-1">
                          {parceiro.site && (
                            <a
                              href={
                                parceiro.site.startsWith("http")
                                  ? parceiro.site
                                  : `https://${parceiro.site}`
                              }
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline font-medium"
                              title="Visitar site oficial"
                            >
                              <Globe className="size-3" />
                              <span>Site</span>
                            </a>
                          )}
                          {parceiro.instagram && (
                            <a
                              href={
                                parceiro.instagram.startsWith("http")
                                  ? parceiro.instagram
                                  : `https://instagram.com/${parceiro.instagram.replace(/^@/, "")}`
                              }
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] text-pink-600 hover:underline font-medium"
                              title="Perfil no Instagram"
                            >
                              <Instagram className="size-3" />
                              <span>
                                {parceiro.instagram.startsWith("@")
                                  ? parceiro.instagram
                                  : `@${parceiro.instagram.replace(/.*instagram\.com\//, "").replace(/\/$/, "")}`}
                              </span>
                            </a>
                          )}
                          {parceiro.linkedin && (
                            <a
                              href={
                                parceiro.linkedin.startsWith("http")
                                  ? parceiro.linkedin
                                  : `https://${parceiro.linkedin}`
                              }
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline font-medium"
                              title="Perfil no LinkedIn"
                            >
                              <Linkedin className="size-3" />
                              <span>LinkedIn</span>
                            </a>
                          )}
                          {parceiro.facebook && (
                            <a
                              href={
                                parceiro.facebook.startsWith("http")
                                  ? parceiro.facebook
                                  : `https://${parceiro.facebook}`
                              }
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] text-blue-700 hover:underline font-medium"
                              title="Página no Facebook"
                            >
                              <Facebook className="size-3" />
                              <span>Facebook</span>
                            </a>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Inventário e Ações de Rodapé */}
                    <div className="pt-2 border-t flex items-center justify-between gap-2 mt-auto">
                      <div className="flex items-center gap-1.5">
                        <Layers className="size-3.5 text-purple-600" />
                        <span className="font-semibold text-foreground">
                          {parceiro.produtos_count || 0} produto(s)
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => setAnexoParceiro(parceiro)}
                          title="Anexar ou visualizar documentos, mídia kit e contratos"
                        >
                          <Paperclip className="size-3.5 mr-1" />
                          Anexos
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950/40"
                          onClick={() => handleOpenImport(parceiro.id)}
                          title="Importar planilha de produtos para este parceiro"
                        >
                          <Upload className="size-3.5 mr-1" />
                          Importar Mídias
                        </Button>

                        <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
                          <Link to="/produtos" search={{ parceiro: parceiro.razao_social } as any}>
                            Ver Produtos
                            <ExternalLink className="size-3 ml-1" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Universal de Anexos do Parceiro */}
      {anexoParceiro && (
        <UniversalAnexosModal
          isOpen={!!anexoParceiro}
          onClose={() => setAnexoParceiro(null)}
          entidadeTipo="parceiro"
          entidadeId={anexoParceiro.id}
          entidadeNome={anexoParceiro.nome_fantasia || anexoParceiro.razao_social}
          tituloCustomizado={`Documentos & Mídia Kit — ${anexoParceiro.nome_fantasia || anexoParceiro.razao_social}`}
        />
      )}

      {/* Dialog de Criação / Edição de Parceiro */}
      <ParceiroFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editingParceiro}
        onSuccess={() => {
          qc.invalidateQueries({ queryKey: ["parceiros"] });
        }}
      />

      {/* Dialog de Importação de Planilha vinculada ao Parceiro */}
      <ImportarProdutosDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        midiaPadrao="DOOH"
        parceiroPadraoId={importParceiroId}
      />

      {/* Dialog de Leitura Inteligente de Mídia Kit, Apresentação & Tabela de Preços (IA) */}
      <ImportarMidiaKitDialog
        open={midiaKitOpen}
        onOpenChange={setMidiaKitOpen}
        parceiroInicialId={midiaKitParceiroId}
        onSuccess={() => {
          qc.invalidateQueries({ queryKey: ["parceiros"] });
          qc.invalidateQueries({ queryKey: ["produtos"] });
        }}
      />

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover parceiro?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover <strong>{deleteTarget?.razao_social}</strong>? Os
              produtos vinculados a este parceiro permanecerão no catálogo, mas perderão a
              referência direta do cadastro.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget?.id && deleteMut.mutate(deleteTarget.id)}
            >
              Confirmar Exclusão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
