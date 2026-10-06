import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus,
  Search,
  Filter,
  Tv,
  Radio,
  Monitor,
  Building2,
  MapPin,
  ExternalLink,
  Layers,
  Sparkles,
  Handshake,
  DollarSign,
  Pencil,
  Trash2,
  LayoutGrid,
  List,
  Eye,
  CheckCircle2,
  AlertCircle,
  X,
  Compass,
  Calculator,
} from "lucide-react";
import { toast } from "sonner";
import { formatBRL } from "@/lib/mock-data";
import {
  listMediaCatalog,
  deleteMediaCatalogItem,
  listPartners,
} from "@/lib/representacao-comercial.functions";
import {
  MediaServiceCatalogItem,
  CategoriaMidiaRepresentacao,
  TipoCobrancaRepresentacao,
  CATEGORIAS_MIDIA_CONFIG,
  TIPOS_COBRANCA_LABELS,
} from "@/types/representacao-comercial.types";
import { MediaServiceFormDialog } from "@/components/MediaServiceFormDialog";
import { SimuladorPropostaModal } from "@/components/simulador/SimuladorPropostaModal";
import { LocationPickerMap } from "@/components/LocationPickerMap";
import { useUserRoles } from "@/hooks/use-roles";
import { cn } from "@/lib/utils";

interface CatalogoEspacosTabProps {
  initialPartnerId?: string;
}

export function CatalogoEspacosTab({ initialPartnerId }: CatalogoEspacosTabProps) {
  const qc = useQueryClient();
  const { isAdmin, can, hasPermission } = useUserRoles();
  const canManage = isAdmin || can("/produtos") || hasPermission("module.produtos");

  // Server functions
  const fetchCatalogFn = useServerFn(listMediaCatalog);
  const deleteCatalogFn = useServerFn(deleteMediaCatalogItem);
  const fetchPartnersFn = useServerFn(listPartners);

  // Queries
  const { data: catalogItems = [], isLoading: isLoadingCatalog } = useQuery({
    queryKey: ["media_services_catalog"],
    queryFn: () => fetchCatalogFn({ data: {} }),
  });

  const { data: partners = [] } = useQuery({
    queryKey: ["partners_list"],
    queryFn: () => fetchPartnersFn({ data: {} }),
  });

  // UI States
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MediaServiceCatalogItem | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Map preview modal
  const [mapModalItem, setMapModalItem] = useState<MediaServiceCatalogItem | null>(null);

  // Simulator State
  const [simuladorOpen, setSimuladorOpen] = useState(false);
  const [simulandoItem, setSimulandoItem] = useState<MediaServiceCatalogItem | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedCategoria, setSelectedCategoria] = useState<string>("all");
  const [selectedOrigem, setSelectedOrigem] = useState<"all" | "proprio" | "parceiro">("all");
  const [selectedPartner, setSelectedPartner] = useState<string>(initialPartnerId || "all");
  const [selectedCobranca, setSelectedCobranca] = useState<string>("all");
  const [selectedUF, setSelectedUF] = useState<string>("all");

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCatalogFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["media_services_catalog"] });
      qc.invalidateQueries({ queryKey: ["produtos"] });
      toast.success("Espaço / serviço removido com sucesso");
      setDeleteConfirmId(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao remover item");
    },
  });

  // Unique UFs list from items
  const availableUFs = useMemo(() => {
    const set = new Set<string>();
    catalogItems.forEach((item) => {
      if (item.estado) set.add(item.estado.toUpperCase().trim());
    });
    return Array.from(set).sort();
  }, [catalogItems]);

  // Filtered Items
  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return catalogItems.filter((item) => {
      // Categoria
      if (selectedCategoria !== "all" && item.categoria_midia !== selectedCategoria) {
        return false;
      }
      // Origem
      if (selectedOrigem === "proprio" && !item.is_own_product) return false;
      if (selectedOrigem === "parceiro" && item.is_own_product) return false;

      // Parceiro
      if (selectedPartner !== "all" && item.partner_id !== selectedPartner) {
        return false;
      }

      // Cobranca
      if (selectedCobranca !== "all" && item.tipo_cobranca !== selectedCobranca) {
        return false;
      }

      // UF
      if (selectedUF !== "all" && item.estado?.toUpperCase() !== selectedUF) {
        return false;
      }

      // Busca textual
      if (!q) return true;
      const haystack = [
        item.nome_produto,
        item.descricao,
        item.partner?.nome_fantasia,
        item.partner?.razao_social,
        item.cidade,
        item.estado,
        item.bairro,
        item.tipo_cobranca,
        item.especificacoes_tecnicas?.formato,
        item.especificacoes_tecnicas?.resolucao,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [
    catalogItems,
    search,
    selectedCategoria,
    selectedOrigem,
    selectedPartner,
    selectedCobranca,
    selectedUF,
  ]);

  // Statistics
  const stats = useMemo(() => {
    const total = catalogItems.length;
    const proprios = catalogItems.filter((i) => i.is_own_product).length;
    const parceiros = catalogItems.filter((i) => !i.is_own_product).length;

    const commissions = catalogItems
      .filter((i) => !i.is_own_product)
      .map((i) => i.comissao_percentual_especifica ?? i.partner?.comissao_padrao_percentual ?? 0);

    const avgCommission =
      commissions.length > 0
        ? commissions.reduce((acc, v) => acc + v, 0) / commissions.length
        : 0;

    return { total, proprios, parceiros, avgCommission };
  }, [catalogItems]);

  const resetFilters = () => {
    setSearch("");
    setSelectedCategoria("all");
    setSelectedOrigem("all");
    setSelectedPartner("all");
    setSelectedCobranca("all");
    setSelectedUF("all");
  };

  const hasActiveFilters =
    search !== "" ||
    selectedCategoria !== "all" ||
    selectedOrigem !== "all" ||
    selectedPartner !== "all" ||
    selectedCobranca !== "all" ||
    selectedUF !== "all";

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card/70 border-border/80 backdrop-blur-sm shadow-sm hover:shadow transition-shadow">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Total de Espaços
              </p>
              <h3 className="text-2xl font-bold mt-1 text-foreground">{stats.total}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Itens no catálogo ativo</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-amber-50/40 dark:bg-amber-950/20 border-amber-200/60 dark:border-amber-900/50 backdrop-blur-sm shadow-sm hover:shadow transition-shadow">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                Soluções Próprias
              </p>
              <h3 className="text-2xl font-bold mt-1 text-amber-900 dark:text-amber-200">
                {stats.proprios}
              </h3>
              <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-0.5">
                Hub In-House (100% margem)
              </p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-purple-50/40 dark:bg-purple-950/20 border-purple-200/60 dark:border-purple-900/50 backdrop-blur-sm shadow-sm hover:shadow transition-shadow">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-purple-700 dark:text-purple-400 uppercase tracking-wider">
                Veículos Representados
              </p>
              <h3 className="text-2xl font-bold mt-1 text-purple-900 dark:text-purple-200">
                {stats.parceiros}
              </h3>
              <p className="text-xs text-purple-700/80 dark:text-purple-400/80 mt-0.5">
                Espaços de terceiros
              </p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Handshake className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-900/50 backdrop-blur-sm shadow-sm hover:shadow transition-shadow">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                Comissão Média
              </p>
              <h3 className="text-2xl font-bold mt-1 text-emerald-900 dark:text-emerald-200">
                {stats.avgCommission.toFixed(1)}%
              </h3>
              <p className="text-xs text-emerald-700/80 dark:text-emerald-400/80 mt-0.5">
                Repasse médio de parceiros
              </p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Actions Bar */}
      <Card className="border-border/80 shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, formato, veículo parceiro ou cidade…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-background"
              />
            </div>

            <div className="flex items-center gap-2">
              {/* View mode toggle */}
              <div className="flex items-center border rounded-lg p-0.5 bg-muted/40">
                <Button
                  size="sm"
                  variant={viewMode === "grid" ? "secondary" : "ghost"}
                  className="h-8 px-2.5"
                  onClick={() => setViewMode("grid")}
                  title="Visualização em Cards"
                >
                  <LayoutGrid className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === "table" ? "secondary" : "ghost"}
                  className="h-8 px-2.5"
                  onClick={() => setViewMode("table")}
                  title="Visualização em Tabela"
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>

              <Button
                onClick={() => {
                  setSimulandoItem(null);
                  setSimuladorOpen(true);
                }}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
              >
                <Calculator className="w-4 h-4" />
                Simulador de Propostas
              </Button>

              {canManage && (
                <Button
                  onClick={() => {
                    setEditingItem(null);
                    setFormOpen(true);
                  }}
                  className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  Novo Espaço / Serviço
                </Button>
              )}
            </div>
          </div>

          {/* Advanced Filter Row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 pt-1 border-t border-border/50">
            {/* Categoria de Mídia */}
            <Select value={selectedCategoria} onValueChange={setSelectedCategoria}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Categoria de Mídia" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Mídias</SelectItem>
                {Object.entries(CATEGORIAS_MIDIA_CONFIG).map(([key, cfg]) => (
                  <SelectItem key={key} value={key}>
                    {cfg.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Origem (Próprio vs Parceiro) */}
            <Select
              value={selectedOrigem}
              onValueChange={(v) => setSelectedOrigem(v as "all" | "proprio" | "parceiro")}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Origem" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Origens</SelectItem>
                <SelectItem value="proprio">⭐ Produto Próprio</SelectItem>
                <SelectItem value="parceiro">🤝 Veículo Parceiro</SelectItem>
              </SelectContent>
            </Select>

            {/* Veículo Parceiro */}
            <Select value={selectedPartner} onValueChange={setSelectedPartner}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Veículo Parceiro" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Veículos</SelectItem>
                {partners.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nome_fantasia || p.razao_social}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Tipo de Cobrança */}
            <Select value={selectedCobranca} onValueChange={setSelectedCobranca}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Tipo de Cobrança" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Modelos</SelectItem>
                {Object.entries(TIPOS_COBRANCA_LABELS).map(([k, label]) => (
                  <SelectItem key={k} value={k}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* UF / Estado */}
            <Select value={selectedUF} onValueChange={setSelectedUF}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Localização (UF)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Estados</SelectItem>
                {availableUFs.map((uf) => (
                  <SelectItem key={uf} value={uf}>
                    {uf}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {hasActiveFilters && (
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
              <span>
                Exibindo {filteredItems.length} de {catalogItems.length} espaços encontrados
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10"
              >
                <X className="w-3.5 h-3.5 mr-1" />
                Limpar filtros
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Content Area */}
      {isLoadingCatalog ? (
        <div className="py-20 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm">Carregando catálogo de espaços publicitários...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <Card className="border-dashed border-2 py-16 text-center">
          <CardContent className="flex flex-col items-center justify-center max-w-md mx-auto space-y-3">
            <div className="w-14 h-14 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground">
              <Layers className="w-7 h-7" />
            </div>
            <h4 className="text-lg font-semibold text-foreground">Nenhum espaço encontrado</h4>
            <p className="text-sm text-muted-foreground">
              {hasActiveFilters
                ? "Tente ajustar os filtros selecionados ou o termo pesquisado."
                : "Seu catálogo está vazio. Comece cadastrando um espaço publicitário de um veículo parceiro ou um produto próprio."}
            </p>
            {hasActiveFilters ? (
              <Button variant="outline" size="sm" onClick={resetFilters}>
                Limpar Filtros
              </Button>
            ) : (
              canManage && (
                <Button
                  onClick={() => {
                    setEditingItem(null);
                    setFormOpen(true);
                  }}
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Cadastrar Primeiro Espaço
                </Button>
              )
            )}
          </CardContent>
        </Card>
      ) : viewMode === "grid" ? (
        /* GRID DE CARDS MODERNOS */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredItems.map((item) => (
            <CatalogItemCard
              key={item.id}
              item={item}
              canManage={canManage}
              onEdit={() => {
                setEditingItem(item);
                setFormOpen(true);
              }}
              onDelete={() => setDeleteConfirmId(item.id)}
              onOpenMap={() => setMapModalItem(item)}
              onSimulate={() => {
                setSimulandoItem(item);
                setSimuladorOpen(true);
              }}
            />
          ))}
        </div>
      ) : (
        /* TABELA COMPACTA */
        <Card className="border-border/80 shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="w-[80px]">Mídia</TableHead>
                <TableHead>Nome do Espaço / Produto</TableHead>
                <TableHead>Origem / Veículo</TableHead>
                <TableHead>Cobrança</TableHead>
                <TableHead className="text-right">Tabela</TableHead>
                <TableHead className="text-right">Mínimo</TableHead>
                <TableHead>Localização</TableHead>
                <TableHead className="text-center w-[130px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((item) => (
                <CatalogItemTableRow
                  key={item.id}
                  item={item}
                  canManage={canManage}
                  onEdit={() => {
                    setEditingItem(item);
                    setFormOpen(true);
                  }}
                  onDelete={() => setDeleteConfirmId(item.id)}
                  onOpenMap={() => setMapModalItem(item)}
                  onSimulate={() => {
                    setSimulandoItem(item);
                    setSimuladorOpen(true);
                  }}
                />
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Modal de Criação / Edição */}
      <MediaServiceFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editingItem={editingItem}
        partners={partners}
        onSuccess={() => {
          qc.invalidateQueries({ queryKey: ["media_services_catalog"] });
          qc.invalidateQueries({ queryKey: ["produtos"] });
        }}
      />

      {/* Modal de Confirmação de Exclusão */}
      <Dialog
        open={!!deleteConfirmId}
        onOpenChange={(op) => !op && setDeleteConfirmId(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" />
              Confirmar Exclusão
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover este espaço publicitário do catálogo? O histórico
              será preservado com segurança na lixeira do sistema.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmId(null)}
              disabled={deleteMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && deleteMutation.mutate(deleteConfirmId)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Excluindo..." : "Sim, Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Visualização no Mapa */}
      <Dialog open={!!mapModalItem} onOpenChange={(op) => !op && setMapModalItem(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              {mapModalItem?.nome_produto}
            </DialogTitle>
            <DialogDescription>
              {mapModalItem?.endereco
                ? `${mapModalItem.endereco}, ${mapModalItem.bairro || ""} — ${mapModalItem.cidade || ""}/${mapModalItem.estado || ""}`
                : "Localização geográfica do espaço publicitário"}
            </DialogDescription>
          </DialogHeader>

          {mapModalItem?.latitude && mapModalItem?.longitude ? (
            <div className="space-y-3">
              <div className="rounded-lg overflow-hidden border">
                <LocationPickerMap
                  latitude={mapModalItem.latitude}
                  longitude={mapModalItem.longitude}
                  onChange={() => {}}
                  height={320}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                <span>
                  Coordenadas: {mapModalItem.latitude.toFixed(6)},{" "}
                  {mapModalItem.longitude.toFixed(6)}
                </span>
                <a
                  href={`https://www.google.com/maps?q=${mapModalItem.latitude},${mapModalItem.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline flex items-center gap-1 font-medium"
                >
                  Abrir no Google Maps
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              Coordenadas geográficas não configuradas para este espaço.
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setMapModalItem(null)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal do Simulador de Propostas */}
      <SimuladorPropostaModal
        open={simuladorOpen}
        onOpenChange={setSimuladorOpen}
        initialCatalogItem={simulandoItem}
      />
    </div>
  );
}

/* ========================================================================= */
/* COMPONENTE: CARD DO ITEM NO CATÁLOGO                                      */
/* ========================================================================= */
function CatalogItemCard({
  item,
  canManage,
  onEdit,
  onDelete,
  onOpenMap,
  onSimulate,
}: {
  item: MediaServiceCatalogItem;
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onOpenMap: () => void;
  onSimulate: () => void;
}) {
  const catConfig = CATEGORIAS_MIDIA_CONFIG[item.categoria_midia] || {
    label: item.categoria_midia,
    color: "bg-slate-500",
  };

  const fotoPrincipal = item.imagem_url || item.fotos?.[0];
  const comissao =
    item.comissao_percentual_especifica ?? item.partner?.comissao_padrao_percentual ?? 0;

  const hasLocation =
    (item.latitude != null && item.longitude != null) || Boolean(item.cidade || item.endereco);

  return (
    <Card className="group relative flex flex-col overflow-hidden border border-border/80 hover:border-primary/40 hover:shadow-lg transition-all duration-200 bg-card">
      {/* Top Banner / Foto */}
      <div className="relative h-44 w-full bg-muted/60 overflow-hidden flex items-center justify-center">
        {fotoPrincipal ? (
          <img
            src={fotoPrincipal}
            alt={item.nome_produto}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-muted/80 to-muted/30 text-muted-foreground/60 p-4">
            <Layers className="w-10 h-10 mb-1 stroke-1" />
            <span className="text-xs font-medium uppercase tracking-wider">{catConfig.label}</span>
          </div>
        )}

        {/* Categoria Badge (Top Left) */}
        <div className="absolute top-2.5 left-2.5">
          <Badge
            className={cn(
              "text-[10px] font-semibold text-white px-2 py-0.5 shadow-sm border-0",
              catConfig.color,
            )}
          >
            {catConfig.label}
          </Badge>
        </div>

        {/* Origem Badge (Top Right) */}
        <div className="absolute top-2.5 right-2.5">
          {item.is_own_product ? (
            <Badge className="bg-amber-600/95 hover:bg-amber-600 text-white text-[10px] font-semibold shadow-sm border-0 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Produto Próprio
            </Badge>
          ) : (
            <Badge className="bg-purple-700/95 hover:bg-purple-700 text-white text-[10px] font-semibold shadow-sm border-0 flex items-center gap-1">
              <Handshake className="w-3 h-3" />
              Veículo: {item.partner?.nome_fantasia || item.partner?.razao_social || "Parceiro"} •{" "}
              {comissao}% comissão
            </Badge>
          )}
        </div>

        {/* Modelo de cobrança pill (Bottom Left) */}
        <div className="absolute bottom-2.5 left-2.5">
          <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-black/60 text-white backdrop-blur-sm">
            {TIPOS_COBRANCA_LABELS[item.tipo_cobranca] || item.tipo_cobranca}
          </span>
        </div>
      </div>

      {/* Body Content */}
      <CardContent className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div className="space-y-2">
          {/* Título */}
          <h4
            className="font-semibold text-base text-foreground line-clamp-1 group-hover:text-primary transition-colors"
            title={item.nome_produto}
          >
            {item.nome_produto}
          </h4>

          {/* Descrição resumida */}
          {item.descricao && (
            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
              {item.descricao}
            </p>
          )}

          {/* Especificações Técnicas */}
          {item.especificacoes_tecnicas && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {item.especificacoes_tecnicas.formato && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                  {item.especificacoes_tecnicas.formato}
                </span>
              )}
              {item.especificacoes_tecnicas.resolucao && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                  {item.especificacoes_tecnicas.resolucao}
                </span>
              )}
              {item.especificacoes_tecnicas.dimensoes && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                  {item.especificacoes_tecnicas.dimensoes}
                </span>
              )}
            </div>
          )}

          {/* Localização / Mapa */}
          {hasLocation && (
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/40">
              <span className="flex items-center gap-1 truncate max-w-[200px]" title={item.endereco || ""}>
                <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                {item.cidade ? `${item.cidade}${item.estado ? `/${item.estado}` : ""}` : item.endereco}
              </span>
              {item.latitude && item.longitude && (
                <button
                  type="button"
                  onClick={onOpenMap}
                  className="text-xs text-primary hover:underline font-medium inline-flex items-center gap-0.5"
                >
                  Ver mapa
                </button>
              )}
            </div>
          )}
        </div>

        {/* Pricing Block & Footer */}
        <div className="pt-3 border-t border-border/50 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-muted-foreground uppercase font-medium block">
              Valor de Tabela
            </span>
            <div className="text-base font-bold text-foreground">
              {item.valor_tabela ? formatBRL(item.valor_tabela) : "Sob Consulta"}
            </div>
            {item.valor_negociado_minimo && (
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                Mín: {formatBRL(item.valor_negociado_minimo)}
              </span>
            )}
          </div>

          {/* Ações */}
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2 text-xs gap-1 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
              onClick={onSimulate}
              title="Simular Proposta com este Espaço"
            >
              <Calculator className="w-3.5 h-3.5" />
              Simular
            </Button>

            {canManage && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:bg-muted"
                  onClick={onEdit}
                  title="Editar Espaço"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:bg-destructive/10"
                  onClick={onDelete}
                  title="Remover Espaço"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ========================================================================= */
/* COMPONENTE: LINHA NA TABELA DE ESPAÇOS                                    */
/* ========================================================================= */
function CatalogItemTableRow({
  item,
  canManage,
  onEdit,
  onDelete,
  onOpenMap,
  onSimulate,
}: {
  item: MediaServiceCatalogItem;
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onOpenMap: () => void;
  onSimulate: () => void;
}) {
  const catConfig = CATEGORIAS_MIDIA_CONFIG[item.categoria_midia] || {
    label: item.categoria_midia,
    color: "bg-slate-500",
  };

  const comissao =
    item.comissao_percentual_especifica ?? item.partner?.comissao_padrao_percentual ?? 0;

  return (
    <TableRow className="hover:bg-muted/30">
      <TableCell>
        <Badge
          className={cn(
            "text-[10px] font-semibold text-white px-1.5 py-0.5 border-0",
            catConfig.color,
          )}
        >
          {catConfig.label}
        </Badge>
      </TableCell>
      <TableCell className="font-medium">
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-foreground">{item.nome_produto}</span>
          {item.descricao && (
            <span className="text-xs text-muted-foreground truncate max-w-xs">
              {item.descricao}
            </span>
          )}
        </div>
      </TableCell>
      <TableCell>
        {item.is_own_product ? (
          <Badge className="bg-amber-600/90 text-white text-[10px] font-medium border-0 flex items-center gap-1 w-fit">
            <Sparkles className="w-3 h-3" />
            Produto Próprio
          </Badge>
        ) : (
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-foreground">
              {item.partner?.nome_fantasia || item.partner?.razao_social || "Veículo Parceiro"}
            </span>
            <span className="text-[10px] text-purple-700 dark:text-purple-400 font-medium">
              {comissao}% comissão
            </span>
          </div>
        )}
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {TIPOS_COBRANCA_LABELS[item.tipo_cobranca] || item.tipo_cobranca}
      </TableCell>
      <TableCell className="text-right font-bold text-sm">
        {item.valor_tabela ? formatBRL(item.valor_tabela) : "—"}
      </TableCell>
      <TableCell className="text-right text-xs text-emerald-600 dark:text-emerald-400 font-medium">
        {item.valor_negociado_minimo ? formatBRL(item.valor_negociado_minimo) : "—"}
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {item.cidade ? (
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3 text-primary shrink-0" />
            {item.cidade}/{item.estado || ""}
            {item.latitude && item.longitude && (
              <button
                type="button"
                onClick={onOpenMap}
                className="text-[10px] text-primary hover:underline ml-1 font-medium"
              >
                (mapa)
              </button>
            )}
          </span>
        ) : (
          "—"
        )}
      </TableCell>
      <TableCell className="text-center">
        <div className="flex items-center justify-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
            onClick={onSimulate}
            title="Simular Proposta"
          >
            <Calculator className="w-3.5 h-3.5" />
          </Button>

          {canManage && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={onEdit}
                title="Editar"
              >
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:bg-destructive/10"
                onClick={onDelete}
                title="Remover"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}
