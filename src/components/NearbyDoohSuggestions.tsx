import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { MapPin, Loader2, Sparkles } from "lucide-react";
import { listProdutos } from "@/lib/produtos.functions";
import { geocodeAddress } from "@/lib/geocode.functions";
import { ProdutoFotoImg } from "@/components/ProdutoFotoImg";

type Props = {
  cliente: {
    endereco?: string | null;
    cidade?: string | null;
    uf?: string | null;
    nome?: string;
  } | null;
};

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export function NearbyDoohSuggestions({ cliente }: Props) {
  const geocode = useServerFn(geocodeAddress);

  const addressParts = [cliente?.endereco, cliente?.cidade, cliente?.uf].filter(Boolean);
  const fullAddress = addressParts.join(", ");
  const hasAddress = !!cliente && addressParts.length >= 1;

  const { data: produtos = [] } = useQuery({
    queryKey: ["produtos"],
    queryFn: () => listProdutos(),
    enabled: hasAddress,
  });

  const doohPoints = useMemo(
    () =>
      (produtos as any[]).filter(
        (p) => p.midia === "DOOH" && p.ativo !== false && p.latitude != null && p.longitude != null,
      ),
    [produtos],
  );

  const geo = useQuery({
    queryKey: ["geocode", fullAddress],
    queryFn: () => geocode({ data: { address: fullAddress } }),
    enabled: hasAddress && doohPoints.length > 0,
    staleTime: 24 * 60 * 60 * 1000,
  });

  const suggestions = useMemo(() => {
    if (!geo.data || !geo.data.ok) return [];
    const origin = { lat: geo.data.latitude, lng: geo.data.longitude };
    return doohPoints
      .map((p) => ({
        ...p,
        distanceKm: haversineKm(origin, { lat: p.latitude, lng: p.longitude }),
      }))
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 5);
  }, [geo.data, doohPoints]);

  if (!cliente) return null;
  if (!hasAddress) return null;
  if (doohPoints.length === 0) return null;

  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Sparkles className="size-4 text-primary" />
        Sugestões de pontos OOH/DOOH próximos ao cliente
      </div>

      {geo.isLoading && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-3 animate-spin" /> Localizando endereço do cliente...
        </div>
      )}

      {geo.data && !geo.data.ok && (
        <p className="text-xs text-muted-foreground">
          Não foi possível localizar o endereço do cliente automaticamente. Exibindo pontos
          disponíveis abaixo como sugestões estratégicas.
        </p>
      )}

      {(suggestions.length > 0 || (geo.data && !geo.data.ok)) && (
        <ul className="space-y-1.5">
          {(suggestions.length > 0
            ? suggestions
            : doohPoints.slice(0, 5).map((p) => ({ ...p, distanceKm: null as number | null }))
          ).map((p: any) => (
            <li
              key={p.id}
              className="flex items-start justify-between gap-2.5 rounded-md bg-background/60 p-2 text-xs"
            >
              <div className="flex items-start gap-2.5 min-w-0 flex-1">
                {p.fotos && p.fotos.length > 0 && (
                  <div className="size-9 rounded-md overflow-hidden border shrink-0 bg-muted/30">
                    <ProdutoFotoImg
                      stored={p.fotos[0]}
                      alt={p.nome}
                      className="size-full object-cover"
                    />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{p.nome}</div>
                  {p.endereco_ponto && (
                    <div className="text-muted-foreground truncate">{p.endereco_ponto}</div>
                  )}
                  {p.distanceKm != null && (
                    <div className="text-primary font-medium">
                      {p.distanceKm < 1
                        ? `${Math.round(p.distanceKm * 1000)} m do cliente`
                        : `${p.distanceKm.toFixed(1)} km do cliente`}
                    </div>
                  )}
                </div>
              </div>
              <a
                href={`https://www.google.com/maps?q=${p.latitude},${p.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 inline-flex items-center gap-1 text-primary hover:underline"
              >
                <MapPin className="size-3" /> mapa
              </a>
            </li>
          ))}
        </ul>
      )}

      <p className="text-[11px] text-muted-foreground">
        Adicione os pontos desejados como itens da proposta abaixo.
      </p>
    </div>
  );
}
