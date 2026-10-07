import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { listPublicInventoryAssets } from "@/lib/public-inventory.functions";
import type { PublicAsset, StatusDisponibilidade } from "@/types/public-inventory.types";
import { CATEGORIAS_CORES } from "@/types/public-inventory.types";
import { FluxOohMap } from "@/components/inventory/FluxOohMap";
import { FluxAssetCard } from "@/components/inventory/FluxAssetCard";
import { FluxAssetDetailModal } from "@/components/inventory/FluxAssetDetailModal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Filter,
  X,
  MapPin,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Radio,
  Layers,
  RefreshCw,
  SlidersHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface FluxOohSplitScreenProps {
  initialSearch?: string;
  initialCidade?: string;
  initialMidia?: string;
  initialStatus?: string;
  initialAtivoId?: string;
  className?: string;
  onShareLink?: () => void;
}

export function FluxOohSplitScreen({
  initialSearch = "",
  initialCidade = "todas",
  initialMidia = "todas",
  initialStatus = "todos",
  initialAtivoId,
  className,
}: FluxOohSplitScreenProps) {
  const qc = useQueryClient();
  const fetchAssetsFn = useServerFn(listPublicInventoryAssets);

  // Estados dos filtros
  const [busca, setBusca] = useState(initialSearch);
  const [cidade, setCidade] = useState(initialCidade);
  const [midia, setMidia] = useState(initialMidia);
  const [status, setStatus] = useState(initialStatus);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(initialAtivoId || null);

  // Estados de interface
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(true);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [modalAsset, setModalAsset] = useState<PublicAsset | null>(null);
  const [isRealtimeActive, setIsRealtimeActive] = useState(false);

  // Consulta de dados com TanStack Query
  const { data: rawAssets = [], isLoading, isRefetching } = useQuery({
    queryKey: ["public_inventory_assets"],
    queryFn: () => fetchAssetsFn({ data: {} }),
    staleTime: 60 * 1000,
  });

  // Listener do Supabase Realtime (Sincronização instantânea ao vivo)
  useEffect(() => {
    const channel = supabase
      .channel("public-inventory-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "produtos" },
        (payload) => {
          qc.invalidateQueries({ queryKey: ["public_inventory_assets"] });
          toast.info("Inventário de mídia atualizado em tempo real!", {
            duration: 3000,
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "media_services_catalog" },
        (payload) => {
          qc.invalidateQueries({ queryKey: ["public_inventory_assets"] });
          toast.info("Catálogo de espaços atualizado em tempo real!", {
            duration: 3000,
          });
        },
      )
      .subscribe((status) => {
        setIsRealtimeActive(status === "SUBSCRIBED");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  // Lista dinâmica de cidades únicas disponíveis
  const availableCidades = useMemo(() => {
    const set = new Set<string>();
    rawAssets.forEach((a) => {
      if (a.cidade) set.add(a.cidade.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [rawAssets]);

  // Filtragem dos ativos em memória
  const filteredAssets = useMemo(() => {
    return rawAssets.filter((item) => {
      // Filtro de busca textual
      if (busca.trim()) {
        const q = busca.trim().toLowerCase();
        const haystack = [
          item.nome_ponto,
          item.codigo_ativo,
          item.endereco,
          item.bairro,
          item.cidade,
          item.tipo_midia,
          item.formato,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!haystack.includes(q)) return false;
      }

      // Filtro de cidade
      if (cidade !== "todas" && item.cidade.toLowerCase() !== cidade.toLowerCase()) {
        return false;
      }

      // Filtro de mídia
      if (midia !== "todas") {
        if (
          item.categoria_slug !== midia &&
          !item.tipo_midia.toLowerCase().includes(midia.toLowerCase())
        ) {
          return false;
        }
      }

      // Filtro de status
      if (status !== "todos" && item.status_disponibilidade !== status) {
        return false;
      }

      return true;
    });
  }, [rawAssets, busca, cidade, midia, status]);

  // Sincroniza query params na URL para compartilhamento de seleções
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);

    if (busca) url.searchParams.set("busca", busca);
    else url.searchParams.delete("busca");

    if (cidade !== "todas") url.searchParams.set("cidade", cidade);
    else url.searchParams.delete("cidade");

    if (midia !== "todas") url.searchParams.set("midia", midia);
    else url.searchParams.delete("midia");

    if (status !== "todos") url.searchParams.set("status", status);
    else url.searchParams.delete("status");

    if (selectedAssetId) url.searchParams.set("ativoId", selectedAssetId);
    else url.searchParams.delete("ativoId");

    window.history.replaceState({}, "", url.toString());
  }, [busca, cidade, midia, status, selectedAssetId]);

  // Foco no card quando selecionado no mapa
  const handleSelectAsset = useCallback((asset: PublicAsset) => {
    setSelectedAssetId(asset.id);
    const cardEl = document.getElementById(`asset-card-${asset.id}`);
    if (cardEl) {
      cardEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, []);

  const handleViewDetails = useCallback((asset: PublicAsset) => {
    setModalAsset(asset);
    setDetailModalOpen(true);
  }, []);

  const handleResetFilters = () => {
    setBusca("");
    setCidade("todas");
    setMidia("todas");
    setStatus("todos");
  };

  const hasActiveFilters =
    busca.trim() !== "" || cidade !== "todas" || midia !== "todas" || status !== "todos";

  // Total de cidades únicas com pontos filtrados
  const cidadesFiltradasCount = useMemo(() => {
    return new Set(filteredAssets.map((a) => a.cidade)).size;
  }, [filteredAssets]);

  return (
    <div
      className={cn(
        "relative w-full h-[calc(100vh-64px)] flex flex-col md:flex-row overflow-hidden bg-background",
        className,
      )}
    >
      {/* =========================================================================
          PAINEL LATERAL ESQUERDO (DESKTOP: Gaveta Retrátil ~420px)
         ========================================================================= */}
      <aside
        className={cn(
          "hidden md:flex flex-col z-20 bg-card border-r border-border transition-all duration-300 relative shadow-lg",
          sidebarCollapsed ? "w-0 min-w-0 overflow-hidden border-none" : "w-[420px] lg:w-[460px] flex-shrink-0",
        )}
      >
        {/* Topo do painel: Busca e Filtros Rápidos */}
        <div className="p-4 border-b border-border bg-card/95 backdrop-blur-md space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold tracking-tight text-foreground flex items-center gap-2">
                <span>Inventário OOH</span>
                <span className="text-xs font-normal text-muted-foreground">| Vitrine</span>
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Explore os pontos e consulte disponibilidades em tempo real.
              </p>
            </div>

            {/* Status Realtime */}
            <div
              className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20"
              title="Conectado ao Supabase Realtime para atualizações instantâneas"
            >
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Ao vivo</span>
            </div>
          </div>

          {/* Campo de Busca Textual */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por código, ponto, rua ou bairro…"
              className="pl-9 pr-8 h-9 text-xs rounded-lg bg-muted/40 focus:bg-background"
            />
            {busca && (
              <button
                type="button"
                onClick={() => setBusca("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Linha de Filtros Dinâmicos */}
          <div className="grid grid-cols-2 gap-2">
            {/* Cidade / Praça */}
            <Select value={cidade} onValueChange={setCidade}>
              <SelectTrigger className="h-8 text-xs bg-muted/30">
                <SelectValue placeholder="Cidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as Cidades</SelectItem>
                {availableCidades.map((cid) => (
                  <SelectItem key={cid} value={cid}>
                    {cid}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Disponibilidade */}
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-8 text-xs bg-muted/30">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Status</SelectItem>
                <SelectItem value="Disponível">🟢 Disponíveis</SelectItem>
                <SelectItem value="Reservado">🟡 Reservados</SelectItem>
                <SelectItem value="Ocupado">🔴 Ocupados</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Chips de Categoria de Mídia */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 scrollbar-none">
            <button
              type="button"
              onClick={() => setMidia("todas")}
              className={cn(
                "px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap border transition-all",
                midia === "todas"
                  ? "bg-primary text-primary-foreground border-primary shadow-xs"
                  : "bg-muted/40 text-muted-foreground border-border hover:bg-muted",
              )}
            >
              Todas
            </button>
            {Object.entries(CATEGORIAS_CORES).map(([slug, cfg]) => {
              const active = midia === slug;
              return (
                <button
                  key={slug}
                  type="button"
                  onClick={() => setMidia(active ? "todas" : slug)}
                  className={cn(
                    "px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap border transition-all flex items-center gap-1.5",
                    active
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-muted/40 text-muted-foreground border-border hover:bg-muted",
                  )}
                >
                  <span className={cn("size-1.5 rounded-full", cfg.dotClass)} />
                  <span>{cfg.label.split("/")[0].trim()}</span>
                </button>
              );
            })}
          </div>

          {/* Contador Dinâmico de Resultados & Limpar Filtros */}
          <div className="flex items-center justify-between pt-1 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">
              <strong>{filteredAssets.length}</strong> {filteredAssets.length === 1 ? "face disponível" : "faces disponíveis"} em{" "}
              <strong>{cidadesFiltradasCount}</strong> {cidadesFiltradasCount === 1 ? "cidade" : "cidades"}
            </span>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
              >
                <X className="size-3" />
                <span>Limpar</span>
              </button>
            )}
          </div>
        </div>

        {/* Lista com Rolagem Suave dos Cards */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5 scrollbar-thin">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center text-center text-muted-foreground">
              <RefreshCw className="size-8 animate-spin text-primary mb-3" />
              <p className="text-sm font-semibold">Carregando inventário georreferenciado…</p>
            </div>
          ) : filteredAssets.length === 0 ? (
            <div className="py-16 px-4 text-center text-muted-foreground border border-dashed rounded-xl bg-muted/20">
              <Sparkles className="size-8 mx-auto mb-2 text-muted-foreground/40" />
              <h4 className="text-sm font-bold text-foreground">Nenhum ponto encontrado</h4>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                Não encontramos faces que atendam a esses filtros. Tente buscar por outros termos ou limpar a seleção.
              </p>
              {hasActiveFilters && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleResetFilters}
                  className="mt-3 text-xs h-8"
                >
                  Limpar todos os filtros
                </Button>
              )}
            </div>
          ) : (
            filteredAssets.map((asset) => (
              <FluxAssetCard
                key={asset.id}
                asset={asset}
                isSelected={selectedAssetId === asset.id}
                onSelect={handleSelectAsset}
                onViewDetails={handleViewDetails}
              />
            ))
          )}
        </div>
      </aside>

      {/* Botão Retrátil de Toggle da Barra Lateral no Desktop */}
      <button
        type="button"
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        className="hidden md:flex absolute top-5 z-30 bg-background/90 backdrop-blur-md border border-border shadow-md rounded-r-lg p-1 text-muted-foreground hover:text-foreground transition-all"
        style={{ left: sidebarCollapsed ? 0 : "420px" }}
        title={sidebarCollapsed ? "Expandir lista de ativos" : "Recolher lista (Modo Mapa Cheio)"}
      >
        {sidebarCollapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
      </button>

      {/* =========================================================================
          ÁREA PRINCIPAL: MAPA INTERATIVO (100% DA VIEWPORT RESTANTE)
         ========================================================================= */}
      <main className="flex-1 relative w-full h-full overflow-hidden">
        <FluxOohMap
          assets={filteredAssets}
          selectedAssetId={selectedAssetId}
          onSelectAsset={handleSelectAsset}
          onViewDetails={handleViewDetails}
          className="w-full h-full"
        />

        {/* =========================================================================
            MOBILE: DRAWER INFERIOR / BOTTOM-SHEET RETRÁTIL
           ========================================================================= */}
        <div className="md:hidden absolute inset-x-0 bottom-0 z-30 bg-card/95 backdrop-blur-md border-t border-border shadow-2xl transition-all duration-300">
          <div
            className="flex items-center justify-between p-3 border-b border-border/50 cursor-pointer"
            onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
          >
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-foreground">
                {filteredAssets.length} faces encontradas
              </span>
            </div>
            <Button size="icon" variant="ghost" className="size-7">
              {mobileDrawerOpen ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
            </Button>
          </div>

          {mobileDrawerOpen && (
            <div className="max-h-[45vh] overflow-y-auto p-3 space-y-2.5">
              {/* Filtro rápido mobile */}
              <div className="flex gap-2 mb-2">
                <Input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar pontos…"
                  className="h-8 text-xs"
                />
                {hasActiveFilters && (
                  <Button size="sm" variant="ghost" onClick={handleResetFilters} className="h-8 px-2 text-xs">
                    Limpar
                  </Button>
                )}
              </div>

              {filteredAssets.map((asset) => (
                <FluxAssetCard
                  key={asset.id}
                  asset={asset}
                  isSelected={selectedAssetId === asset.id}
                  onSelect={(a) => {
                    handleSelectAsset(a);
                    setMobileDrawerOpen(false); // Fecha drawer para ver o mapa
                  }}
                  onViewDetails={handleViewDetails}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Modal de Detalhes Completo White-Label */}
      <FluxAssetDetailModal
        asset={modalAsset}
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        onFocusOnMap={handleSelectAsset}
      />
    </div>
  );
}
