import { useState } from "react";
import type { PublicAsset } from "@/types/public-inventory.types";
import { CATEGORIAS_CORES } from "@/types/public-inventory.types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MapPin,
  ExternalLink,
  Compass,
  Maximize2,
  Sparkles,
  Copy,
  Check,
  Calendar,
  Share2,
  Car,
  Users,
  Eye,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface FluxAssetDetailModalProps {
  asset: PublicAsset | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFocusOnMap?: (asset: PublicAsset) => void;
}

export function FluxAssetDetailModal({
  asset,
  open,
  onOpenChange,
  onFocusOnMap,
}: FluxAssetDetailModalProps) {
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [copied, setCopied] = useState(false);

  if (!asset) return null;

  const catConfig = CATEGORIAS_CORES[asset.categoria_slug] || CATEGORIAS_CORES.ooh;
  const fotos = asset.fotos_urls || [];
  const activePhoto = fotos[activePhotoIdx] || fotos[0];

  const handleCopyLink = () => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.set("ativoId", asset.id);
    navigator.clipboard.writeText(url.toString());
    setCopied(true);
    toast.success("Link do ponto copiado para a área de transferência!");
    setTimeout(() => setCopied(false), 2000);
  };

  const streetViewUrl =
    asset.link_maps ||
    (asset.latitude != null && asset.longitude != null
      ? `https://www.google.com/maps?q=${asset.latitude},${asset.longitude}&layer=c&cbll=${asset.latitude},${asset.longitude}`
      : null);

  const googleMapsUrl =
    asset.latitude != null && asset.longitude != null
      ? `https://www.google.com/maps?q=${asset.latitude},${asset.longitude}`
      : asset.link_maps || null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl sm:max-w-3xl p-0 overflow-hidden rounded-2xl border-border bg-card">
        {/* Banner com Foto Principal */}
        <div className="relative w-full h-56 sm:h-72 bg-muted overflow-hidden">
          {activePhoto ? (
            <img
              src={activePhoto}
              alt={asset.nome_ponto}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-muted to-muted/70 text-muted-foreground p-6 text-center">
              <Sparkles className="size-10 mb-2 opacity-30 text-primary" />
              <p className="text-sm font-semibold">Espaço de Mídia OOH / DOOH</p>
              <p className="text-xs text-muted-foreground/80 mt-1 max-w-sm">
                Fotografia e gabarito em processo de atualização técnica.
              </p>
            </div>
          )}

          {/* Gradiente de transição */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

          {/* Badges superiores */}
          <div className="absolute top-3 left-3 flex flex-wrap gap-2">
            <span
              className={cn(
                "text-xs font-bold px-2.5 py-1 rounded-md shadow-md border backdrop-blur-md bg-background/90",
                catConfig.badgeText,
              )}
            >
              {asset.tipo_midia}
            </span>
            <Badge
              variant="outline"
              className={cn(
                "text-xs font-bold px-2.5 py-1 backdrop-blur-md shadow-md",
                asset.status_disponibilidade === "Disponível"
                  ? "bg-emerald-500/90 text-white border-emerald-400"
                  : asset.status_disponibilidade === "Reservado"
                    ? "bg-amber-500/90 text-white border-amber-400"
                    : "bg-rose-500/90 text-white border-rose-400",
              )}
            >
              ● {asset.status_disponibilidade}
            </Badge>
          </div>

          {/* Informações sobrepostas na base da imagem */}
          <div className="absolute bottom-3 left-4 right-4 text-white">
            <div className="text-xs font-mono font-bold text-white/80 uppercase tracking-widest mb-1">
              {asset.codigo_ativo}
            </div>
            <h3 className="text-lg sm:text-2xl font-bold leading-tight drop-shadow-sm">
              {asset.nome_ponto}
            </h3>
            <p className="text-xs sm:text-sm text-white/90 flex items-center gap-1 mt-1 drop-shadow-xs">
              <MapPin className="size-3.5 text-amber-400 flex-shrink-0" />
              <span>
                {asset.bairro ? `${asset.bairro}, ` : ""}
                {asset.cidade} - {asset.uf}
              </span>
            </p>
          </div>
        </div>

        {/* Miniaturas de fotos adicionais */}
        {fotos.length > 1 && (
          <div className="flex gap-2 p-3 bg-muted/40 border-b overflow-x-auto">
            {fotos.map((f, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActivePhotoIdx(idx)}
                className={cn(
                  "relative w-16 h-12 rounded-md overflow-hidden border-2 flex-shrink-0 transition-all",
                  activePhotoIdx === idx ? "border-primary scale-105" : "border-transparent opacity-70 hover:opacity-100",
                )}
              >
                <img src={f} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}

        {/* Corpo com especificações técnicas e métricas */}
        <div className="p-4 sm:p-6 space-y-4 max-h-[50vh] overflow-y-auto">
          {/* Grid de Especificações */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border bg-muted/30 p-3">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">
                Formato
              </span>
              <span className="text-sm font-semibold text-foreground mt-0.5 block truncate">
                {asset.formato}
              </span>
            </div>

            <div className="rounded-xl border bg-muted/30 p-3">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">
                Dimensões / Resolução
              </span>
              <span className="text-sm font-semibold text-foreground mt-0.5 block truncate">
                {asset.dimensoes || "Padrão da Categoria"}
              </span>
            </div>

            <div className="rounded-xl border bg-muted/30 p-3">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">
                Fluxo Estimado
              </span>
              <span className="text-sm font-semibold text-foreground mt-0.5 block truncate">
                {asset.fluxo_diario ? (
                  <span className="flex items-center gap-1">
                    <Car className="size-3.5 text-blue-500" />
                    {Number(asset.fluxo_diario).toLocaleString("pt-BR")} /dia
                  </span>
                ) : (
                  "Alto Fluxo Urbano"
                )}
              </span>
            </div>

            <div className="rounded-xl border bg-muted/30 p-3">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">
                Impactos Mensais
              </span>
              <span className="text-sm font-semibold text-foreground mt-0.5 block truncate">
                {asset.impactos_estimados ? (
                  <span className="flex items-center gap-1">
                    <Users className="size-3.5 text-purple-500" />
                    {Number(asset.impactos_estimados).toLocaleString("pt-BR")}
                  </span>
                ) : (
                  "Sob Análise"
                )}
              </span>
            </div>
          </div>

          {/* Endereço Detalhado & Sentido da Via */}
          <div className="rounded-xl border bg-muted/20 p-4 space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Compass className="size-4 text-primary" /> Orientação e Logradouro
            </h4>
            <p className="text-sm text-foreground leading-relaxed">
              <strong>Endereço:</strong> {asset.endereco || `${asset.cidade} - ${asset.uf}`}
            </p>
            {asset.sentido_via && (
              <p className="text-xs text-muted-foreground">
                <strong>Sentido do Fluxo:</strong> {asset.sentido_via}
              </p>
            )}
            {asset.ponto_referencia && (
              <p className="text-xs text-muted-foreground">
                <strong>Ponto de Referência:</strong> {asset.ponto_referencia}
              </p>
            )}
          </div>
        </div>

        {/* Footer com Ações */}
        <DialogFooter className="p-4 sm:p-5 border-t bg-muted/30 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className="gap-1.5"
            >
              {copied ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
              <span>{copied ? "Copiado!" : "Copiar Link"}</span>
            </Button>

            {streetViewUrl && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                asChild
                className="gap-1.5"
              >
                <a href={streetViewUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="size-4" />
                  <span>Street View</span>
                </a>
              </Button>
            )}

            {googleMapsUrl && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                asChild
                className="gap-1.5"
              >
                <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer">
                  <MapPin className="size-4 text-rose-500" />
                  <span>Google Maps</span>
                </a>
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onFocusOnMap && asset.latitude != null && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  onFocusOnMap(asset);
                  onOpenChange(false);
                }}
                className="gap-1.5"
              >
                <Maximize2 className="size-4" />
                <span>Ver no Mapa</span>
              </Button>
            )}

            <Button
              type="button"
              size="sm"
              onClick={() => {
                onOpenChange(false);
                toast.success(
                  `Interesse registrado para o ponto ${asset.codigo_ativo}. Entre em contato com a equipe comercial!`,
                );
              }}
              className="gap-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-semibold shadow-md"
            >
              <Calendar className="size-4" />
              <span>Solicitar Reserva</span>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
