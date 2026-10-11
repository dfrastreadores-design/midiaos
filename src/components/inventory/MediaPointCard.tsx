import React, { memo } from "react";
import type { Produto } from "@/components/ProdutoFormDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProdutoFotoImg } from "@/components/ProdutoFotoImg";
import { formatBRL } from "@/lib/mock-data";
import {
  MapPin,
  ExternalLink,
  Eye,
  Maximize2,
  Navigation,
  Pencil,
  Trash2,
  Handshake,
  Users,
  TrendingUp,
  Sparkles,
  Camera,
  Layers,
  CheckCircle2,
  AlertCircle,
  Clock,
  Ban,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MediaPointCardProps {
  produto: Produto;
  isSelected?: boolean;
  onSelect?: (produto: Produto) => void;
  onEdit?: (produto: Produto) => void;
  onDelete?: (produto: Produto) => void;
  onOpenGallery?: (fotos: string[], titulo: string) => void;
  onOpenMap?: (produto: Produto) => void;
  canManage?: boolean;
}

export const MediaPointCard = memo(function MediaPointCard({
  produto,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  onOpenGallery,
  onOpenMap,
  canManage = true,
}: MediaPointCardProps) {
  // Imagem Principal e Galeria
  const fotosArray = Array.isArray(produto.fotos) ? produto.fotos : [];
  const fotoPrincipal =
    produto.foto_principal ||
    (fotosArray.length > 0 ? fotosArray[0] : null) ||
    (produto.foto_url ? String(produto.foto_url).trim() : null);
  const totalFotos = fotosArray.length > 0 ? fotosArray.length : fotoPrincipal ? 1 : 0;

  // Localização GPS
  const hasCoords = produto.latitude != null && produto.longitude != null;

  // Status de Disponibilidade
  const statusRaw = String(produto.status_operacional || (produto.ativo === false ? "bloqueado_comercial" : "disponivel")).toLowerCase();
  
  let statusLabel = "Disponível";
  let statusBadgeClass = "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30";
  let statusDotClass = "bg-emerald-500 shadow-emerald-500/50";
  let StatusIcon = CheckCircle2;

  if (statusRaw.includes("reserv")) {
    statusLabel = "Reservado";
    statusBadgeClass = "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30";
    statusDotClass = "bg-amber-500 shadow-amber-500/50";
    StatusIcon = Clock;
  } else if (statusRaw.includes("veicul") || statusRaw.includes("ocupado")) {
    statusLabel = "Em Veiculação";
    statusBadgeClass = "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30";
    statusDotClass = "bg-blue-500 shadow-blue-500/50";
    StatusIcon = AlertCircle;
  } else if (statusRaw.includes("bloque") || statusRaw.includes("inativ")) {
    statusLabel = "Bloqueado";
    statusBadgeClass = "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30";
    statusDotClass = "bg-rose-500 shadow-rose-500/50";
    StatusIcon = Ban;
  }

  // Valores
  const valorTabela = Number(produto.valor_unit) || 0;
  const valorNegociado =
    produto.valor_negociado !== undefined && produto.valor_negociado !== null && Number(produto.valor_negociado) > 0
      ? Number(produto.valor_negociado)
      : valorTabela;

  // Dimensões
  const dimensaoExibida =
    produto.dimensao ||
    produto.dimensoes_cm ||
    produto.dimensoes_pixels ||
    produto.formato ||
    (produto.formato_tela ? `${produto.formato_tela} (${produto.resolucao || ""})` : null);

  // Fluxo e Público
  const fluxoExibido =
    produto.fluxo_estimado != null
      ? Number(produto.fluxo_estimado)
      : produto.impactos_estimados != null
        ? Number(produto.impactos_estimados)
        : null;

  return (
    <div
      onClick={() => onSelect?.(produto)}
      className={cn(
        "group relative flex flex-col rounded-2xl border bg-card text-card-foreground shadow-xs transition-all duration-200 overflow-hidden hover:shadow-md hover:border-primary/50",
        isSelected && "ring-2 ring-primary border-primary bg-primary/5 shadow-md",
      )}
    >
      {/* 1. Imagem Principal com Aspecto Visual 16:10 */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted/60">
        {fotoPrincipal ? (
          <ProdutoFotoImg
            stored={fotoPrincipal}
            alt={produto.nome}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            showLoadingSpinner
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-muted/50 to-muted text-muted-foreground/60 p-4 text-center">
            <Sparkles className="size-8 mb-1.5 opacity-40 text-primary" />
            <span className="text-xs font-semibold text-foreground/70">{produto.tipo || produto.midia}</span>
            <span className="text-[10px] text-muted-foreground">Ponto sem foto cadastrada</span>
          </div>
        )}

        {/* Gradiente sutil para leitura dos badges */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent pointer-events-none" />

        {/* Top Badges: Tipo de Mídia & Status */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1.5">
          <Badge
            variant="outline"
            className="text-[10px] font-bold uppercase tracking-wider backdrop-blur-md bg-background/90 text-foreground border-border/80 shadow-xs"
          >
            {produto.midia} {produto.tipo ? `• ${produto.tipo}` : ""}
          </Badge>

          <div className="flex items-center gap-1.5">
            <span className={cn("size-2 rounded-full shadow-xs animate-pulse", statusDotClass)} />
            <Badge
              variant="outline"
              className={cn("text-[10px] px-2 py-0.5 h-5 font-bold border backdrop-blur-md bg-background/90", statusBadgeClass)}
            >
              <StatusIcon className="size-3 mr-1 inline" />
              {statusLabel}
            </Badge>
          </div>
        </div>

        {/* Bottom Imagem: Contador da Galeria & GPS */}
        <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2 text-white text-xs">
          {totalFotos > 0 && onOpenGallery ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenGallery(fotosArray.length > 0 ? fotosArray : [fotoPrincipal!], produto.nome);
              }}
              className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-black/60 hover:bg-black/80 backdrop-blur-md transition-colors"
              title="Abrir galeria de fotos"
            >
              <Camera className="size-3 text-sky-400" />
              <span>{totalFotos} {totalFotos === 1 ? "foto" : "fotos"}</span>
            </button>
          ) : <div />}

          {hasCoords && onOpenMap && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenMap(produto);
              }}
              className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-primary/80 hover:bg-primary text-primary-foreground backdrop-blur-md transition-colors shadow-xs"
              title="Visualizar este ponto no mapa interativo"
            >
              <MapPin className="size-3" />
              <span>Ver no Mapa</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Informações Principais do Ponto */}
      <div className="flex-1 p-4 flex flex-col justify-between space-y-3">
        <div className="space-y-1.5">
          {/* Nome do Ponto */}
          <h3 className="text-sm font-bold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
            {produto.nome}
          </h3>

          {/* Localização e Endereço */}
          <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <MapPin className="size-3.5 text-rose-500 shrink-0 mt-0.5" />
            <span className="line-clamp-2">
              {produto.endereco_ponto ? produto.endereco_ponto : "Endereço não informado"}
              {produto.bairro ? ` • ${produto.bairro}` : ""}
              {produto.sentido_via ? ` • ${produto.sentido_via}` : ""}
            </span>
          </div>

          {/* Origem do Inventário */}
          {produto.parceiro_nome || produto.origem_produto === "PARCEIRO" ? (
            <div className="flex items-center gap-1 text-[11px] font-medium text-purple-700 dark:text-purple-300">
              <Handshake className="size-3 text-purple-600 shrink-0" />
              <span className="truncate">
                Parceiro: <strong className="font-semibold">{produto.parceiro_nome || "Parceiro Homologado"}</strong>
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-[11px] font-medium text-sky-700 dark:text-sky-300">
              <Building2 className="size-3 text-sky-600 shrink-0" />
              <span className="truncate">
                Inventário: <strong className="font-semibold">Próprio Nexo</strong>
              </span>
            </div>
          )}
        </div>

        {/* 3. Dados Técnicos: Formato, Dimensão, Fluxo e Público */}
        <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-muted/40 border border-border/60 text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-muted-foreground block">Dimensão / Formato</span>
            <span className="font-semibold text-foreground truncate block">
              {dimensaoExibida ? dimensaoExibida : "Padrão"}
            </span>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-muted-foreground block">Fluxo Estimado</span>
            <span className="font-semibold text-foreground flex items-center gap-1">
              <TrendingUp className="size-3 text-emerald-600 shrink-0" />
              {fluxoExibido != null ? `${fluxoExibido.toLocaleString("pt-BR")} /mês` : "Não mensurado"}
            </span>
          </div>

          {produto.publico_alvo && (
            <div className="col-span-2 pt-1 border-t border-border/40">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">Público-Alvo</span>
              <span className="text-[11px] text-muted-foreground line-clamp-1">
                {produto.publico_alvo}
              </span>
            </div>
          )}
        </div>

        {/* 4. Valores: Tabela & Negociado */}
        <div className="pt-2 border-t border-border/60 flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase font-bold text-muted-foreground">Valor Tabela</div>
            <div className="text-base font-bold text-foreground font-mono">
              {formatBRL(valorTabela)}
            </div>
          </div>

          {valorNegociado !== valorTabela && (
            <div className="text-right">
              <div className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400">
                Valor Negociado
              </div>
              <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                {formatBRL(valorNegociado)}
              </div>
            </div>
          )}
        </div>

        {/* 5. Ações Rápidas de Gestão */}
        {canManage && (
          <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-border/40">
            <div className="flex items-center gap-1">
              {hasCoords && (
                <a
                  href={`https://www.google.com/maps?q=${produto.latitude},${produto.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-primary transition-colors"
                  title="Abrir no Google Maps"
                >
                  <ExternalLink className="size-3.5" />
                </a>
              )}

              {produto.link_modelo && (
                <a
                  href={produto.link_modelo}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-primary transition-colors text-[11px] font-semibold"
                  title="Ver Mídia Kit / Apresentação"
                >
                  Mídia Kit
                </a>
              )}
            </div>

            <div className="flex items-center gap-1">
              {onEdit && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(produto);
                  }}
                  className="h-7 px-2.5 text-xs font-semibold gap-1 rounded-lg"
                >
                  <Pencil className="size-3" />
                  Editar
                </Button>
              )}

              {onDelete && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(produto);
                  }}
                  className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 rounded-lg"
                  title="Excluir ponto"
                >
                  <Trash2 className="size-3" />
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
