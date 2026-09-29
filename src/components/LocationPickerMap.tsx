import { useEffect, useRef, useState } from "react";

type Props = {
  latitude: number | null;
  longitude: number | null;
  onChange: (lat: number, lng: number) => void;
  height?: number;
};

declare global {
  interface Window {
    google?: any;
    L?: any;
    __lovableInitGmap?: () => void;
    __lovableGmapPromise?: Promise<void>;
    __leafletPromise?: Promise<any>;
  }
}

function loadGoogleMaps(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.google?.maps) return Promise.resolve();
  if (window.__lovableGmapPromise) return window.__lovableGmapPromise;

  const key = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY;
  const channel = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID;
  if (!key) return Promise.reject(new Error("Google Maps browser key ausente"));

  window.__lovableGmapPromise = new Promise<void>((resolve, reject) => {
    window.__lovableInitGmap = () => resolve();
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&loading=async&callback=__lovableInitGmap${channel ? `&channel=${channel}` : ""}`;
    s.async = true;
    s.defer = true;
    s.onerror = () => reject(new Error("Falha ao carregar Google Maps"));
    document.head.appendChild(s);
  });
  return window.__lovableGmapPromise;
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

const DEFAULT_CENTER = { lat: -15.7942, lng: -47.8822 }; // Brasília

export function LocationPickerMap({ latitude, longitude, onChange, height = 280 }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const mapEngineRef = useRef<"google" | "leaflet" | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const hasGmap = !!import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY;

  useEffect(() => {
    let cancelled = false;

    async function initMap() {
      if (!containerRef.current) return;
      const initial =
        latitude != null && longitude != null
          ? { lat: latitude, lng: longitude }
          : DEFAULT_CENTER;

      // 1. Tenta inicializar Google Maps se a chave estiver configurada
      if (hasGmap) {
        try {
          await loadGoogleMaps();
          if (cancelled || !containerRef.current || !window.google) return;
          const map = new window.google.maps.Map(containerRef.current, {
            center: initial,
            zoom: latitude != null ? 16 : 12,
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: false,
          });
          const marker = new window.google.maps.Marker({
            position: initial,
            map,
            draggable: true,
          });

          mapRef.current = map;
          markerRef.current = marker;
          mapEngineRef.current = "google";
          setMapReady(true);

          map.addListener("click", (e: any) => {
            const lat = Number(e.latLng.lat().toFixed(7));
            const lng = Number(e.latLng.lng().toFixed(7));
            marker.setPosition({ lat, lng });
            onChange(lat, lng);
          });
          marker.addListener("dragend", () => {
            const p = marker.getPosition();
            if (!p) return;
            onChange(Number(p.lat().toFixed(7)), Number(p.lng().toFixed(7)));
          });
          return;
        } catch (err) {
          console.warn("Fallback para OpenStreetMap:", err);
        }
      }

      // 2. Inicializa OpenStreetMap / Leaflet (sem necessidade de chaves)
      try {
        const L = await loadLeaflet();
        if (cancelled || !containerRef.current) return;

        // Limpa mapa anterior se houver
        if (mapRef.current && mapEngineRef.current === "leaflet") {
          mapRef.current.remove();
        }

        const map = L.map(containerRef.current, {
          center: [initial.lat, initial.lng],
          zoom: latitude != null ? 16 : 13,
          zoomControl: true,
        });

        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: "© OpenStreetMap",
        }).addTo(map);

        const marker = L.marker([initial.lat, initial.lng], {
          draggable: true,
        }).addTo(map);

        mapRef.current = map;
        markerRef.current = marker;
        mapEngineRef.current = "leaflet";
        setMapReady(true);

        map.on("click", (e: any) => {
          const lat = Number(e.latlng.lat.toFixed(7));
          const lng = Number(e.latlng.lng.toFixed(7));
          marker.setLatLng([lat, lng]);
          onChange(lat, lng);
        });

        marker.on("dragend", () => {
          const p = marker.getLatLng();
          onChange(Number(p.lat.toFixed(7)), Number(p.lng.toFixed(7)));
        });

        // Corrige tamanho de renderização inicial do Leaflet após montagem
        setTimeout(() => {
          if (!cancelled && mapRef.current && mapEngineRef.current === "leaflet") {
            mapRef.current.invalidateSize();
          }
        }, 200);
      } catch (err) {
        console.error("Falha ao inicializar mapa Leaflet:", err);
      }
    }

    initMap();

    return () => {
      cancelled = true;
      if (mapRef.current && mapEngineRef.current === "leaflet") {
        try {
          mapRef.current.remove();
        } catch {
          // ignora cleanup de mapa destruído
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sincroniza alterações externas de coordenadas (ex: via CEP, endereço ou botão)
  useEffect(() => {
    if (!mapRef.current || !markerRef.current || latitude == null || longitude == null) return;

    if (mapEngineRef.current === "google" && window.google) {
      const pos = { lat: latitude, lng: longitude };
      markerRef.current.setPosition(pos);
      mapRef.current.panTo(pos);
      if (mapRef.current.getZoom() < 14) {
        mapRef.current.setZoom(16);
      }
    } else if (mapEngineRef.current === "leaflet") {
      markerRef.current.setLatLng([latitude, longitude]);
      mapRef.current.setView([latitude, longitude], Math.max(mapRef.current.getZoom(), 15));
    }
  }, [latitude, longitude]);

  return (
    <div
      ref={containerRef}
      className="w-full rounded-md border overflow-hidden bg-muted relative"
      style={{ height }}
      aria-label="Mapa interativo para escolher o ponto OOH/DOOH"
    >
      {!mapReady && (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground bg-muted/60">
          Carregando mapa interativo...
        </div>
      )}
    </div>
  );
}
