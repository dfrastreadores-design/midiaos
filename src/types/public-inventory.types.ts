/**
 * TIPOS DE ATIVOS DE INVENTÁRIO PÚBLICO — VITRINE WHITE-LABEL (PADRÃO FLUX OOH)
 * REGRA CRÍTICA: Nenhum dado confidencial de parceiro/proprietário é tipado ou exposto aqui.
 */

export type StatusDisponibilidade = "Disponível" | "Reservado" | "Ocupado";

export type CategoriaMidiaSlug = "dooh" | "ooh" | "digital" | "urbano" | "rodoviario" | "outros";

export interface PublicAsset {
  id: string;
  codigo_ativo: string;
  nome_ponto: string;
  tipo_midia: string;
  categoria_slug: CategoriaMidiaSlug;
  formato: string;
  dimensoes?: string | null;
  cidade: string;
  bairro?: string | null;
  uf: string;
  endereco?: string | null;
  latitude: number | null;
  longitude: number | null;
  fotos_urls: string[];
  status_disponibilidade: StatusDisponibilidade;
  valor_tabela?: number | null;
  impactos_estimados?: number | null;
  fluxo_diario?: number | null;
  link_maps?: string | null;
  sentido_via?: string | null;
  ponto_referencia?: string | null;
  ativo: boolean;
  updated_at?: string;
}

export interface InventoryFilterState {
  busca: string;
  cidades: string[];
  midias: string[];
  status: string; // "todos" | "Disponível" | "Reservado" | "Ocupado"
  selectedAssetId?: string | null;
  visualizacaoMapa?: "rua" | "satelite";
}

export const CATEGORIAS_CORES: Record<
  CategoriaMidiaSlug,
  { label: string; pinColor: string; badgeBg: string; badgeText: string; dotClass: string }
> = {
  dooh: {
    label: "Painel LED / DOOH",
    pinColor: "#8b5cf6", // Roxo vibrante
    badgeBg: "bg-purple-500/10 border-purple-500/30",
    badgeText: "text-purple-600 dark:text-purple-400",
    dotClass: "bg-purple-500",
  },
  ooh: {
    label: "Frontlight / Empena",
    pinColor: "#10b981", // Verde esmeralda
    badgeBg: "bg-emerald-500/10 border-emerald-500/30",
    badgeText: "text-emerald-600 dark:text-emerald-400",
    dotClass: "bg-emerald-500",
  },
  rodoviario: {
    label: "Outdoor / Rodovia",
    pinColor: "#3b82f6", // Azul royal
    badgeBg: "bg-blue-500/10 border-blue-500/30",
    badgeText: "text-blue-600 dark:text-blue-400",
    dotClass: "bg-blue-500",
  },
  urbano: {
    label: "Mobiliário / Totem",
    pinColor: "#f59e0b", // Âmbar
    badgeBg: "bg-amber-500/10 border-amber-500/30",
    badgeText: "text-amber-600 dark:text-amber-400",
    dotClass: "bg-amber-500",
  },
  digital: {
    label: "Digital / Mídia Indoor",
    pinColor: "#06b6d4", // Ciano
    badgeBg: "bg-cyan-500/10 border-cyan-500/30",
    badgeText: "text-cyan-600 dark:text-cyan-400",
    dotClass: "bg-cyan-500",
  },
  outros: {
    label: "Outros Formatos",
    pinColor: "#64748b", // Ardósia
    badgeBg: "bg-slate-500/10 border-slate-500/30",
    badgeText: "text-slate-600 dark:text-slate-400",
    dotClass: "bg-slate-500",
  },
};
