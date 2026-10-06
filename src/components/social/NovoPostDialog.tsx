import { useRef, useState, useEffect, useMemo, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Sparkles,
  Calendar,
  Clock,
  Image as ImageIcon,
  Send,
  Eye,
  Check,
  Instagram,
  Facebook,
  Linkedin,
  Video,
  Target,
  TrendingUp,
  Loader2,
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import {
  PLATAFORMAS_CONFIG,
  PlataformaSocial,
  SocialConta,
  SocialPost,
  gerarCopySocialMediaIA,
} from "@/lib/social-media.functions";

interface NovoPostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contas: SocialConta[];
  postToEdit?: SocialPost | null;
  onSave: (postData: Partial<SocialPost>) => Promise<void>;
  initialCopy?: {
    titulo?: string;
    conteudo?: string;
    hashtags?: string;
    cta?: string;
  };
}

export function NovoPostDialog({
  open,
  onOpenChange,
  contas,
  postToEdit,
  onSave,
  initialCopy,
}: NovoPostDialogProps) {
  const [selectedPlataformas, setSelectedPlataformas] = useState<PlataformaSocial[]>(
    postToEdit?.plataformas || ["instagram"],
  );
  const [formato, setFormato] = useState<SocialPost["formato"]>(postToEdit?.formato || "feed");
  const [titulo, setTitulo] = useState(postToEdit?.titulo || initialCopy?.titulo || "");
  const [conteudo, setConteudo] = useState(postToEdit?.conteudo || initialCopy?.conteudo || "");
  const [hashtags, setHashtags] = useState(postToEdit?.hashtags || initialCopy?.hashtags || "");
  const [midiaUrl, setMidiaUrl] = useState(postToEdit?.midia_urls?.[0] || "");
  const [dataAgendamento, setDataAgendamento] = useState(postToEdit?.data_agendamento || "");
  const [isAnuncio, setIsAnuncio] = useState(postToEdit?.tipo_anuncio || false);
  const [objetivoAnuncio, setObjetivoAnuncio] = useState(
    postToEdit?.meta_ads_data?.objetivo_campanha || "leads",
  );
  const [ctaAnuncio, setCtaAnuncio] = useState(
    postToEdit?.meta_ads_data?.cta || initialCopy?.cta || "Saiba Mais",
  );
  const [urlDestino, setUrlDestino] = useState(
    postToEdit?.meta_ads_data?.url_destino || "https://",
  );
  const [budgetDiario, setBudgetDiario] = useState(
    postToEdit?.meta_ads_data?.budget_diario?.toString() || "50",
  );
  const [publicoAlvo, setPublicoAlvo] = useState(
    postToEdit?.meta_ads_data?.publico ||
      "Homens e Mulheres, 25-54 anos, Interessados em Mídia e Negócios",
  );

  // IA inline assist
  const [isGerandoIa, setIsGerandoIa] = useState(false);
  const [iaTema, setIaTema] = useState("");
  const [iaTom, setIaTom] = useState<"persuasivo" | "descontraido" | "corporativo" | "urgencia">(
    "persuasivo",
  );
  const [showIaBox, setShowIaBox] = useState(false);

  // Visualizador mobile
  const [previewTab, setPreviewTab] = useState<"instagram" | "linkedin" | "meta_ads">("instagram");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const togglePlataforma = (plat: PlataformaSocial) => {
    if (selectedPlataformas.includes(plat)) {
      if (selectedPlataformas.length > 1) {
        setSelectedPlataformas(selectedPlataformas.filter((p) => p !== plat));
      } else {
        toast.info("Selecione pelo menos uma rede social.");
      }
    } else {
      setSelectedPlataformas([...selectedPlataformas, plat]);
    }
  };

  const handleGerarComIa = async () => {
    if (!iaTema.trim()) {
      toast.error("Digite o tema ou produto para gerar com a IA.");
      return;
    }
    setIsGerandoIa(true);
    try {
      const targetPlat = selectedPlataformas[0] || "instagram";
      const result = await gerarCopySocialMediaIA({
        data: {
          tema_ou_produto: iaTema,
          plataforma: targetPlat,
          formato: isAnuncio
            ? "anuncio_trafego"
            : formato === "reels"
              ? "reels"
              : formato === "carrossel"
                ? "carrossel"
                : "feed",
          objetivo: isAnuncio ? "leads" : "engajamento",
          tom_de_voz: iaTom,
        },
      });

      if (result) {
        setTitulo(result.titulo || "");
        setConteudo(result.copy_principal || "");
        setHashtags(result.hashtags || "");
        if (result.chamada_acao) {
          setCtaAnuncio(result.chamada_acao);
        }
        toast.success("Conteúdo gerado com sucesso pela IA!");
        setShowIaBox(false);
      }
    } catch (err: any) {
      toast.error("Erro ao gerar conteúdo com IA: " + (err.message || "Tente novamente."));
    } finally {
      setIsGerandoIa(false);
    }
  };

  const handleSubmit = async (status: "rascunho" | "agendado" | "publicado") => {
    if (!conteudo.trim()) {
      toast.error("O texto da publicação não pode estar vazio.");
      return;
    }

    if (status === "agendado" && !dataAgendamento) {
      toast.error("Defina a data e o horário para o agendamento.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: Partial<SocialPost> = {
        id: postToEdit?.id,
        plataformas: selectedPlataformas,
        formato,
        titulo: titulo.trim() || undefined,
        conteudo: conteudo.trim(),
        hashtags: hashtags.trim() || undefined,
        midia_urls: midiaUrl.trim() ? [midiaUrl.trim()] : [],
        status,
        data_agendamento: status === "agendado" ? dataAgendamento : null,
        data_publicacao: status === "publicado" ? new Date().toISOString() : null,
        tipo_anuncio: isAnuncio,
        meta_ads_data: isAnuncio
          ? {
              objetivo_campanha: objetivoAnuncio,
              cta: ctaAnuncio,
              url_destino: urlDestino,
              budget_diario: parseFloat(budgetDiario) || 50,
              publico: publicoAlvo,
            }
          : undefined,
      };

      await onSave(payload);
      toast.success(
        status === "publicado"
          ? "Publicação enviada para as redes!"
          : status === "agendado"
            ? "Publicação agendada com sucesso!"
            : "Rascunho salvo com sucesso!",
      );
      onOpenChange(false);
    } catch (err: any) {
      toast.error("Falha ao salvar post: " + (err.message || "Erro inesperado"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="p-6 pb-4 border-b border-border/60 bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                <Sparkles className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold tracking-tight">
                  {postToEdit ? "Editar Publicação" : "Criar Nova Publicação ou Campanha"}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Publique ou agende em múltiplas redes simultaneamente com inteligência artificial
                  integrada.
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-border/60">
          {/* Lado Esquerdo: Formulário de Configuração & Conteúdo (7 colunas) */}
          <div className="lg:col-span-7 p-6 space-y-6">
            {/* Seleção de Plataformas */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                1. Selecione as Redes de Destino
              </Label>
              <div className="flex flex-wrap gap-2 pt-1">
                {(
                  ["instagram", "facebook", "tiktok", "linkedin", "meta_ads"] as PlataformaSocial[]
                ).map((plat) => {
                  const isSelected = selectedPlataformas.includes(plat);
                  const cfg = PLATAFORMAS_CONFIG[plat];
                  return (
                    <button
                      key={plat}
                      type="button"
                      onClick={() => togglePlataforma(plat)}
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                        isSelected
                          ? `${cfg.bg} ring-2 ring-primary/40 font-semibold shadow-xs scale-102`
                          : "bg-muted/40 text-muted-foreground border-border hover:bg-muted/80 opacity-70"
                      }`}
                    >
                      <div className="size-2 rounded-full" style={{ backgroundColor: cfg.cor }} />
                      <span>{cfg.nome}</span>
                      {isSelected && <Check className="size-3 text-primary ml-0.5" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Formato e Tipo de Veiculação */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">
                  Formato do Post
                </Label>
                <Select
                  value={formato}
                  onValueChange={(val: any) => {
                    setFormato(val);
                    if (val === "anuncio") setIsAnuncio(true);
                  }}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Selecione o formato" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="feed">📸 Feed Tradicional (1:1 / 4:5)</SelectItem>
                    <SelectItem value="reels">🎬 Reels / Vídeo Curto (9:16)</SelectItem>
                    <SelectItem value="carrossel">📑 Carrossel Sequencial</SelectItem>
                    <SelectItem value="story">⏱️ Stories Interativos</SelectItem>
                    <SelectItem value="anuncio">🎯 Anúncio Pago (Gestor de Tráfego)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 flex flex-col justify-end">
                <div className="flex items-center justify-between border border-border/70 rounded-lg p-2 bg-muted/10 h-9">
                  <div className="flex items-center gap-1.5">
                    <Target className="size-4 text-primary" />
                    <span className="text-xs font-medium">Anúncio de Tráfego</span>
                  </div>
                  <Switch
                    checked={isAnuncio}
                    onCheckedChange={(checked) => {
                      setIsAnuncio(checked);
                      if (checked) setFormato("anuncio");
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Painel Expansível de IA */}
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-4 text-primary" />
                  <span className="text-xs font-bold text-primary tracking-wide">
                    Assistente Copywriter com IA
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-primary hover:text-primary hover:bg-primary/10 px-2"
                  onClick={() => setShowIaBox(!showIaBox)}
                >
                  {showIaBox ? "Ocultar" : "✨ Abrir Gerador de Copy"}
                </Button>
              </div>

              {showIaBox && (
                <div className="space-y-3 pt-1 border-t border-primary/15 animate-in fade-in-50 duration-200">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-medium text-foreground">
                      Sobre o que é a postagem ou anúncio?
                    </Label>
                    <Input
                      placeholder="Ex: Lançamento de painéis DOOH em shoppings e aeroportos com 30% off"
                      value={iaTema}
                      onChange={(e) => setIaTema(e.target.value)}
                      className="h-8 text-xs bg-background"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[11px] text-muted-foreground">Tom de Voz</Label>
                      <Select value={iaTom} onValueChange={(val: any) => setIaTom(val)}>
                        <SelectTrigger className="h-8 text-xs bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="persuasivo">Persuasivo & Conversão</SelectItem>
                          <SelectItem value="descontraido">Descontraído & Viral</SelectItem>
                          <SelectItem value="corporativo">Corporativo B2B</SelectItem>
                          <SelectItem value="urgencia">Gatilho de Urgência</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-end">
                      <Button
                        type="button"
                        size="sm"
                        disabled={isGerandoIa}
                        onClick={handleGerarComIa}
                        className="w-full h-8 text-xs bg-primary text-primary-foreground font-semibold hover:bg-primary/90"
                      >
                        {isGerandoIa ? (
                          <>
                            <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                            Gerando...
                          </>
                        ) : (
                          <>
                            <Sparkles className="size-3.5 mr-1.5" />
                            Preencher com IA
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Conteúdo do Post */}
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-muted-foreground">
                  Título / Gancho Principal (Primeiros 3 segundos)
                </Label>
                <Input
                  placeholder="Ex: O Segredo para Multiplicar seu Alcance em 2026 🚀"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-muted-foreground">
                    Legenda da Publicação / Copy
                  </Label>
                  <span className="text-[11px] text-muted-foreground">
                    {conteudo.length} caracteres
                  </span>
                </div>
                <Textarea
                  placeholder="Escreva a legenda com emojis, espaçamento e chamada para ação..."
                  rows={5}
                  value={conteudo}
                  onChange={(e) => setConteudo(e.target.value)}
                  className="text-sm font-sans resize-y leading-relaxed"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-muted-foreground">
                  Hashtags Estratégicas
                </Label>
                <Input
                  placeholder="#MidiaDOOH #MarketingDigital #GestaoDeTrafego #Branding"
                  value={hashtags}
                  onChange={(e) => setHashtags(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-muted-foreground">
                  URL da Imagem / Vídeo do Criativo
                </Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="https://exemplo.com/criativo-campanha.jpg"
                    value={midiaUrl}
                    onChange={(e) => setMidiaUrl(e.target.value)}
                    className="h-8 text-xs"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 px-2.5 text-xs shrink-0"
                    onClick={() => {
                      setMidiaUrl(
                        "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&auto=format&fit=crop&q=80",
                      );
                      toast.info("Imagem de demonstração inserida!");
                    }}
                  >
                    <ImageIcon className="size-3.5 mr-1" />
                    Demo Img
                  </Button>
                </div>
              </div>
            </div>

            {/* Parâmetros Específicos para Gestor de Tráfego (se isAnuncio = true) */}
            {isAnuncio && (
              <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/40 dark:bg-indigo-950/20 space-y-3">
                <div className="flex items-center gap-2">
                  <Target className="size-4 text-indigo-600 dark:text-indigo-400" />
                  <span className="text-xs font-bold text-indigo-900 dark:text-indigo-300">
                    Configurações do Gestor de Tráfego Pago (Meta & Google Ads)
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[11px] text-muted-foreground">
                      Objetivo de Campanha
                    </Label>
                    <Select value={objetivoAnuncio} onValueChange={setObjetivoAnuncio}>
                      <SelectTrigger className="h-8 text-xs bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="leads">Geração de Leads (WhatsApp / Form)</SelectItem>
                        <SelectItem value="conversoes">Vendas & Conversões no Site</SelectItem>
                        <SelectItem value="trafego">
                          Tráfego Qualificado para Landing Page
                        </SelectItem>
                        <SelectItem value="alcance">Reconhecimento & Alcance Máximo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-[11px] text-muted-foreground">Botão de Ação (CTA)</Label>
                    <Select value={ctaAnuncio} onValueChange={setCtaAnuncio}>
                      <SelectTrigger className="h-8 text-xs bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Saiba Mais">Saiba Mais</SelectItem>
                        <SelectItem value="Fale no WhatsApp">Fale no WhatsApp</SelectItem>
                        <SelectItem value="Cadastre-se">Cadastre-se</SelectItem>
                        <SelectItem value="Comprar Agora">Comprar Agora</SelectItem>
                        <SelectItem value="Solicitar Proposta">Solicitar Proposta</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[11px] text-muted-foreground">
                      URL de Destino (Link)
                    </Label>
                    <Input
                      value={urlDestino}
                      onChange={(e) => setUrlDestino(e.target.value)}
                      placeholder="https://seusite.com.br/lp-oferta"
                      className="h-8 text-xs bg-background"
                    />
                  </div>

                  <div>
                    <Label className="text-[11px] text-muted-foreground">
                      Orçamento Diário Sugerido (R$)
                    </Label>
                    <Input
                      type="number"
                      value={budgetDiario}
                      onChange={(e) => setBudgetDiario(e.target.value)}
                      placeholder="50"
                      className="h-8 text-xs bg-background"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-[11px] text-muted-foreground">Público e Interesses</Label>
                  <Input
                    value={publicoAlvo}
                    onChange={(e) => setPublicoAlvo(e.target.value)}
                    placeholder="Ex: Empreendedores, Diretores de Marketing, 30-55 anos"
                    className="h-8 text-xs bg-background"
                  />
                </div>
              </div>
            )}

            {/* Agendamento de Horário */}
            <div className="p-3.5 rounded-xl border border-border/60 bg-muted/20 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Calendar className="size-4 text-muted-foreground" />
                  <span className="text-xs font-semibold">Agendar Publicação</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-6 text-[10px] px-2"
                    onClick={() => {
                      const d = new Date();
                      d.setHours(18, 30, 0, 0);
                      setDataAgendamento(d.toISOString().slice(0, 16));
                    }}
                  >
                    Hoje 18:30
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-6 text-[10px] px-2"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() + 1);
                      d.setHours(12, 0, 0, 0);
                      setDataAgendamento(d.toISOString().slice(0, 16));
                    }}
                  >
                    Amanhã 12:00
                  </Button>
                </div>
              </div>
              <Input
                type="datetime-local"
                value={dataAgendamento}
                onChange={(e) => setDataAgendamento(e.target.value)}
                className="h-8 text-xs bg-background"
              />
            </div>
          </div>

          {/* Lado Direito: Preview em Tempo Real do Mockup da Rede Social (5 colunas) */}
          <div className="lg:col-span-5 p-6 bg-muted/10 flex flex-col items-center">
            <div className="w-full flex items-center justify-between mb-4">
              <div className="flex items-center gap-1.5">
                <Eye className="size-4 text-muted-foreground" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Prévia em Tempo Real
                </span>
              </div>
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant={previewTab === "instagram" ? "default" : "outline"}
                  size="sm"
                  className="h-6 text-[10px] px-2"
                  onClick={() => setPreviewTab("instagram")}
                >
                  Instagram
                </Button>
                <Button
                  type="button"
                  variant={previewTab === "linkedin" ? "default" : "outline"}
                  size="sm"
                  className="h-6 text-[10px] px-2"
                  onClick={() => setPreviewTab("linkedin")}
                >
                  LinkedIn
                </Button>
                <Button
                  type="button"
                  variant={previewTab === "meta_ads" ? "default" : "outline"}
                  size="sm"
                  className="h-6 text-[10px] px-2"
                  onClick={() => setPreviewTab("meta_ads")}
                >
                  Meta Ads
                </Button>
              </div>
            </div>

            {/* Mockup de Celular / Feed */}
            <div className="w-full max-w-[340px] bg-background border border-border/80 rounded-2xl shadow-xl overflow-hidden text-xs select-none transition-all">
              {/* Header do Post */}
              <div className="p-3 flex items-center justify-between border-b border-border/40">
                <div className="flex items-center gap-2.5">
                  <div className="size-8 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 p-0.5">
                    <img
                      src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80"
                      alt="Avatar"
                      className="size-full rounded-full object-cover border border-background"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-1 font-semibold leading-tight text-foreground">
                      <span>Nexo Mídia</span>
                      {previewTab === "meta_ads" && (
                        <Badge
                          variant="outline"
                          className="text-[9px] px-1 py-0 h-4 border-indigo-300 text-indigo-600"
                        >
                          Patrocinado
                        </Badge>
                      )}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {previewTab === "linkedin"
                        ? "Empresa de Publicidade e Mídia • 12.800 seguidores"
                        : "@nexomidia.oficial"}
                    </div>
                  </div>
                </div>
                <div className="text-muted-foreground text-sm font-bold">•••</div>
              </div>

              {/* Mídia do Post */}
              <div className="w-full aspect-square bg-slate-900/90 relative overflow-hidden flex items-center justify-center">
                {midiaUrl ? (
                  <img
                    src={midiaUrl}
                    alt="Criativo"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src =
                        "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&auto=format&fit=crop&q=80";
                    }}
                  />
                ) : (
                  <div className="text-center p-6 text-slate-400 space-y-2">
                    <ImageIcon className="size-10 mx-auto opacity-40" />
                    <p className="text-xs">Nenhuma imagem selecionada</p>
                    <p className="text-[10px] text-slate-500">
                      Cole a URL da mídia para visualizar
                    </p>
                  </div>
                )}

                {isAnuncio && (
                  <div className="absolute bottom-0 inset-x-0 bg-slate-950/80 backdrop-blur-xs p-2 flex items-center justify-between text-white border-t border-white/10">
                    <div className="truncate pr-2">
                      <div className="text-[10px] text-slate-300 font-mono truncate">
                        {urlDestino || "nexomidia.com.br"}
                      </div>
                      <div className="font-semibold text-xs truncate">
                        {titulo || "Conheça nossas soluções"}
                      </div>
                    </div>
                    <div className="bg-indigo-600 text-white font-medium text-[10px] px-2.5 py-1 rounded shadow-xs shrink-0 flex items-center gap-1">
                      <span>{ctaAnuncio}</span>
                      <ExternalLink className="size-2.5" />
                    </div>
                  </div>
                )}
              </div>

              {/* Ações e Legenda */}
              <div className="p-3 space-y-2">
                <div className="flex items-center justify-between text-foreground">
                  <div className="flex items-center gap-3">
                    <Heart className="size-4.5 hover:text-rose-500 transition-colors cursor-pointer" />
                    <MessageCircle className="size-4.5 cursor-pointer" />
                    <Share2 className="size-4.5 cursor-pointer" />
                  </div>
                  <Bookmark className="size-4.5 cursor-pointer" />
                </div>

                <div className="text-[11px] font-semibold text-foreground">3.418 curtidas</div>

                {/* Texto da Legenda */}
                <div className="text-[11px] text-foreground leading-snug space-y-1">
                  {titulo && <div className="font-bold text-primary mb-1">{titulo}</div>}
                  <p className="line-clamp-4 whitespace-pre-line text-slate-700 dark:text-slate-300">
                    {conteudo || "Sua copy aparecerá aqui em tempo real enquanto você digita..."}
                  </p>
                  {hashtags && (
                    <div className="text-primary font-medium text-[10px] pt-1">{hashtags}</div>
                  )}
                </div>

                <div className="text-[10px] text-muted-foreground pt-1 border-t border-border/40">
                  {dataAgendamento
                    ? `Agendado para: ${new Date(dataAgendamento).toLocaleString("pt-BR")}`
                    : "Pronto para publicação imediata"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Rodapé com Ações */}
        <DialogFooter className="p-4 border-t border-border/60 bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-emerald-500 inline-block" />
            <span>Destino configurado para {selectedPlataformas.length} rede(s)</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSubmitting}
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={isSubmitting}
              onClick={() => handleSubmit("rascunho")}
            >
              Salvar Rascunho
            </Button>

            {dataAgendamento ? (
              <Button
                type="button"
                size="sm"
                disabled={isSubmitting}
                onClick={() => handleSubmit("agendado")}
                className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
              >
                {isSubmitting ? (
                  <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Calendar className="size-3.5 mr-1.5" />
                )}
                Agendar Publicação
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                disabled={isSubmitting}
                onClick={() => handleSubmit("publicado")}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              >
                {isSubmitting ? (
                  <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Send className="size-3.5 mr-1.5" />
                )}
                Publicar Agora
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
