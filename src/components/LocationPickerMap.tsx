import { useEffect, useRef } from "react";

type Props = {
  latitude: number | null;
  longitude: number | null;
  onChange: (lat: number, lng: number) => void;
  height?: number;
};

declare global {
  interface Window {
    google?: any;
    __lovableInitGmap?: () => void;
    __lovableGmapPromise?: Promise<void>;
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

const DEFAULT_CENTER = { lat: -15.7942, lng: -47.8822 }; // Brasília

export function LocationPickerMap({ latitude, longitude, onChange, height = 280 }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then(() => {
        if (cancelled || !containerRef.current || !window.google) return;
        const initial =
          latitude != null && longitude != null
            ? { lat: latitude, lng: longitude }
            : DEFAULT_CENTER;
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
      })
      .catch((err) => {
        console.error(err);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync external coordinate changes (e.g. "usar minha localização")
  useEffect(() => {
    if (!mapRef.current || !markerRef.current || !window.google) return;
    if (latitude == null || longitude == null) return;
    const pos = { lat: latitude, lng: longitude };
    markerRef.current.setPosition(pos);
    mapRef.current.panTo(pos);
  }, [latitude, longitude]);

  const hasKey = !!import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY;

  if (!hasKey) {
    return (
      <div
        className="rounded-md border border-dashed p-3 text-xs text-muted-foreground"
        style={{ height }}
      >
        Mapa indisponível: conecte o Google Maps para visualizar e escolher o ponto.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full rounded-md border overflow-hidden bg-muted"
      style={{ height }}
      aria-label="Mapa para escolher o ponto OOH/DOOH"
    />
  );
}
