import { memo } from "react";
import type { PublicAsset } from "@/types/public-inventory.types";
import { CATEGORIAS_CORES } from "@/types/public-inventory.types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MapPin,
  ExternalLink,
  Eye,
  Compass,
  Sparkles,
  Maximize2,
  Navigation,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FluxAssetCardProps {
  asset: PublicAsset;
  isSelected?: boolean;
  onSelect: (asset: PublicAsset) => void;
  onViewDetails: (asset: PublicAsset) => void;
}

export const FluxAssetCard = memo(function FluxAssetCard({
  asset,
  isSelected,
  onSelect,
  onViewDetails,
}: FluxAssetCardProps) {
  const catConfig = CATEGORIAS_CORES[asset.categoria_slug] || CATEGORIAS_CORES.ooh;
  const hasCoords = asset.latitude != null && asset.longitude != null;
  const thumbUrl = asset.fotos_urls?.[0];

  const statusDotClass =
    asset.status_disponibilidade === "Disponível"
      ? "bg-emerald-500 shadow-emerald-500/50"
      : asset.status_disponibilidade === "Reservado"
        ? "bg-amber-500 shadow-amber-500/50"
        : "bg-rose-500 shadow-rose-500/50";

  const statusBadgeVariant =
    asset.status_disponibilidade === "Disponível"
      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
      : asset.status_disponibilidade === "Reservado"
        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
        : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30";

  return (
    <div
      id={`asset-card-${asset.id}`}
      onClick={() => onSelect(asset)}
      className={cn(
        "group relative rounded-xl border bg-card p-3 transition-all duration-200 cursor-pointer hover:shadow-md",
        isSelected
          ? "border-primary ring-2 ring-primary/20 shadow-md bg-accent/30"
          : "border-border/80 hover:border-primary/50",
      )}
    >
      <div className="flex gap-3">
        {/* Thumbnail com aspecto 16:9 */}
        <div className="relative w-28 h-20 sm:w-32 sm:h-22 rounded-lg overflow-hidden bg-muted flex-shrink-0 border border-border/60">
          {thumbUrl ? (
            <img
              src={thumbUrl}
              alt={asset.nome_ponto}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-muted to-muted/80 text-muted-foreground p-1 text-center">
              <Sparkles className="size-5 mb-1 opacity-40" />
              <span className="text-[10px] font-medium leading-tight">Foto do Ponto</span>
            </div>
          )}

          {/* Badge de Categoria sobreposto */}
          <div className="absolute top-1 left-1">
            <span
              className={cn(
                "text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs border backdrop-blur-md bg-background/90",
                catConfig.badgeText,
              )}
            >
              {asset.tipo_midia}
            </span>
          </div>

          {!hasCoords && (
            <div className="absolute bottom-1 right-1 bg-black/70 text-[9px] text-amber-300 font-semibold px-1 rounded">
              Sem pin
            </div>
          )}
        </div>

        {/* Informações Principais */}
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div>
            {/* Top row: Código do ponto + Status de disponibilidade */}
            <div className="flex items-center justify-between gap-1.5 mb-0.5">
              <span className="text-[11px] font-mono font-bold text-muted-foreground uppercase tracking-wider truncate">
                {asset.codigo_ativo}
              </span>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className={cn("size-2 rounded-full shadow-xs animate-pulse", statusDotClass)} />
                <Badge
                  variant="outline"
                  className={cn("text-[10px] px-1.5 py-0 h-4 font-semibold border", statusBadgeVariant)}
                >
                  {asset.status_disponibilidade}
                </Badge>
              </div>
            </div>

            {/* Título do ponto */}
            <h4 className="text-xs sm:text-sm font-semibold text-foreground line-clamp-1 leading-snug group-hover:text-primary transition-colors">
              {asset.nome_ponto}
            </h4>

            {/* Localização */}
            <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
              <MapPin className="size-3 flex-shrink-0 text-muted-foreground/70" />
              <span className="truncate">
                {asset.bairro ? `${asset.bairro}, ` : ""}
                {asset.cidade} - {asset.uf}
              </span>
            </p>
          </div>

          {/* Rodapé do card: Dimensões / Formato e botões */}
          <div className="flex items-center justify-between gap-2 mt-2 pt-1.5 border-t border-border/40">
            <div className="text-[11px] text-muted-foreground/90 font-medium truncate">
              {asset.dimensoes ? (
                <span>📐 {asset.dimensoes}</span>
              ) : (
                <span>{asset.formato}</span>
              )}
              {asset.sentido_via && (
                <span className="hidden sm:inline ml-1 text-muted-foreground/70">
                  • {asset.sentido_via}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              {hasCoords && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-6 text-muted-foreground hover:text-primary"
                  title="Focar no mapa"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(asset);
                  }}
                >
                  <Navigation className="size-3" />
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                className="h-6 text-[11px] px-2 gap-1 rounded-md"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewDetails(asset);
                }}
              >
                <Eye className="size-3" />
                <span>Detalhes</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
