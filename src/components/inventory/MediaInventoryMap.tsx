import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import type { Produto } from "@/components/ProdutoFormDialog";
import { ProdutoFotoImg } from "@/components/ProdutoFotoImg";
import { formatBRL } from "@/lib/mock-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MapPin,
  ExternalLink,
  Layers,
  Sparkles,
  Maximize2,
  Camera,
  Navigation,
  Pencil,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  Ban,
  TrendingUp,
  Users,
  Handshake,
  X,
  Compass,
  ChevronLeft,
  ChevronRight,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MediaInventoryMapProps {
  produtos: Produto[];
  selectedProdutoId?: string | null;
  onSelectProduto?: (produto: Produto) => void;
  onEditProduto?: (produto: Produto) => void;
  onOpenGallery?: (fotos: string[], titulo: string) => void;
  className?: string;
}

declare global {
  interface Window {
    L?: any;
    __leafletPromise?: Promise<any>;
  }
}

function loadLeaflet(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.L) return Promise.resolve(window.L);
  if (window.__leafletPromise) return window.__leafletPromise;

  window.__leafletPromise = new Promise((resolve, reject) => {
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.async = true;
    script.onload = () => resolve(window.L);
    script.onerror = () => reject(new Error("Falha ao carregar Leaflet"));
    document.head.appendChild(script);
  });
  return window.__leafletPromise;
}

type MapLayerStyle = "google_traffic" | "google_hybrid" | "google_streets" | "osm";

export function MediaInventoryMap({
  produtos,
  selectedProdutoId,
  onSelectProduto,
  onEditProduto,
  onOpenGallery,
  className,
}: MediaInventoryMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const markersGroupRef = useRef<any>(null);
  const isMountedRef = useRef(true);

  const [mapReady, setMapReady] = useState(false);
  const [mapStyle, setMapStyle] = useState<MapLayerStyle>("google_streets");
  const [activeProduto, setActiveProduto] = useState<Produto | null>(null);
  const [search, setSearch] = useState("");
  const [statusFiltro, setStatusFiltro] = useState<string>("all");
  const [midiaFiltro, setMidiaFiltro] = useState<string>("all");
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  // Filtrar produtos com coordenadas GPS válidas
  const produtosComCoords = useMemo(() => {
    return produtos.filter(
      (p) =>
        p.latitude != null &&
        p.longitude != null &&
        !isNaN(Number(p.latitude)) &&
        !isNaN(Number(p.longitude)) &&
        Number(p.latitude) !== 0 &&
        Number(p.longitude) !== 0
    );
  }, [produtos]);

  // Lista de produtos filtrada para exibição no mapa
  const produtosFiltrados = useMemo(() => {
    return produtosComCoords.filter((p) => {
      if (statusFiltro !== "all") {
        const status = String(p.status_operacional || "disponivel").toLowerCase();
        if (statusFiltro === "disponivel" && !status.includes("disponivel")) return false;
        if (statusFiltro === "reservado" && !status.includes("reserv")) return false;
        if (statusFiltro === "em_veiculacao" && !status.includes("veicul")) return false;
        if (statusFiltro === "bloqueado" && !status.includes("bloque") && p.ativo !== false) return false;
      }

      if (midiaFiltro !== "all" && p.midia !== midiaFiltro) {
        return false;
      }

      if (search.trim()) {
        const q = search.toLowerCase();
        const texto = `${p.nome} ${p.tipo} ${p.midia} ${p.endereco_ponto || ""} ${p.bairro || ""} ${p.parceiro_nome || ""}`.toLowerCase();
        if (!texto.includes(q)) return false;
      }

      return true;
    });
  }, [produtosComCoords, statusFiltro, midiaFiltro, search]);

  // Criar tile layer correspondente ao estilo escolhido
  const createTileLayer = useCallback((L: any, style: MapLayerStyle) => {
    switch (style) {
      case "google_traffic":
        return L.tileLayer("https://mt{s}.google.com/vt/lyrs=m,traffic&x={x}&y={y}&z={z}", {
          maxZoom: 20,
          subdomains: ["0", "1", "2", "3"],
          attribution: "© Google Maps Tráfego",
        });
      case "google_hybrid":
        return L.tileLayer("https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}", {
          maxZoom: 20,
          subdomains: ["0", "1", "2", "3"],
          attribution: "© Google Satélite / Híbrido",
        });
      case "google_streets":
        return L.tileLayer("https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", {
          maxZoom: 20,
          subdomains: ["0", "1", "2", "3"],
          attribution: "© Google Maps",
        });
      case "osm":
      default:
        return L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: "© OpenStreetMap contributors",
        });
    }
  }, []);

  // Inicializar o mapa Leaflet
  useEffect(() => {
    isMountedRef.current = true;
    let map: any = null;

    loadLeaflet()
      .then((L) => {
        if (!isMountedRef.current || !mapContainerRef.current) return;

        // Se já existe uma instância de mapa no container, limpa
        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        }

        // Ponto central padrão: Brasília ou primeiro ponto com coordenadas
        const centerLat = produtosComCoords[0]?.latitude ?? -15.7975;
        const centerLng = produtosComCoords[0]?.longitude ?? -47.8919;

        map = L.map(mapContainerRef.current, {
          center: [centerLat, centerLng],
          zoom: 12,
          zoomControl: false,
        });

        // Adiciona controle de zoom no canto superior direito
        L.control.zoom({ position: "topright" }).addTo(map);

        const tileLayer = createTileLayer(L, mapStyle);
        tileLayer.addTo(map);
        tileLayerRef.current = tileLayer;

        const markersGroup = L.featureGroup().addTo(map);
        markersGroupRef.current = markersGroup;
        mapInstanceRef.current = map;

        setMapReady(true);
      })
      .catch((err) => {
        console.error("Erro ao carregar mapa do inventário:", err);
      });

    return () => {
      isMountedRef.current = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [createTileLayer]);

  // Atualizar estilo da camada quando o usuário troca
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !window.L) return;
    const L = window.L;
    const map = mapInstanceRef.current;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }
    const newTile = createTileLayer(L, mapStyle);
    newTile.addTo(map);
    tileLayerRef.current = newTile;
  }, [mapStyle, mapReady, createTileLayer]);

  // Renderizar marcadores no mapa
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !markersGroupRef.current || !window.L) return;
    const L = window.L;
    const markersGroup = markersGroupRef.current;
    markersGroup.clearLayers();

    produtosFiltrados.forEach((prod) => {
      const lat = Number(prod.latitude);
      const lng = Number(prod.longitude);
      if (isNaN(lat) || isNaN(lng)) return;

      const isSelected = prod.id === activeProduto?.id;
      const statusRaw = String(prod.status_operacional || (prod.ativo === false ? "bloqueado" : "disponivel")).toLowerCase();

      // Cor do marcador por status
      let pinColor = "#10b981"; // verde (disponível)
      if (statusRaw.includes("reserv")) pinColor = "#f59e0b"; // amarelo (reservado)
      else if (statusRaw.includes("veicul")) pinColor = "#3b82f6"; // azul (em veiculação)
      else if (statusRaw.includes("bloque") || prod.ativo === false) pinColor = "#ef4444"; // vermelho (bloqueado)

      const iconHtml = `
        <div style="
          position: relative;
          width: ${isSelected ? "38px" : "30px"};
          height: ${isSelected ? "38px" : "30px"};
          background: ${pinColor};
          border: 3px solid #ffffff;
          border-radius: 50%;
          box-shadow: 0 4px 12px rgba(0,0,0,0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: transform 0.2s ease;
          ${isSelected ? "transform: scale(1.15); ring: 4px solid rgba(16,185,129,0.4);" : ""}
        ">
          <span style="color: #ffffff; font-size: ${isSelected ? "13px" : "11px"}; font-weight: bold;">
            📍
          </span>
        </div>
      `;

      const customIcon = L.divIcon({
        html: iconHtml,
        className: "custom-media-marker",
        iconSize: [isSelected ? 38 : 30, isSelected ? 38 : 30],
        iconAnchor: [isSelected ? 19 : 15, isSelected ? 19 : 15],
      });

      const marker = L.marker([lat, lng], { icon: customIcon });

      marker.on("click", () => {
        setActiveProduto(prod);
        setActivePhotoIndex(0);
        onSelectProduto?.(prod);
      });

      markersGroup.addLayer(marker);
    });

    // Ajusta o zoom para enquadrar todos os marcadores se houver
    if (produtosFiltrados.length > 0 && markersGroup.getLayers().length > 0) {
      try {
        mapInstanceRef.current.fitBounds(markersGroup.getBounds(), {
          padding: [50, 50],
          maxZoom: 16,
        });
      } catch {
        // ignora se bounds estiver vazio
      }
    }
  }, [produtosFiltrados, mapReady, activeProduto?.id, onSelectProduto]);

  // Se um produto externo for selecionado, centraliza nele
  useEffect(() => {
    if (!selectedProdutoId || !produtosComCoords.length) return;
    const found = produtosComCoords.find((p) => p.id === selectedProdutoId);
    if (found && found.latitude && found.longitude) {
      setActiveProduto(found);
      setActivePhotoIndex(0);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setView([Number(found.latitude), Number(found.longitude)], 16, {
          animate: true,
        });
      }
    }
  }, [selectedProdutoId, produtosComCoords]);

  // Fotos do produto ativo
  const fotosAtivo = useMemo(() => {
    if (!activeProduto) return [];
    const arr = Array.isArray(activeProduto.fotos) ? activeProduto.fotos : [];
    if (arr.length > 0) return arr;
    if (activeProduto.foto_principal) return [activeProduto.foto_principal];
    if (activeProduto.foto_url) return [String(activeProduto.foto_url)];
    return [];
  }, [activeProduto]);

  return (
    <div className={cn("relative w-full h-full flex flex-col sm:flex-row overflow-hidden bg-background", className)}>
      {/* 1. Barra Superior de Filtros e Controles sobre o Mapa */}
      <div className="absolute top-3 left-3 z-[1000] flex flex-wrap items-center gap-2 max-w-[calc(100%-60px)]">
        {/* Campo de Busca Rápida */}
        <div className="relative min-w-[200px] sm:min-w-[260px] shadow-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar por ponto, endereço, bairro..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 text-xs rounded-xl bg-background/95 backdrop-blur-md border-border/80 shadow-xs"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Filtro por Status */}
        <select
          value={statusFiltro}
          onChange={(e) => setStatusFiltro(e.target.value)}
          className="h-9 px-3 rounded-xl bg-background/95 backdrop-blur-md border border-border/80 text-xs font-semibold shadow-xs"
        >
          <option value="all">Status: Todos</option>
          <option value="disponivel">🟢 Apenas Disponíveis</option>
          <option value="reservado">🟡 Reservados</option>
          <option value="em_veiculacao">🔵 Em Veiculação</option>
          <option value="bloqueado">🔴 Bloqueados</option>
        </select>

        {/* Seletor de Camada do Mapa */}
        <div className="hidden md:flex items-center gap-1 p-1 rounded-xl bg-background/95 backdrop-blur-md border border-border/80 shadow-xs">
          <button
            type="button"
            onClick={() => setMapStyle("google_streets")}
            className={cn(
              "px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all",
              mapStyle === "google_streets" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Ruas
          </button>
          <button
            type="button"
            onClick={() => setMapStyle("google_hybrid")}
            className={cn(
              "px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all",
              mapStyle === "google_hybrid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Satélite
          </button>
          <button
            type="button"
            onClick={() => setMapStyle("google_traffic")}
            className={cn(
              "px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all",
              mapStyle === "google_traffic" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Tráfego
          </button>
        </div>

        {/* Badge Informativo de Pontos Mapeados */}
        <Badge variant="outline" className="h-9 px-3 rounded-xl bg-background/95 backdrop-blur-md border-border/80 text-xs font-semibold shadow-xs gap-1.5">
          <MapPin className="size-3.5 text-primary" />
          <span>{produtosFiltrados.length} pontos mapeados</span>
          {produtos.length > produtosComCoords.length && (
            <span className="text-[10px] text-muted-foreground">
              ({produtos.length - produtosComCoords.length} sem GPS)
            </span>
          )}
        </Badge>
      </div>

      {/* 2. Container do Mapa Leaflet */}
      <div ref={mapContainerRef} className="flex-1 w-full h-full min-h-[450px] z-0" />

      {/* 3. Painel Lateral de Detalhes do Marcador Clicado */}
      {activeProduto && (
        <div className="w-full sm:w-[380px] lg:w-[420px] max-h-[60vh] sm:max-h-full overflow-y-auto bg-card border-t sm:border-t-0 sm:border-l border-border z-[1001] shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-300">
          <div className="space-y-4 p-5">
            {/* Top row do Card: Categoria e Botão Fechar */}
            <div className="flex items-center justify-between gap-2">
              <Badge variant="outline" className="text-[11px] font-bold uppercase tracking-wider bg-primary/10 text-primary border-primary/30">
                {activeProduto.midia} {activeProduto.tipo ? `• ${activeProduto.tipo}` : ""}
              </Badge>

              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7 rounded-full text-muted-foreground hover:text-foreground"
                  onClick={() => setActiveProduto(null)}
                >
                  <X className="size-4" />
                </Button>
              </div>
            </div>

            {/* Galeria de Fotos Interativa */}
            <div className="relative aspect-[16/10] w-full rounded-2xl overflow-hidden bg-muted border border-border shadow-xs group">
              {fotosAtivo.length > 0 ? (
                <>
                  <ProdutoFotoImg
                    stored={fotosAtivo[activePhotoIndex]}
                    alt={activeProduto.nome}
                    className="w-full h-full object-cover transition-transform duration-300"
                    showLoadingSpinner
                  />

                  {/* Navegação entre fotos */}
                  {fotosAtivo.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          setActivePhotoIndex((prev) => (prev > 0 ? prev - 1 : fotosAtivo.length - 1))
                        }
                        className="absolute left-2 top-1/2 -translate-y-1/2 size-7 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-sm transition-colors"
                      >
                        <ChevronLeft className="size-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setActivePhotoIndex((prev) => (prev < fotosAtivo.length - 1 ? prev + 1 : 0))
                        }
                        className="absolute right-2 top-1/2 -translate-y-1/2 size-7 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-sm transition-colors"
                      >
                        <ChevronRight className="size-4" />
                      </button>

                      <div className="absolute bottom-2 left-1/2 -translate-y-0 -translate-x-1/2 px-2 py-0.5 rounded-full bg-black/70 text-white text-[10px] font-semibold backdrop-blur-md">
                        {activePhotoIndex + 1} / {fotosAtivo.length}
                      </div>
                    </>
                  )}

                  {onOpenGallery && (
                    <button
                      type="button"
                      onClick={() => onOpenGallery(fotosAtivo, activeProduto.nome)}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-white transition-colors"
                      title="Ampliar galeria"
                    >
                      <Maximize2 className="size-3.5" />
                    </button>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center text-muted-foreground">
                  <Camera className="size-8 mb-1.5 opacity-40 text-primary" />
                  <span className="text-xs font-semibold">Sem fotos cadastradas</span>
                </div>
              )}
            </div>

            {/* Título e Localização */}
            <div className="space-y-1">
              <h3 className="text-base font-bold text-foreground leading-snug">
                {activeProduto.nome}
              </h3>
              <p className="text-xs text-muted-foreground flex items-start gap-1">
                <MapPin className="size-3.5 text-rose-500 shrink-0 mt-0.5" />
                <span>
                  {activeProduto.endereco_ponto || "Endereço não cadastrado"}
                  {activeProduto.bairro ? ` • ${activeProduto.bairro}` : ""}
                  {activeProduto.sentido_via ? ` • ${activeProduto.sentido_via}` : ""}
                </span>
              </p>
            </div>

            {/* Disponibilidade Operacional */}
            <div className="p-3 rounded-2xl bg-muted/30 border border-border flex items-center justify-between">
              <div className="text-xs font-medium text-muted-foreground">Disponibilidade:</div>
              <Badge
                variant="outline"
                className={cn(
                  "text-xs px-2.5 py-0.5 font-bold border",
                  String(activeProduto.status_operacional).includes("reserv")
                    ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                    : String(activeProduto.status_operacional).includes("veicul")
                      ? "bg-blue-500/10 text-blue-600 border-blue-500/30"
                      : String(activeProduto.status_operacional).includes("bloque") || activeProduto.ativo === false
                        ? "bg-rose-500/10 text-rose-600 border-rose-500/30"
                        : "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                )}
              >
                {String(activeProduto.status_operacional || "Disponível").toUpperCase()}
              </Badge>
            </div>

            {/* Dados Técnicos */}
            <div className="space-y-2 p-3.5 rounded-2xl bg-muted/40 border border-border text-xs">
              <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-1">
                <Compass className="size-3.5 text-primary" />
                Especificações Técnicas
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-muted-foreground block">Dimensão / Medidas:</span>
                  <span className="font-semibold text-foreground">
                    {activeProduto.dimensao || activeProduto.dimensoes_cm || activeProduto.dimensoes_pixels || activeProduto.formato || "Padrão"}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-muted-foreground block">Fluxo Estimado:</span>
                  <span className="font-semibold text-foreground flex items-center gap-1">
                    <TrendingUp className="size-3 text-emerald-600 shrink-0" />
                    {activeProduto.fluxo_estimado != null
                      ? `${Number(activeProduto.fluxo_estimado).toLocaleString("pt-BR")} /mês`
                      : activeProduto.impactos_estimados != null
                        ? `${Number(activeProduto.impactos_estimados).toLocaleString("pt-BR")} /mês`
                        : "Não informado"}
                  </span>
                </div>

                {activeProduto.ponto_referencia && (
                  <div className="col-span-2">
                    <span className="text-[10px] text-muted-foreground block">Referência:</span>
                    <span className="font-medium text-foreground">{activeProduto.ponto_referencia}</span>
                  </div>
                )}

                {activeProduto.publico_alvo && (
                  <div className="col-span-2 pt-1 border-t border-border/40">
                    <span className="text-[10px] text-muted-foreground block">Público-Alvo:</span>
                    <span className="font-medium text-foreground">{activeProduto.publico_alvo}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Parceiro Responsável */}
            {(activeProduto.parceiro_nome || activeProduto.origem_produto === "PARCEIRO") && (
              <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Handshake className="size-4 text-purple-600 shrink-0" />
                  <div>
                    <span className="text-[10px] text-purple-700 dark:text-purple-300 block font-bold uppercase">
                      Parceiro Responsável
                    </span>
                    <span className="font-semibold text-purple-900 dark:text-purple-100">
                      {activeProduto.parceiro_nome || "Parceiro Homologado"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Valores Comerciais */}
            <div className="p-3.5 rounded-2xl bg-muted/60 border border-border flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Valor de Tabela
                </span>
                <span className="text-lg font-bold text-foreground font-mono">
                  {formatBRL(Number(activeProduto.valor_unit) || 0)}
                </span>
              </div>

              {activeProduto.valor_negociado && Number(activeProduto.valor_negociado) > 0 && (
                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                    Valor Negociado
                  </span>
                  <span className="text-base font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                    {formatBRL(Number(activeProduto.valor_negociado))}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Ações do Ponto */}
          <div className="p-4 border-t border-border bg-card flex items-center justify-between gap-2">
            <a
              href={`https://www.google.com/maps?q=${activeProduto.latitude},${activeProduto.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
            >
              <ExternalLink className="size-3.5" />
              Ver no Google Maps
            </a>

            {onEditProduto && (
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={() => onEditProduto(activeProduto)}
                className="rounded-xl font-bold text-xs gap-1.5 shadow-sm"
              >
                <Pencil className="size-3.5" />
                Editar Ponto
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
