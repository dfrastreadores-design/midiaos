import { useEffect, useRef, useState, useCallback } from "react";
import type { PublicAsset } from "@/types/public-inventory.types";
import { CATEGORIAS_CORES } from "@/types/public-inventory.types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Layers,
  Maximize2,
  Compass,
  Sparkles,
  MapPin,
  ExternalLink,
  Eye,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FluxOohMapProps {
  assets: PublicAsset[];
  selectedAssetId?: string | null;
  onSelectAsset: (asset: PublicAsset) => void;
  onViewDetails: (asset: PublicAsset) => void;
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
    script.onerror = () => reject(new Error("Falha ao carregar OpenStreetMap Leaflet"));
    document.head.appendChild(script);
  });
  return window.__leafletPromise;
}

type MapLayerStyle = "google_traffic" | "google_hybrid" | "google_streets" | "voyager";

const GOOGLE_TILE_SUBDOMAINS = ["0", "1", "2", "3"];

function createTileLayerForStyle(L: any, style: MapLayerStyle) {
  switch (style) {
    case "google_traffic":
      return L.tileLayer("https://mt{s}.google.com/vt/lyrs=m,traffic&x={x}&y={y}&z={z}", {
        maxZoom: 20,
        subdomains: GOOGLE_TILE_SUBDOMAINS,
        attribution: "© Google Maps Traffic",
      });
    case "google_hybrid":
      return L.tileLayer("https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}", {
        maxZoom: 20,
        subdomains: GOOGLE_TILE_SUBDOMAINS,
        attribution: "© Google Maps Satellite",
      });
    case "google_streets":
      return L.tileLayer("https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", {
        maxZoom: 20,
        subdomains: GOOGLE_TILE_SUBDOMAINS,
        attribution: "© Google Maps",
      });
    case "voyager":
    default:
      return L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
        {
          maxZoom: 19,
          subdomains: "abcd",
          attribution: "© CartoDB Voyager",
        },
      );
  }
}

const DEFAULT_CENTER = [-15.7942, -47.8822]; // Brasília / DF

export function FluxOohMap({
  assets,
  selectedAssetId,
  onSelectAsset,
  onViewDetails,
  className,
}: FluxOohMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markersGroupRef = useRef<any>(null);
  const markersMapRef = useRef<Map<string, any>>(new Map());
  const activeTileLayerRef = useRef<any>(null);

  const [mapReady, setMapReady] = useState(false);
  const [mapStyle, setMapStyle] = useState<MapLayerStyle>("google_traffic");

  // Filtra ativos que possuem coordenadas válidas
  const geoAssets = assets.filter(
    (a) =>
      a.latitude != null &&
      a.longitude != null &&
      !isNaN(a.latitude) &&
      !isNaN(a.longitude),
  );

  // Inicialização do Mapa
  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!containerRef.current) return;
      try {
        const L = await loadLeaflet();
        if (cancelled || !containerRef.current) return;

        if (mapRef.current) {
          mapRef.current.remove();
        }

        const map = L.map(containerRef.current, {
          center: DEFAULT_CENTER,
          zoom: 12,
          zoomControl: false,
          attributionControl: false,
        });

        // Controles de zoom na direita inferior
        L.control.zoom({ position: "bottomright" }).addTo(map);

        // Camada inicial do Google Maps com Trânsito/Fluxo em tempo real
        const initialLayer = createTileLayerForStyle(L, "google_traffic");
        initialLayer.addTo(map);
        activeTileLayerRef.current = initialLayer;

        const markersLayer = L.featureGroup().addTo(map);
        markersGroupRef.current = markersLayer;

        mapRef.current = map;
        setMapReady(true);

        setTimeout(() => {
          if (!cancelled && mapRef.current) {
            mapRef.current.invalidateSize();
          }
        }, 200);
      } catch (err) {
        console.error("Erro ao inicializar mapa Leaflet:", err);
      }
    }

    init();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch {}
      }
    };
  }, []);

  // Altera estilo de camadas do Google Maps
  const changeMapStyle = useCallback((nextStyle: MapLayerStyle) => {
    if (!mapRef.current || !window.L) return;
    const L = window.L;

    if (activeTileLayerRef.current) {
      mapRef.current.removeLayer(activeTileLayerRef.current);
    }

    const newLayer = createTileLayerForStyle(L, nextStyle);
    newLayer.addTo(mapRef.current);
    activeTileLayerRef.current = newLayer;

    setMapStyle(nextStyle);
  }, []);

  // Função para criar o ícone HTML customizado de cada pin
  const createCustomIcon = useCallback((asset: PublicAsset, isHighlighted: boolean) => {
    if (!window.L) return null;
    const L = window.L;
    const catConfig = CATEGORIAS_CORES[asset.categoria_slug] || CATEGORIAS_CORES.ooh;
    const pinColor = catConfig.pinColor;

    const pulseRing = isHighlighted
      ? `<span class="absolute -inset-2 rounded-full animate-ping opacity-75" style="background-color: ${pinColor};"></span>`
      : "";

    const html = `
      <div class="relative flex items-center justify-center cursor-pointer transition-transform duration-200 ${isHighlighted ? "scale-125 z-50" : "hover:scale-110"}">
        ${pulseRing}
        <div class="relative w-8 h-8 rounded-full shadow-lg border-2 border-white flex items-center justify-center text-white" style="background-color: ${pinColor}; box-shadow: 0 4px 12px ${pinColor}80;">
          <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 0 1 0-5 2.5 2.5 0 0 1 0 5z"/>
          </svg>
        </div>
      </div>
    `;

    return L.divIcon({
      className: "custom-ooh-pin",
      html,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32],
    });
  }, []);

  // Atualiza os marcadores no mapa conforme os ativos mudam
  useEffect(() => {
    if (!mapReady || !mapRef.current || !markersGroupRef.current || !window.L) return;
    const L = window.L;
    const group = markersGroupRef.current;
    group.clearLayers();
    markersMapRef.current.clear();

    const bounds = L.latLngBounds([]);

    geoAssets.forEach((asset) => {
      const lat = asset.latitude!;
      const lng = asset.longitude!;
      const isSelected = selectedAssetId === asset.id;
      const icon = createCustomIcon(asset, isSelected);

      const marker = L.marker([lat, lng], { icon }).addTo(group);
      bounds.extend([lat, lng]);

      // Links do Google Maps & Street View
      const gMapsLink = `https://www.google.com/maps?q=${lat},${lng}`;
      const streetViewLink = `https://www.google.com/maps?q=${lat},${lng}&layer=c&cbll=${lat},${lng}`;

      // Conteúdo seguro do popup integrado com Google Maps
      const thumb = asset.fotos_urls?.[0];
      const popupHtml = `
        <div class="p-1 min-w-[240px] max-w-[280px] font-sans">
          ${
            thumb
              ? `<div class="relative w-full h-24 rounded-lg overflow-hidden mb-2 bg-slate-100">
                  <img src="${thumb}" alt="" class="w-full h-full object-cover" />
                  <span class="absolute top-1 left-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-black/75 text-white">
                    ${asset.tipo_midia}
                  </span>
                </div>`
              : `<div class="text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  ${asset.tipo_midia}
                </div>`
          }
          <div class="text-[10px] font-mono font-bold text-slate-600 mb-0.5">${asset.codigo_ativo}</div>
          <div class="text-xs font-bold text-slate-900 line-clamp-2 leading-snug mb-1">${asset.nome_ponto}</div>
          <div class="text-[11px] text-slate-600 mb-2 truncate">
            📍 ${asset.bairro ? `${asset.bairro}, ` : ""}${asset.cidade} - ${asset.uf}
          </div>
          <div class="flex items-center justify-between gap-1 pt-1.5 border-t border-slate-100 mb-2">
            <span class="text-[10px] font-semibold text-slate-700">${asset.dimensoes || asset.formato}</span>
            <button id="btn-popup-${asset.id}" class="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors">
              Ver Detalhes →
            </button>
          </div>
          <div class="flex items-center gap-1.5 pt-1.5 border-t border-slate-100">
            <a href="${gMapsLink}" target="_blank" rel="noopener noreferrer" class="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1 rounded bg-rose-50 text-rose-700 hover:bg-rose-100 text-[10px] font-bold transition-colors">
              🗺️ Google Maps
            </a>
            <a href="${streetViewLink}" target="_blank" rel="noopener noreferrer" class="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1 rounded bg-amber-50 text-amber-700 hover:bg-amber-100 text-[10px] font-bold transition-colors">
              👁️ Street View
            </a>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, {
        closeButton: true,
        className: "custom-flux-popup",
      });

      marker.on("click", () => {
        onSelectAsset(asset);
      });

      marker.on("popupopen", () => {
        const btn = document.getElementById(`btn-popup-${asset.id}`);
        if (btn) {
          btn.onclick = (e) => {
            e.stopPropagation();
            onViewDetails(asset);
          };
        }
      });

      markersMapRef.current.set(asset.id, marker);
    });

    // Se temos pontos e não há ativo selecionado específico, ajusta o zoom geral
    if (geoAssets.length > 0 && !selectedAssetId && bounds.isValid()) {
      mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [mapReady, assets, createCustomIcon, geoAssets.length]);

  // Foco suave (flyTo) quando o ativo selecionado mudar
  useEffect(() => {
    if (!mapReady || !mapRef.current || !selectedAssetId) return;
    const selectedAsset = assets.find((a) => a.id === selectedAssetId);
    if (!selectedAsset || selectedAsset.latitude == null || selectedAsset.longitude == null) {
      return;
    }

    const { latitude, longitude } = selectedAsset;
    mapRef.current.flyTo([latitude, longitude], 16, {
      duration: 1.2,
      easeLinearity: 0.25,
    });

    const marker = markersMapRef.current.get(selectedAsset.id);
    if (marker) {
      setTimeout(() => {
        marker.openPopup();
      }, 600);
    }
  }, [selectedAssetId, mapReady, assets]);

  // Centraliza e enquadra todos os pontos
  const handleFitAll = () => {
    if (!mapRef.current || !window.L || geoAssets.length === 0) return;
    const L = window.L;
    const bounds = L.latLngBounds([]);
    geoAssets.forEach((a) => bounds.extend([a.latitude!, a.longitude!]));
    if (bounds.isValid()) {
      mapRef.current.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 });
    }
  };

  // Abre visualização no Google Maps
  const handleOpenGoogleMaps = () => {
    if (selectedAssetId) {
      const selected = assets.find((a) => a.id === selectedAssetId);
      if (selected && selected.latitude != null && selected.longitude != null) {
        window.open(`https://www.google.com/maps?q=${selected.latitude},${selected.longitude}`, "_blank");
        return;
      }
    }
    if (mapRef.current) {
      const center = mapRef.current.getCenter();
      const zoom = mapRef.current.getZoom();
      window.open(`https://www.google.com/maps/@${center.lat},${center.lng},${zoom}z`, "_blank");
    } else {
      window.open(`https://www.google.com/maps?q=${DEFAULT_CENTER[0]},${DEFAULT_CENTER[1]}`, "_blank");
    }
  };

  return (
    <div className={cn("relative w-full h-full min-h-[400px] overflow-hidden bg-muted", className)}>
      <div ref={containerRef} className="w-full h-full" />

      {/* Loading Overlay */}
      {!mapReady && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-xs z-30">
          <Loader2 className="size-8 animate-spin text-primary mb-2" />
          <p className="text-xs font-semibold text-muted-foreground">
            Carregando mapa interativo OOH (Google Maps)...
          </p>
        </div>
      )}

      {/* Floating Map Controls - Integrado com Google Maps */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
        {/* Seletor de Camadas Google Maps */}
        <div className="flex bg-background/95 backdrop-blur-md border rounded-xl shadow-lg p-1 gap-1">
          <button
            type="button"
            onClick={() => changeMapStyle("google_traffic")}
            className={cn(
              "px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all flex items-center gap-1.5",
              mapStyle === "google_traffic"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
            )}
            title="Google Maps com Fluxo de Trânsito em Tempo Real"
          >
            <span className="size-2 rounded-full bg-emerald-300 animate-pulse" />
            <span>Trânsito / Fluxo</span>
          </button>

          <button
            type="button"
            onClick={() => changeMapStyle("google_hybrid")}
            className={cn(
              "px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all flex items-center gap-1.5",
              mapStyle === "google_hybrid"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
            )}
            title="Google Maps Satélite com Nomes de Vias"
          >
            <span>🛰️ Satélite</span>
          </button>

          <button
            type="button"
            onClick={() => changeMapStyle("google_streets")}
            className={cn(
              "px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all flex items-center gap-1.5",
              mapStyle === "google_streets"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
            )}
            title="Google Maps Vetorial Padrão"
          >
            <span>🗺️ Ruas</span>
          </button>
        </div>

        <div className="flex gap-2 self-end">
          <Button
            size="sm"
            variant="secondary"
            className="shadow-md bg-background/95 backdrop-blur-md hover:bg-background border h-8 px-2.5 text-xs gap-1.5 font-bold text-rose-600 hover:text-rose-700"
            onClick={handleOpenGoogleMaps}
            title="Abrir esta área ou ponto no Google Maps oficial"
          >
            <MapPin className="size-3.5 text-rose-500" />
            <span className="hidden sm:inline">Google Maps</span>
            <ExternalLink className="size-3 opacity-60" />
          </Button>

          <Button
            size="sm"
            variant="secondary"
            className="shadow-md bg-background/95 backdrop-blur-md hover:bg-background border h-8 px-2.5 text-xs gap-1.5 font-semibold"
            onClick={handleFitAll}
            title="Enquadrar todos os pontos no mapa"
          >
            <Maximize2 className="size-3.5 text-primary" />
            <span className="hidden sm:inline">Ver Todos</span>
          </Button>
        </div>
      </div>

      {/* Floating Bottom Status Pill */}
      <div className="absolute bottom-4 left-4 z-20 flex items-center gap-2 pointer-events-none">
        <div className="px-3 py-1.5 rounded-full bg-background/90 backdrop-blur-md border shadow-md text-xs font-medium text-foreground flex items-center gap-2">
          <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>
            <strong>{geoAssets.length}</strong> pontos mapeados
          </span>
          <span className="text-muted-foreground text-[10px]">
            • Camada ativa:{" "}
            <strong className="text-foreground">
              {mapStyle === "google_traffic"
                ? "Google Trânsito (Fluxo ao Vivo)"
                : mapStyle === "google_hybrid"
                  ? "Google Satélite Híbrido"
                  : mapStyle === "google_streets"
                    ? "Google Maps"
                    : "Voyager"}
            </strong>
          </span>
          {assets.length > geoAssets.length && (
            <span className="text-muted-foreground text-[10px]">
              ({assets.length - geoAssets.length} sem coordenadas)
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
