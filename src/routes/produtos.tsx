import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState, useEffect, useMemo, useCallback } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Plus,
  Pencil,
  Trash2,
  Tv,
  Radio,
  Monitor,
  Building2,
  Tags,
  Upload,
  Handshake,
  Download,
  FileSpreadsheet,
  Camera,
  Sparkles,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import {
  listProdutos,
  upsertProduto,
  deleteProduto,
  listProdutoTipos,
  upsertProdutoTipo,
  deleteProdutoTipo,
} from "@/lib/produtos.functions";
import { listMidiaConfig, upsertMidiaConfig } from "@/lib/midia-config.functions";
import { SUGESTOES_TIPOS_POR_MIDIA } from "@/lib/catalogo-midias";
import { useUserRoles } from "@/hooks/use-roles";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { formatBRL } from "@/lib/mock-data";
import { LogoImg } from "@/components/LogoImg";
import { ProdutoFotoImg } from "@/components/ProdutoFotoImg";
import { ProdutoFotoGalleryModal } from "@/components/ProdutoFotoGalleryModal";
import { ProdutoFormDialog, type Produto } from "@/components/ProdutoFormDialog";
import { ImportarProdutosDialog } from "@/components/ImportarProdutosDialog";
import { ImportarMidiaKitDialog } from "@/components/ImportarMidiaKitDialog";
import { CatalogoEspacosTab } from "@/components/CatalogoEspacosTab";
import { downloadModeloProdutosExcel } from "@/lib/exportar-modelo-produtos";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/produtos")({
  head: () => ({ meta: [{ title: "Produtos — Mídia.OS" }] }),
  validateSearch: (search: Record<string, unknown>) => ({
    parceiro: typeof search.parceiro === "string" ? search.parceiro : undefined,
  }),
  component: ProdutosPage,
});

type Midia = string;

const midiaLabel: Record<string, string> = { TV: "TV", Radio: "Rádio", DOOH: "DOOH" };
const getMidiaLabel = (m: string) => midiaLabel[m] || m;

type MidiaConfig = {
  midia: Midia;
  cnpj: string | null;
  razao_social: string | null;
  nome_fantasia: string | null;
  endereco: string | null;
  cidade: string | null;
  uf: string | null;
  cep: string | null;
  inscricao_estadual: string | null;
  inscricao_municipal: string | null;
  telefone: string | null;
  email: string | null;
  site: string | null;
  logo_url: string | null;
  observacao: string | null;
};

type ProdutoTipo = {
  id: string;
  nome: string;
  midia: Midia;
};

function ProdutosPage() {
  const qc = useQueryClient();
  const { isAdmin, can, hasPermission } = useUserRoles();
  const canManage = isAdmin || can("/produtos") || hasPermission("module.produtos");
  const fetchList = useServerFn(listProdutos);
  const deleteFn = useServerFn(deleteProduto);
  const fetchConfigs = useServerFn(listMidiaConfig);
  const upsertConfigFn = useServerFn(upsertMidiaConfig);
  const fetchTipos = useServerFn(listProdutoTipos);

  const searchParams = Route.useSearch();
  const { isNexo } = useCurrentOrg();
  const [mainView, setMainView] = useState<"catalogo" | "tabela">("catalogo");
  const [tab, setTab] = useState<Midia>("TV");
  const [search, setSearch] = useState(searchParams.parceiro || "");
  const [filtroTipo, setFiltroTipo] = useState<string>("__all__");
  const [filtroStatus, setFiltroStatus] = useState<"all" | "ativo" | "inativo">("all");
  const [filtroOrigem, setFiltroOrigem] = useState<"all" | "proprio" | "parceiro">(
    searchParams.parceiro ? "parceiro" : "all",
  );
  const [filtroCanalMacro, setFiltroCanalMacro] = useState<"all" | "OFF" | "ON" | "HIBRIDO">("all");
  const [editing, setEditing] = useState<Partial<Produto> | null>(null);
  const [open, setOpen] = useState(false);
  const [cfgOpen, setCfgOpen] = useState(false);
  const [cfgEditing, setCfgEditing] = useState<Partial<MidiaConfig> | null>(null);
  const [tiposOpen, setTiposOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [midiaKitOpen, setMidiaKitOpen] = useState(false);
  const [galleryFotos, setGalleryFotos] = useState<{
    fotos: string[];
    titulo: string;
    subtitulo?: string;
  } | null>(null);
  const [novaMidiaOpen, setNovaMidiaOpen] = useState(false);
  const [novaMidiaNome, setNovaMidiaNome] = useState("");
  const [customMidias, setCustomMidias] = useState<string[]>([]);

  const { data, isLoading } = useQuery({ queryKey: ["produtos"], queryFn: () => fetchList() });
  const { data: configs } = useQuery({ queryKey: ["midia_config"], queryFn: () => fetchConfigs() });
  const { data: todosTipos = [] } = useQuery({
    queryKey: ["produto_tipos"],
    queryFn: () => fetchTipos(),
  });

  const allProdutos = (data as Produto[]) ?? [];

  const listaMidias = useMemo<string[]>(() => {
    const fromConfigs = ((configs as MidiaConfig[]) ?? []).map((c) => c.midia).filter(Boolean);
    const fromProdutos = allProdutos.map((p) => p.midia).filter(Boolean);
    const fromTipos = ((todosTipos as ProdutoTipo[]) ?? []).map((t) => t.midia).filter(Boolean);
    return Array.from(
      new Set(["TV", "Radio", "DOOH", ...fromConfigs, ...fromProdutos, ...fromTipos, ...customMidias]),
    );
  }, [configs, allProdutos, todosTipos, customMidias]);

  useEffect(() => {
    if (searchParams.parceiro && allProdutos.length > 0) {
      setSearch(searchParams.parceiro);
      setFiltroOrigem("parceiro");
      const hasInDooh = allProdutos.some(
        (p) =>
          p.midia === "DOOH" &&
          (p.parceiro_nome?.toLowerCase().includes(searchParams.parceiro!.toLowerCase()) ||
            p.parceiro_cnpj?.includes(searchParams.parceiro!)),
      );
      if (hasInDooh) setTab("DOOH");
    }
  }, [searchParams.parceiro, allProdutos]);

  const delMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["produtos"] });
      toast.success("Produto removido");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveCfgMut = useMutation({
    mutationFn: (c: any) => upsertConfigFn({ data: c }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["midia_config"] });
      toast.success("Dados da emissora salvos");
      setCfgOpen(false);
      setCfgEditing(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const q = search.trim().toLowerCase();
  const list = allProdutos.filter((p) => {
    if (p.midia !== tab) return false;
    if (filtroTipo !== "__all__" && (p.tipo ?? "") !== filtroTipo) return false;
    if (filtroStatus === "ativo" && !p.ativo) return false;
    if (filtroStatus === "inativo" && p.ativo) return false;
    if (filtroOrigem === "proprio" && (p.parceiro_cnpj || p.parceiro_nome || p.parceiro_id))
      return false;
    if (filtroOrigem === "parceiro" && !p.parceiro_cnpj && !p.parceiro_nome && !p.parceiro_id)
      return false;
    if (filtroCanalMacro !== "all" && (p.canal_macro || "OFF") !== filtroCanalMacro)
      return false;
    if (!q) return true;
    return [
      p.nome,
      p.tipo,
      p.programa,
      p.formato,
      p.faixa,
      p.parceiro_nome,
      p.parceiro_cnpj,
      p.plataforma_rede,
      p.canal_macro,
    ]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q));
  });

  // Função para retornar os tipos cadastrados para uma mídia específica deste inquilino
  const getTiposPorMidia = (m: Midia) => {
    const tiposDaMidia = (todosTipos as ProdutoTipo[])
      .filter((t) => t.midia === m)
      .map((t) => t.nome.trim())
      .filter(Boolean);
    const tiposDosProdutos = allProdutos
      .filter((p) => p.midia === m && p.tipo && p.tipo.trim())
      .map((p) => p.tipo!.trim());
    const tiposCatalogo = SUGESTOES_TIPOS_POR_MIDIA[m] || [];
    return Array.from(new Set([...tiposDaMidia, ...tiposDosProdutos, ...tiposCatalogo])).sort((a, b) =>
      a.localeCompare(b, "pt-BR"),
    );
  };

  // Sugestões estritamente do que foi cadastrado pelo inquilino para a mídia ativa
  const tiposSugeridos = getTiposPorMidia(tab);
  const programasSugeridos = Array.from(
    new Set(
      allProdutos
        .filter((p) => p.midia === tab)
        .map((p) => p.programa)
        .filter(Boolean),
    ),
  ).sort();
  const formatosSugeridos = Array.from(
    new Set(
      allProdutos
        .filter((p) => p.midia === tab)
        .map((p) => p.formato)
        .filter(Boolean),
    ),
  ).sort();
  const faixasSugeridas = Array.from(
    new Set(
      allProdutos
        .filter((p) => p.midia === tab)
        .map((p) => p.faixa)
        .filter(Boolean),
    ),
  ).sort();

  const currentCfg = ((configs as MidiaConfig[]) ?? []).find((c) => c.midia === tab);

  const openNew = () => {
    setEditing({
      midia: tab,
      nome: "",
      duracao_segundos: 30,
      insercoes_padrao: 1,
      valor_unit: 0,
      ativo: true,
    });
    setOpen(true);
  };

  const openCfg = () => {
    setCfgEditing(currentCfg ?? { midia: tab as any });
    setCfgOpen(true);
  };

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl lg:text-3xl font-display font-semibold tracking-tight">
              {isNexo ? "Soluções Próprias Nexo & Veículos Representados" : "Produtos & Inventário Comercial"}
            </h1>
            {isNexo && (
              <Badge variant="outline" className="bg-sky-500/10 text-sky-600 border-sky-500/30 text-xs font-bold py-0.5">
                Hub Nexo 360° DF
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            {isNexo
              ? "Catálogo estratégico de inventário comercial: soluções próprias e veículos parceiros homologados no Distrito Federal."
              : "Cadastro de produtos de TV, Rádio, DOOH e canais digitais (valor, tempo e inserções padrão)."}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <Button
            variant="outline"
            asChild
            className="gap-2 border-purple-200 dark:border-purple-800 hover:bg-purple-50 dark:hover:bg-purple-950/40"
          >
            <Link to="/parceiros">
              <Handshake className="size-4 text-purple-600" />
              <span>Parceiros de Mídia</span>
            </Link>
          </Button>

          <Button
            variant="outline"
            onClick={() => {
              downloadModeloProdutosExcel("modelo-importacao-produtos-cliente.xlsx");
              toast.success("Modelo de planilha (.xlsx) baixado com sucesso!");
            }}
            className="gap-2 text-xs"
            title="Baixar planilha modelo (.xlsx) com instruções e exemplos de produtos para preenchimento"
          >
            <Download className="size-4 text-emerald-600" />
            <span>Baixar Modelo (.xlsx)</span>
          </Button>

          <Button
            variant="outline"
            onClick={() => setMidiaKitOpen(true)}
            className="gap-2 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 shadow-xs"
            title="Importar produtos e cadastrar parceiro via PDF (Mídia Kit) ou Planilha Excel com IA"
          >
            <Sparkles className="size-4 text-indigo-600" />
            <span>Importar PDF / Excel (IA)</span>
          </Button>

          <Button variant="outline" onClick={() => setImportOpen(true)} className="gap-2">
            <Upload className="size-4" />
            <span>Importar Planilha</span>
          </Button>

          <Button variant="outline" onClick={() => setTiposOpen(true)} className="gap-2">
            <Tags className="size-4" />
            <span>Tipos de Produto</span>
          </Button>

          {(isAdmin || canManage) && (
            <Button variant="outline" onClick={openCfg} className="gap-2">
              <Building2 className="size-4" />
              <span>Dados da emissora ({midiaLabel[tab]})</span>
            </Button>
          )}

          <Button onClick={openNew} className="gap-2 shadow-sm">
            <Plus className="size-4" />
            <span>Novo Produto</span>
          </Button>
        </div>
      </div>

      {/* Switcher de Visão Principal */}
      <div className="flex items-center gap-2 border rounded-xl p-1 bg-muted/40 w-fit mb-6 shadow-xs">
        <button
          type="button"
          onClick={() => setMainView("catalogo")}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2",
            mainView === "catalogo"
              ? "bg-background text-foreground shadow-xs ring-1 ring-border"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Layers className="size-4 text-primary" />
          <span>Catálogo & Representação Comercial</span>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-primary/10 text-primary">
            Nexo Hub
          </Badge>
        </button>
        <button
          type="button"
          onClick={() => setMainView("tabela")}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2",
            mainView === "tabela"
              ? "bg-background text-foreground shadow-xs ring-1 ring-border"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <FileSpreadsheet className="size-4" />
          <span>Grade por Mídia (TV, Rádio, DOOH)</span>
        </button>
      </div>

      {mainView === "catalogo" ? (
        <CatalogoEspacosTab initialPartnerId={searchParams.parceiro} />
      ) : (
        <>
          {currentCfg && (currentCfg.cnpj || currentCfg.razao_social) && (
        <Card className="mb-4">
          <CardContent className="py-3 px-4 text-sm flex flex-wrap gap-x-6 gap-y-1">
            <span>
              <strong>{midiaLabel[tab]}:</strong> {currentCfg.razao_social ?? "—"}
            </span>
            {currentCfg.cnpj && (
              <span>
                <strong>CNPJ:</strong> {currentCfg.cnpj}
              </span>
            )}
            {currentCfg.cidade && (
              <span>
                <strong>Cidade:</strong> {currentCfg.cidade}
                {currentCfg.uf ? `/${currentCfg.uf}` : ""}
              </span>
            )}
          </CardContent>
        </Card>
      )}

      <ImportarMidiaKitDialog open={midiaKitOpen} onOpenChange={setMidiaKitOpen} />
      <ImportarProdutosDialog open={importOpen} onOpenChange={setImportOpen} midiaPadrao={tab as any} />

      <Tabs value={tab} onValueChange={(v) => setTab(v)}>
        <TabsList className="flex flex-wrap h-auto gap-1">
          {listaMidias.map((m) => (
            <TabsTrigger key={m} value={m} className="gap-1.5">
              {m === "TV" ? (
                <Tv className="size-4" />
              ) : m === "Radio" ? (
                <Radio className="size-4" />
              ) : m === "DOOH" ? (
                <Monitor className="size-4" />
              ) : (
                <Tags className="size-3.5" />
              )}
              {getMidiaLabel(m)}
            </TabsTrigger>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setNovaMidiaOpen(true)}
            className="h-8 px-2.5 text-xs text-primary gap-1 border-dashed border-primary/40 hover:bg-primary/10 ml-1"
            title="Cadastrar nova mídia no sistema"
          >
            <Plus className="size-3.5" />
            Nova Mídia
          </Button>
        </TabsList>

        {listaMidias.map((m) => (
          <TabsContent key={m} value={m} className="mt-4 space-y-3">
            {/* Seletor Visual de Categorias Híbridas Nexo */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Categoria A: Soluções Próprias Nexo */}
              <div
                onClick={() => setFiltroOrigem(filtroOrigem === "proprio" ? "all" : "proprio")}
                className={cn(
                  "p-3.5 rounded-xl border transition-all cursor-pointer",
                  filtroOrigem === "proprio"
                    ? "bg-sky-500/10 border-sky-500 ring-2 ring-sky-500/30"
                    : "bg-card hover:bg-muted/40 border-border/70",
                )}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base">⭐</span>
                    <div>
                      <div className="font-bold text-xs sm:text-sm text-foreground">
                        A) SOLUÇÕES PRÓPRIAS NEXO (In-House Hub)
                      </div>
                      <div className="text-[10px] text-sky-600 dark:text-sky-400 font-semibold">
                        Gestão, Inteligência Estratégica & Execução Direta
                      </div>
                    </div>
                  </div>
                  <Badge
                    variant={filtroOrigem === "proprio" ? "default" : "outline"}
                    className="text-[10px] px-2 py-0.5 shrink-0 bg-sky-600 hover:bg-sky-700 text-white"
                  >
                    {filtroOrigem === "proprio" ? "Ativo" : "Filtrar"}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[
                    "Planejamento Estratégico & Inteligência 360°",
                    "Criação & Peças (LED, OOH, Digital)",
                    "Gestão de Tráfego & Performance",
                    "Coberturas, Eventos & Live Marketing",
                  ].map((sub) => (
                    <span
                      key={sub}
                      onClick={(e) => {
                        e.stopPropagation();
                        setFiltroOrigem("proprio");
                        setSearch(sub.split(" ")[0]);
                      }}
                      className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-sky-50 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border border-sky-200/80 dark:border-sky-800 hover:bg-sky-100 transition-colors"
                    >
                      {sub}
                    </span>
                  ))}
                </div>
              </div>

              {/* Categoria B: Veículos Representados */}
              <div
                onClick={() => setFiltroOrigem(filtroOrigem === "parceiro" ? "all" : "parceiro")}
                className={cn(
                  "p-3.5 rounded-xl border transition-all cursor-pointer",
                  filtroOrigem === "parceiro"
                    ? "bg-purple-500/10 border-purple-500 ring-2 ring-purple-500/30"
                    : "bg-card hover:bg-muted/40 border-border/70",
                )}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🤝</span>
                    <div>
                      <div className="font-bold text-xs sm:text-sm text-foreground">
                        B) VEÍCULOS REPRESENTADOS (Rede Homologada)
                      </div>
                      <div className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold">
                        Espaços de Alto Impacto • DF & Entorno
                      </div>
                    </div>
                  </div>
                  <Badge
                    variant={filtroOrigem === "parceiro" ? "default" : "outline"}
                    className="text-[10px] px-2 py-0.5 shrink-0 bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    {filtroOrigem === "parceiro" ? "Ativo" : "Filtrar"}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[
                    "Mídia Exterior & Rodoviária (LEDs/Fronts)",
                    "Mídia Indoor & Hiperlocal (Elevadores)",
                    "Mídia em Trânsito (TV Cars)",
                    "Mídia Sonora & Rádios (Spots/Blitz)",
                    "Mídia Digital Regional (Portais)",
                  ].map((sub) => (
                    <span
                      key={sub}
                      onClick={(e) => {
                        e.stopPropagation();
                        setFiltroOrigem("parceiro");
                        setSearch(sub.split(" ")[0]);
                      }}
                      className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-purple-50 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800 hover:bg-purple-100 transition-colors"
                    >
                      {sub}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <Card>
              <CardContent className="p-3 flex flex-wrap gap-2 items-center">
                <Input
                  placeholder="Pesquisar por nome, tipo, programa, formato ou faixa…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="max-w-sm"
                />
                <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Todos os tipos</SelectItem>
                    {tiposSugeridos.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filtroStatus} onValueChange={(v) => setFiltroStatus(v as any)}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos status</SelectItem>
                    <SelectItem value="ativo">Ativos</SelectItem>
                    <SelectItem value="inativo">Inativos</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filtroOrigem} onValueChange={(v) => setFiltroOrigem(v as any)}>
                  <SelectTrigger className="w-[260px]">
                    <SelectValue placeholder="Categoria / Origem" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as categorias</SelectItem>
                    <SelectItem value="proprio">
                      ⭐ A) SOLUÇÕES PRÓPRIAS NEXO (In-House Hub)
                    </SelectItem>
                    <SelectItem value="parceiro">
                      🤝 B) VEÍCULOS REPRESENTADOS (Rede Homologada)
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={filtroCanalMacro}
                  onValueChange={(v) => setFiltroCanalMacro(v as any)}
                >
                  <SelectTrigger className="w-[170px]">
                    <SelectValue placeholder="Canal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os canais</SelectItem>
                    <SelectItem value="OFF">📻 Mídia OFF</SelectItem>
                    <SelectItem value="ON">🌐 Mídia ON</SelectItem>
                    <SelectItem value="HIBRIDO">⚡ Híbrido 360°</SelectItem>
                  </SelectContent>
                </Select>
                <div className="text-sm text-muted-foreground ml-auto">
                  {list.length} resultado{list.length === 1 ? "" : "s"}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Origem / Parceiro</TableHead>
                      <TableHead>Programa / Faixa</TableHead>
                      <TableHead className="text-right">Duração</TableHead>
                      <TableHead className="text-right">Inserções</TableHead>
                      <TableHead className="text-right">Valor unit.</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-24" />
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
                    {!isLoading &&
                      list.length === 0 &&
                      (() => {
                        const totalMidia = allProdutos.filter((p) => p.midia === tab).length;
                        if (totalMidia === 0) {
                          return (
                            <TableRow>
                              <TableCell colSpan={8} className="py-12">
                                <div className="flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-4">
                                  <div className="size-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                                    {tab === "TV" ? (
                                      <Tv className="size-7" />
                                    ) : tab === "Radio" ? (
                                      <Radio className="size-7" />
                                    ) : (
                                      <Monitor className="size-7" />
                                    )}
                                  </div>
                                  <div className="space-y-1">
                                    <h3 className="font-semibold text-lg">
                                      Nenhum produto cadastrado para {midiaLabel[tab]}
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                      Você pode cadastrar produtos manualmente um a um ou importar
                                      todo o seu catálogo em lote via planilha Excel ou CSV.
                                    </p>
                                  </div>
                                  <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                                    <Button onClick={openNew} className="gap-2">
                                      <Plus className="size-4" />
                                      Cadastrar Manualmente
                                    </Button>
                                    <Button
                                      variant="outline"
                                      onClick={() => setImportOpen(true)}
                                      className="gap-2"
                                    >
                                      <Upload className="size-4" />
                                      Importar Planilha (.xlsx, .csv)
                                    </Button>
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        }
                        return (
                          <TableRow>
                            <TableCell colSpan={8} className="py-10 text-center space-y-2">
                              <p className="text-sm text-muted-foreground">
                                Nenhum produto encontrado com os filtros aplicados.
                              </p>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSearch("");
                                  setFiltroTipo("__all__");
                                  setFiltroStatus("all");
                                  setFiltroOrigem("all");
                                  setFiltroCanalMacro("all");
                                }}
                              >
                                Limpar filtros
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })()}
                    {list.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-3">
                            {p.fotos && p.fotos.length > 0 ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setGalleryFotos({
                                    fotos: p.fotos!,
                                    titulo: p.nome,
                                    subtitulo: [midiaLabel[p.midia], p.tipo, p.formato]
                                      .filter(Boolean)
                                      .join(" • "),
                                  })
                                }
                                className="relative size-11 rounded-lg overflow-hidden border border-border/80 shadow-sm shrink-0 group hover:ring-2 hover:ring-primary/50 transition-all cursor-pointer bg-muted/20 text-left"
                                title="Clique para ver fotos do produto"
                              >
                                <ProdutoFotoImg
                                  stored={p.fotos[0]}
                                  alt={p.nome}
                                  className="size-full object-cover group-hover:scale-110 transition-transform duration-200"
                                />
                                {p.fotos.length > 1 && (
                                  <span className="absolute bottom-0 right-0 bg-black/85 text-[9px] font-bold text-white px-1 rounded-tl-sm shadow">
                                    2 fotos
                                  </span>
                                )}
                              </button>
                            ) : (
                              <div
                                className="size-11 rounded-lg bg-muted/30 border border-dashed border-border/70 flex items-center justify-center text-muted-foreground/40 shrink-0"
                                title="Sem foto cadastrada"
                              >
                                <Camera className="size-4" />
                              </div>
                            )}
                            <div className="flex flex-col min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span
                                  className="font-semibold text-foreground truncate max-w-[240px]"
                                  title={p.nome}
                                >
                                  {p.nome}
                                </span>
                                {p.canal_macro === "ON" && (
                                  <Badge
                                    variant="outline"
                                    className="border-sky-400 bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 text-[9px] py-0 px-1 font-semibold"
                                  >
                                    🌐 ON{p.plataforma_rede ? ` • ${p.plataforma_rede}` : ""}
                                  </Badge>
                                )}
                                {p.canal_macro === "HIBRIDO" && (
                                  <Badge
                                    variant="outline"
                                    className="border-purple-400 bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 text-[9px] py-0 px-1 font-semibold"
                                  >
                                    ⚡ 360°
                                  </Badge>
                                )}
                              </div>
                              {p.tipo && (
                                <span className="text-[11px] text-muted-foreground truncate max-w-[240px]">
                                  {p.tipo}
                                </span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {p.parceiro_cnpj || p.parceiro_nome || p.parceiro_id ? (
                            <div className="flex flex-col items-start gap-1">
                              <Badge className="bg-purple-100 text-purple-900 dark:bg-purple-950 dark:text-purple-200 border-purple-300 text-[10px] font-bold py-0.5">
                                🤝 B) VEÍCULO REPRESENTADO (Rede Homologada)
                              </Badge>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span
                                  className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[190px]"
                                  title={p.parceiro_nome || undefined}
                                >
                                  {p.parceiro_nome || "Veículo Parceiro"}
                                </span>
                                {p.comissao_inquilino_pct != null && (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] font-bold text-purple-700 dark:text-purple-300 border-purple-300 bg-purple-50 dark:bg-purple-950/40 py-0"
                                  >
                                    {p.comissao_inquilino_pct}% BV
                                  </Badge>
                                )}
                              </div>
                              {p.parceiro_cnpj && (
                                <span className="font-mono text-[10px] text-muted-foreground">
                                  {p.parceiro_cnpj}
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="flex flex-col items-start gap-1">
                              <Badge
                                variant="outline"
                                className="border-sky-500/60 text-sky-900 dark:text-sky-200 bg-sky-50 dark:bg-sky-950/50 text-[10px] py-0.5 font-bold"
                              >
                                ⭐ A) SOLUÇÃO PRÓPRIA NEXO (In-House Hub)
                              </Badge>
                              <span className="text-[10px] text-muted-foreground truncate max-w-[200px]">
                                Planejamento 360° • Criação • Tráfego • Ativação
                              </span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          <div className="flex flex-col">
                            <span>{p.programa || "—"}</span>
                            <span className="text-[11px] opacity-70">
                              {[p.faixa, p.formato].filter(Boolean).join(" • ") || "—"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{p.duracao_segundos}s</TableCell>
                        <TableCell className="text-right">{p.insercoes_padrao}</TableCell>
                        <TableCell className="text-right">
                          {formatBRL(Number(p.valor_unit))}
                        </TableCell>
                        <TableCell>
                          <Badge variant={p.ativo ? "default" : "outline"}>
                            {p.ativo ? "Ativo" : "Inativo"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {canManage && (
                            <div className="flex justify-end gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                  setEditing(p);
                                  setOpen(true);
                                }}
                                title="Editar produto"
                              >
                                <Pencil className="size-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                  if (confirm(`Remover "${p.nome}"?`)) delMut.mutate(p.id);
                                }}
                                title="Remover produto"
                              >
                                <Trash2 className="size-4 text-destructive" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
        </>
      )}

      <ProdutoFormDialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) setEditing(null);
        }}
        initial={editing}
        sugestoes={{
          tipos: tiposSugeridos as string[],
          programas: programasSugeridos as string[],
          formatos: formatosSugeridos as string[],
          faixas: faixasSugeridas as string[],
        }}
        getTiposParaMidia={getTiposPorMidia}
      />

      <ProdutoFotoGalleryModal
        open={!!galleryFotos}
        onOpenChange={(v) => {
          if (!v) setGalleryFotos(null);
        }}
        fotos={galleryFotos?.fotos || []}
        titulo={galleryFotos?.titulo || "Fotos do Produto"}
        subtitulo={galleryFotos?.subtitulo}
      />

      <MidiaConfigDialog
        open={cfgOpen}
        onOpenChange={(v) => {
          setCfgOpen(v);
          if (!v) setCfgEditing(null);
        }}
        value={cfgEditing}
        onChange={setCfgEditing}
        onSave={() => cfgEditing && saveCfgMut.mutate(cfgEditing)}
        saving={saveCfgMut.isPending}
      />

      <ProdutoTiposDialog
        open={tiposOpen}
        onOpenChange={setTiposOpen}
        tipos={todosTipos as ProdutoTipo[]}
        midia={tab}
      />

      <Dialog open={novaMidiaOpen} onOpenChange={setNovaMidiaOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cadastrar Nova Mídia</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const nome = novaMidiaNome.trim();
              if (!nome) return;
              try {
                await upsertConfigFn({ data: { midia: nome } });
                await qc.invalidateQueries({ queryKey: ["midia_config"] });
                await qc.invalidateQueries({ queryKey: ["produto_tipos"] });
              } catch (err: any) {
                console.warn("[Cadastrar Nova Mídia] Aviso ao persistir configuração remota:", err);
              } finally {
                setCustomMidias((prev) => Array.from(new Set([...prev, nome])));
                setTab(nome);
                setNovaMidiaNome("");
                setNovaMidiaOpen(false);
                toast.success(`Mídia "${nome}" cadastrada com sucesso!`);
              }
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label>Nome da Mídia *</Label>
              <Input
                placeholder="Ex.: Internet, Jornal, Podcast, Cinema, Eventos..."
                value={novaMidiaNome}
                onChange={(e) => setNovaMidiaNome(e.target.value)}
                autoFocus
                required
              />
              <p className="text-xs text-muted-foreground">
                Ao cadastrar uma nova mídia, ela ficará disponível para seleção no cadastro de
                produtos e receberá uma aba dedicada.
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setNovaMidiaOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={!novaMidiaNome.trim()}>
                Cadastrar Mídia
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function ProdutoTiposDialog({
  open,
  onOpenChange,
  tipos,
  midia,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tipos: ProdutoTipo[];
  midia: Midia;
}) {
  const qc = useQueryClient();
  const upsertFn = useServerFn(upsertProdutoTipo);
  const deleteFn = useServerFn(deleteProdutoTipo);
  const [novo, setNovo] = useState("");

  const tiposDaMidia = tipos.filter((t) => t.midia === midia);

  const addMut = useMutation({
    mutationFn: () => upsertFn({ data: { nome: novo.trim(), midia } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["produto_tipos"] });
      setNovo("");
      toast.success(`Tipo de produto cadastrado para ${midiaLabel[midia]}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["produto_tipos"] });
      toast.success("Tipo removido");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tags className="size-5 text-primary" />
            Tipos de Produto — {midiaLabel[midia]}
          </DialogTitle>
        </DialogHeader>

        <p className="text-xs text-muted-foreground">
          Cada inquilino tem seus próprios tipos de produtos. Apenas os tipos cadastrados pelo seu
          inquilino aparecerão nos formulários e filtros.
        </p>

        <div className="space-y-4 py-2">
          <div className="flex gap-2">
            <Input
              placeholder={`Novo tipo para ${midiaLabel[midia]} (ex: VT, Spot, Banner...)`}
              value={novo}
              onChange={(e) => setNovo(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && novo.trim() && addMut.mutate()}
            />
            <Button onClick={() => addMut.mutate()} disabled={!novo.trim() || addMut.isPending}>
              {addMut.isPending ? "Salvando..." : "Adicionar"}
            </Button>
          </div>

          <div className="rounded-md border divide-y max-h-[300px] overflow-y-auto">
            {tiposDaMidia.length === 0 && (
              <div className="p-6 text-center text-sm text-muted-foreground space-y-1">
                <p className="font-medium text-foreground">
                  Nenhum tipo cadastrado para {midiaLabel[midia]}
                </p>
                <p className="text-xs">
                  Digite um nome acima para cadastrar seu primeiro tipo de produto.
                </p>
              </div>
            )}
            {tiposDaMidia.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
              >
                <span className="text-sm font-medium">{t.nome}</span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => confirm(`Remover o tipo "${t.nome}"?`) && delMut.mutate(t.id)}
                  disabled={delMut.isPending}
                  title="Remover tipo"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MidiaConfigDialog({
  open,
  onOpenChange,
  value,
  onChange,
  onSave,
  saving,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  value: Partial<MidiaConfig> | null;
  onChange: (v: Partial<MidiaConfig>) => void;
  onSave: () => void;
  saving: boolean;
}) {
  if (!value) return null;
  const set = (patch: Partial<MidiaConfig>) => onChange({ ...value, ...patch });

  const lookupCnpj = async () => {
    try {
      const { fetchCnpj, onlyDigits } = await import("@/lib/cnpj");
      const digits = onlyDigits(value.cnpj ?? "");
      if (digits.length !== 14) return toast.error("Informe um CNPJ válido");
      const d = await fetchCnpj(value.cnpj ?? "");
      set({
        cnpj: d.cnpj,
        razao_social: d.razaoSocial || value.razao_social || "",
        nome_fantasia: value.nome_fantasia || d.nomeFantasia,
        cep: d.cep || value.cep,
        endereco:
          [d.logradouro, d.numero, d.bairro].filter(Boolean).join(", ") || value.endereco || "",
        cidade: d.cidade || value.cidade,
        uf: d.estado || value.uf,
        telefone: value.telefone || d.telefone,
        email: value.email || d.email,
        inscricao_estadual:
          value.inscricao_estadual && value.inscricao_estadual.trim()
            ? value.inscricao_estadual
            : d.inscricaoEstadual || "ISENTA",
        inscricao_municipal:
          value.inscricao_municipal && value.inscricao_municipal.trim()
            ? value.inscricao_municipal
            : d.inscricaoMunicipal || "ISENTA",
      });
      toast.success("Dados preenchidos pela Receita Federal");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const uploadLogo = async (file: File) => {
    if (file.size > 4 * 1024 * 1024) return toast.error("Logo deve ter no máximo 4MB");
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const ext = file.name.split(".").pop() || "png";
      const path = `emissora-${value.midia}-${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("client-logos")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      // Bucket privado: guardamos apenas o path.
      set({ logo_url: path });
      toast.success("Logo enviada");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Dados da emissora — {midiaLabel[value.midia as Midia]}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSave();
          }}
          className="space-y-3"
        >
          <div className="space-y-1.5">
            <Label>Logo (usada no cabeçalho da PI)</Label>
            <div className="flex items-center gap-3">
              {value.logo_url && (
                <div className="relative h-16 w-32 rounded-md border bg-muted/30 overflow-hidden">
                  <LogoImg
                    stored={value.logo_url}
                    alt="Logo"
                    className="h-full w-full object-contain"
                  />
                </div>
              )}
              <Input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadLogo(f);
                }}
                className="max-w-xs"
              />
              {value.logo_url && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => set({ logo_url: null })}
                >
                  Remover
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
            <div>
              <Label>CNPJ</Label>
              <Input
                value={value.cnpj ?? ""}
                onChange={(e) => set({ cnpj: e.target.value })}
                placeholder="00.000.000/0000-00"
              />
            </div>
            <Button type="button" variant="secondary" onClick={lookupCnpj}>
              Buscar CNPJ
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Razão Social</Label>
              <Input
                value={value.razao_social ?? ""}
                onChange={(e) => set({ razao_social: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Nome Fantasia</Label>
              <Input
                value={value.nome_fantasia ?? ""}
                onChange={(e) => set({ nome_fantasia: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Inscrição Estadual</Label>
              <Input
                value={value.inscricao_estadual ?? ""}
                onChange={(e) => set({ inscricao_estadual: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Inscrição Municipal</Label>
              <Input
                value={value.inscricao_municipal ?? ""}
                onChange={(e) => set({ inscricao_municipal: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Endereço completo</Label>
            <Input
              value={value.endereco ?? ""}
              onChange={(e) => set({ endereco: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>CEP</Label>
              <Input value={value.cep ?? ""} onChange={(e) => set({ cep: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Cidade</Label>
              <Input value={value.cidade ?? ""} onChange={(e) => set({ cidade: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>UF</Label>
              <Input value={value.uf ?? ""} onChange={(e) => set({ uf: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Telefone</Label>
              <Input
                value={value.telefone ?? ""}
                onChange={(e) => set({ telefone: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>E-mail</Label>
              <Input value={value.email ?? ""} onChange={(e) => set({ email: e.target.value })} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Site</Label>
            <Input value={value.site ?? ""} onChange={(e) => set({ site: e.target.value })} />
          </div>

          <div className="space-y-1.5">
            <Label>Observações</Label>
            <Textarea
              rows={2}
              value={value.observacao ?? ""}
              onChange={(e) => set({ observacao: e.target.value })}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
