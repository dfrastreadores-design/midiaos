/**
 * TIPOS E ESTRUTURAS DO ECOSSISTEMA DE REDES SOCIAIS, TRÁFEGO PAGO & INSIGHTS IA
 * Vinculado a clientes anunciantes no Mídia.OS
 */

export type SocialPlatform =
  | "instagram"
  | "facebook"
  | "meta_ads"
  | "google_ads"
  | "tiktok"
  | "linkedin";

export type ConnectionStatus = "connected" | "disconnected" | "expired";

export interface ClientSocialAccount {
  id: string;
  tenant_id?: string | null;
  client_id: string;
  platform: SocialPlatform;
  account_name: string;
  account_id?: string | null;
  profile_url?: string | null;
  access_token?: string | null;
  refresh_token?: string | null;
  token_expires_at?: string | null;
  connection_status: ConnectionStatus;
  last_synced_at?: string | null;
  created_at?: string;
  updated_at?: string;

  // Joined client info
  client?: {
    id: string;
    nome_fantasia?: string | null;
    razao_social: string;
    logo_url?: string | null;
  } | null;
}

export interface SocialTrafficMetric {
  id: string;
  tenant_id?: string | null;
  account_id: string;
  metric_date: string; // YYYY-MM-DD
  platform: SocialPlatform | string;
  impressions: number;
  reach: number;
  clicks: number;
  ctr: number;
  spend: number;
  conversions: number;
  cpa: number;
  roas: number;
  followers_total: number;
  followers_growth: number;
  engagement_rate: number;
  raw_data?: Record<string, any> | null;
  created_at?: string;

  account?: ClientSocialAccount | null;
}

export type PostType =
  | "feed_image"
  | "carousel"
  | "reels"
  | "story"
  | "text_only";

export type PostStatus =
  | "draft"
  | "scheduled"
  | "publishing"
  | "published"
  | "failed";

export interface SocialScheduledPost {
  id: string;
  tenant_id?: string | null;
  client_id: string;
  account_id?: string | null;
  platforms: SocialPlatform[];
  post_type: PostType;
  caption: string;
  media_urls: string[];
  scheduled_for: string; // ISO timestamp
  status: PostStatus;
  error_message?: string | null;
  published_post_id?: string | null;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;

  // Joins
  client?: {
    id: string;
    nome_fantasia?: string | null;
    razao_social: string;
    logo_url?: string | null;
  } | null;
  account?: ClientSocialAccount | null;
}

export type AiInsightCategory =
  | "budget_optimization"
  | "creative_performance"
  | "audience_targeting"
  | "posting_schedule"
  | "churn_alert";

export type ExpectedImpact = "alto" | "medio" | "baixo";

export type AiInsightStatus = "pending" | "applied" | "dismissed";

export interface AiGrowthInsight {
  id: string;
  tenant_id?: string | null;
  client_id: string;
  account_id?: string | null;
  category: AiInsightCategory;
  title: string;
  recommendation: string;
  expected_impact: ExpectedImpact;
  status: AiInsightStatus;
  created_at?: string;

  account?: ClientSocialAccount | null;
}

export interface ClientTrafficKpiSummary {
  periodoDias: number; // 7, 30, 90
  totalSpend: number;
  totalImpressions: number;
  totalReach: number;
  totalClicks: number;
  avgCtr: number;
  avgCpa: number;
  avgRoas: number;
  totalConversions: number;
  totalFollowers: number;
  followersGrowth: number;
  avgEngagementRate: number;
  contasConectadasCount: number;
  postsAgendadosCount: number;
  insightsPendentesCount: number;
  trend: Array<{
    date: string;
    spend: number;
    reach: number;
    clicks: number;
    conversions: number;
    roas: number;
  }>;
  campaigns: Array<{
    id: string;
    name: string;
    platform: SocialPlatform;
    status: "active" | "paused" | "completed";
    spend: number;
    conversions: number;
    cpa: number;
    roas: number;
  }>;
}

export const SOCIAL_PLATFORMS_META: Record<
  SocialPlatform,
  {
    nome: string;
    icon: string;
    color: string;
    bgColor: string;
    borderColor: string;
    descricao: string;
  }
> = {
  instagram: {
    nome: "Instagram",
    icon: "Instagram",
    color: "#E1306C",
    bgColor: "bg-pink-500/10 text-pink-600 dark:text-pink-400",
    borderColor: "border-pink-300 dark:border-pink-800",
    descricao: "Feed, Reels, Carrosséis e Stories",
  },
  facebook: {
    nome: "Facebook",
    icon: "Facebook",
    color: "#1877F2",
    bgColor: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    borderColor: "border-blue-300 dark:border-blue-800",
    descricao: "Páginas, Feed e Comunidades",
  },
  meta_ads: {
    nome: "Meta Ads (Tráfego)",
    icon: "Target",
    color: "#0081FB",
    bgColor: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
    borderColor: "border-indigo-300 dark:border-indigo-800",
    descricao: "Campanhas de Tráfego e Conversão",
  },
  google_ads: {
    nome: "Google Ads (Search & Performance)",
    icon: "TrendingUp",
    color: "#4285F4",
    bgColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    borderColor: "border-emerald-300 dark:border-emerald-800",
    descricao: "Busca Paga, Rede de Display e PMax",
  },
  tiktok: {
    nome: "TikTok",
    icon: "Video",
    color: "#000000",
    bgColor: "bg-slate-500/10 text-slate-800 dark:text-slate-200",
    borderColor: "border-slate-300 dark:border-slate-700",
    descricao: "Vídeos Curtos e Tráfego TikTok Ads",
  },
  linkedin: {
    nome: "LinkedIn",
    icon: "Linkedin",
    color: "#0A66C2",
    bgColor: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    borderColor: "border-sky-300 dark:border-sky-800",
    descricao: "Páginas B2B e Artigos de Autoridade",
  },
};

export const POST_TYPES_CONFIG: Record<
  PostType,
  { label: string; icon: string; descricao: string }
> = {
  feed_image: {
    label: "Imagem Única",
    icon: "Image",
    descricao: "Post quadrado ou retrato no Feed",
  },
  carousel: {
    label: "Carrossel",
    icon: "Layers",
    descricao: "Sequência de slides educativos ou catálogo",
  },
  reels: {
    label: "Reels / Vídeo Curto",
    icon: "Video",
    descricao: "Vídeo vertical 9:16 de alta retenção",
  },
  story: {
    label: "Story",
    icon: "Clock",
    descricao: "Publicação temporária de 24 horas",
  },
  text_only: {
    label: "Apenas Texto / Nota",
    icon: "FileText",
    descricao: "Publicações opinativas ou comunicados",
  },
};

export const POST_STATUS_BADGES: Record<
  PostStatus,
  { label: string; corBadge: string }
> = {
  draft: {
    label: "Rascunho",
    corBadge: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-300",
  },
  scheduled: {
    label: "Agendado",
    corBadge: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-300",
  },
  publishing: {
    label: "Disparando...",
    corBadge: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-300 animate-pulse",
  },
  published: {
    label: "Publicado",
    corBadge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-300",
  },
  failed: {
    label: "Falhou",
    corBadge: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-300",
  },
};
