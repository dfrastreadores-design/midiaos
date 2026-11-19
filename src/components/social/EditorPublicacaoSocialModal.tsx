import { useRef, useState, useEffect, useMemo, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sparkles,
  Calendar as CalendarIcon,
  Clock,
  Image as ImageIcon,
  Upload,
  X,
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  MoreHorizontal,
  Layers,
  Video,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Share2,
} from "lucide-react";
import { toast } from "sonner";
import {
  SocialPlatform,
  PostType,
  PostStatus,
  SocialScheduledPost,
  SOCIAL_PLATFORMS_META,
  POST_TYPES_CONFIG,
} from "@/types/client-social-traffic.types";
import {
  saveScheduledPost,
  generateAiCopyAndHashtags,
} from "@/lib/client-social-traffic.functions";
import { supabase } from "@/integrations/supabase/client";

interface EditorPublicacaoSocialModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName?: string;
  clientLogoUrl?: string | null;
  editingPost?: SocialScheduledPost | null;
  onSuccess?: () => void;
}

export function EditorPublicacaoSocialModal({
  open,
  onOpenChange,
  clientId,
  clientName = "Cliente Anunciante",
  clientLogoUrl,
  editingPost,
  onSuccess,
}: EditorPublicacaoSocialModalProps) {
  const qc = useQueryClient();
  const savePostFn = useServerFn(saveScheduledPost);
  const generateAiFn = useServerFn(generateAiCopyAndHashtags);

  // States
  const [platforms, setPlatforms] = useState<SocialPlatform[]>(["instagram"]);
  const [postType, setPostType] = useState<PostType>("feed_image");
  const [caption, setCaption] = useState("");
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Data e hora de agendamento
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("18:30");
  const [status, setStatus] = useState<PostStatus>("scheduled");

  // IA Copy State
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [melhorHorarioDica, setMelhorHorarioDica] = useState("18h30 (Pico de Engajamento)");

  // Preenche dados ao editar ou ao abrir
  useEffect(() => {
    if (editingPost) {
      setPlatforms(editingPost.platforms || ["instagram"]);
      setPostType(editingPost.post_type || "feed_image");
      setCaption(editingPost.caption || "");
      setMediaUrls(editingPost.media_urls || []);
      setStatus(editingPost.status || "scheduled");

      if (editingPost.scheduled_for) {
        const d = new Date(editingPost.scheduled_for);
        setScheduleDate(d.toISOString().slice(0, 10));
        setScheduleTime(
          `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`,
        );
      }
    } else {
      // Padrão: agendado para amanhã às 18:30
      const amanhã = new Date();
      amanhã.setDate(amanhã.getDate() + 1);
      setScheduleDate(amanhã.toISOString().slice(0, 10));
      setScheduleTime("18:30");
      setPlatforms(["instagram"]);
      setPostType("feed_image");
      setCaption("");
      setMediaUrls([]);
      setStatus("scheduled");
    }
  }, [editingPost, open]);

  // Toggle de plataformas
  const togglePlatform = useCallback((plat: SocialPlatform) => {
    setPlatforms((prev) => {
      if (prev.includes(plat)) {
        if (prev.length === 1) {
          toast.error("Selecione ao menos uma plataforma de destino.");
          return prev;
        }
        return prev.filter((p) => p !== plat);
      } else {
        return [...prev, plat];
      }
    });
  }, []);

  // Upload de imagem ou vídeo para o bucket Supabase Storage
  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setUploadingMedia(true);
    try {
      const novasUrls: string[] = [];
      for (const file of files) {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `social-posts/${clientId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;

        const { error: upErr } = await supabase.storage
          .from("partner-logos") // Usando bucket existente seguro
          .upload(path, file, { contentType: file.type, upsert: true });

        if (!upErr) {
          const { data: pubData } = supabase.storage.from("partner-logos").getPublicUrl(path);
          if (pubData?.publicUrl) {
            novasUrls.push(pubData.publicUrl);
            continue;
          }
        }

        // Fallback base64
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
        novasUrls.push(dataUrl);
      }

      setMediaUrls((prev) => [...prev, ...novasUrls]);
      toast.success(`${novasUrls.length} arquivo(s) de mídia anexado(s)!`);
    } catch (err: any) {
      toast.error("Erro no upload de mídia: " + (err?.message || "falha"));
    } finally {
      setUploadingMedia(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Remover foto da lista
  const removeMedia = useCallback((index: number) => {
    setMediaUrls((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Gerar Legenda com IA
  const handleGerarLegendaIA = async () => {
    setAiGenerating(true);
    try {
      const res = await generateAiFn({
        data: {
          briefing: aiPrompt || caption,
          platform: platforms[0] || "instagram",
          postType,
          clienteNome: clientName,
        },
      });

      if (res?.caption) {
        const copyFinal = res.hashtags ? `${res.caption}\n\n${res.hashtags}` : res.caption;
        setCaption(copyFinal);
        if (res.melhorHorario) {
          setMelhorHorarioDica(res.melhorHorario);
        }
        toast.success("Legenda e hashtags geradas pela IA!");
      }
    } catch (err: any) {
      toast.error("Erro ao gerar cópia com IA: " + (err?.message || "falha"));
    } finally {
      setAiGenerating(false);
    }
  };

  // Salvar Post Agendado
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!caption.trim()) {
        throw new Error("Escreva o texto ou legenda da publicação.");
      }
      if (!scheduleDate) {
        throw new Error("Selecione a data de publicação.");
      }

      const scheduledFor = new Date(`${scheduleDate}T${scheduleTime || "12:00"}:00`).toISOString();

      return await savePostFn({
        data: {
          id: editingPost?.id,
          clientId,
          platforms,
          postType,
          caption,
          mediaUrls,
          scheduledFor,
          status,
        },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client_scheduled_posts"] });
      qc.invalidateQueries({ queryKey: ["client_traffic_analytics"] });
      toast.success(
        editingPost ? "Publicação atualizada com sucesso!" : "Publicação agendada no calendário!",
      );
      if (onSuccess) onSuccess();
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao salvar agendamento");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-background">
        <DialogHeader className="p-4 border-b bg-card/60 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-primary" />
                {editingPost ? "Editar Publicação Agendada" : "Novo Agendamento de Conteúdo"}
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Cliente Anunciante: <span className="font-semibold text-foreground">{clientName}</span>
              </p>
            </div>
            <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
              Mídia.OS Social Studio
            </Badge>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LADO ESQUERDO: Formulário do Editor (lg:col-span-7) */}
          <div className="lg:col-span-7 space-y-4">
            {/* 1. Seleção Múltipla de Plataformas */}
            <div>
              <Label className="text-xs font-semibold flex items-center gap-1.5 mb-1.5">
                <Share2 className="w-3.5 h-3.5 text-primary" /> Plataformas de Destino *
              </Label>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(SOCIAL_PLATFORMS_META) as SocialPlatform[]).map((plat) => {
                  const meta = SOCIAL_PLATFORMS_META[plat];
                  const selected = platforms.includes(plat);
                  return (
                    <button
                      key={plat}
                      type="button"
                      onClick={() => togglePlatform(plat)}
                      className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                        selected
                          ? `${meta.bgColor} ${meta.borderColor} ring-1 ring-primary/40 font-bold`
                          : "border-border/60 bg-card text-muted-foreground hover:bg-muted/40"
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: meta.color }} />
                      {meta.nome}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Formato do Post */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold mb-1 block">Formato de Conteúdo</Label>
                <Select value={postType} onValueChange={(v) => setPostType(v as PostType)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(POST_TYPES_CONFIG) as PostType[]).map((t) => (
                      <SelectItem key={t} value={t} className="text-xs">
                        {POST_TYPES_CONFIG[t].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold mb-1 block">Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as PostStatus)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled" className="text-xs">
                      📅 Agendado para Disparo
                    </SelectItem>
                    <SelectItem value="draft" className="text-xs">
                      📝 Rascunho Interno
                    </SelectItem>
                    <SelectItem value="published" className="text-xs">
                      ✅ Já Publicado
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 3. Assistente de IA para Copywriting */}
            <div className="p-3 rounded-xl border border-primary/30 bg-primary/5 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-primary flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Gerador de Legenda & Copywriting com IA
                </Label>
                <span className="text-[10px] text-muted-foreground">Otimizado para Alta Retenção</span>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Ex: Campanha de Black Friday com 30% off nos planos anuais..."
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  className="h-8 text-xs bg-background"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="default"
                  onClick={handleGerarLegendaIA}
                  disabled={aiGenerating}
                  className="h-8 text-xs gap-1.5 shrink-0"
                >
                  {aiGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  {aiGenerating ? "Criando..." : "Gerar"}
                </Button>
              </div>
            </div>

            {/* 4. Campo de Legenda / Copy com Contador */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-xs font-semibold">Legenda / Texto da Publicação *</Label>
                <span className="text-[10px] text-muted-foreground">{caption.length} caracteres</span>
              </div>
              <Textarea
                placeholder="Escreva a legenda com hashtags, quebras de linha e chamada para ação (CTA)..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="text-xs min-h-[110px] resize-y leading-relaxed font-sans"
              />
            </div>

            {/* 5. Upload de Imagens / Vídeos */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-primary" /> Arquivos de Mídia (Fotos ou Vídeos)
                </Label>
                <span className="text-[10px] text-muted-foreground">
                  {mediaUrls.length} arquivo(s) selecionado(s)
                </span>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,video/*"
                className="hidden"
                onChange={handleMediaUpload}
              />

              <div className="flex flex-wrap gap-2 items-center">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingMedia}
                  className="h-8 text-xs gap-1.5"
                >
                  {uploadingMedia ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  {uploadingMedia ? "Enviando..." : "Carregar Mídia"}
                </Button>

                {mediaUrls.map((url, idx) => (
                  <div
                    key={idx}
                    className="relative w-12 h-12 rounded-lg border overflow-hidden bg-muted group shrink-0"
                  >
                    <img src={url} alt={`Mídia ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeMedia(idx)}
                      className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white"
                    >
                      <X className="w-3.5 h-3.5 text-rose-300" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* 6. Agendamento de Data e Hora com Dica de Audiência */}
            <div className="p-3 rounded-xl border border-border/80 bg-muted/20 space-y-2">
              <Label className="text-xs font-bold flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-primary" /> Data e Horário Programado
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[10px] text-muted-foreground">Data da Veiculação</Label>
                  <Input
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    className="h-8 text-xs mt-0.5 bg-background"
                  />
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">Horário</Label>
                  <Input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="h-8 text-xs mt-0.5 bg-background"
                  />
                </div>
              </div>

              <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 pt-0.5">
                <span>💡 Recomendação de IA:</span>
                <span>{melhorHorarioDica}</span>
              </div>
            </div>
          </div>

          {/* LADO DIREITO: Pré-visualização Interativa do Feed (lg:col-span-5) */}
          <div className="lg:col-span-5 flex flex-col items-center justify-start">
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 self-start">
              📱 Pré-Visualização em Tempo Real (Feed do Instagram)
            </Label>

            {/* Mockup de Celular / Feed Instagram */}
            <div className="w-full max-w-[320px] rounded-2xl border-2 border-border/80 bg-card shadow-lg overflow-hidden flex flex-col text-xs font-sans">
              {/* Header do Post */}
              <div className="p-2.5 border-b flex items-center justify-between bg-card">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center overflow-hidden shrink-0">
                    {clientLogoUrl ? (
                      <img src={clientLogoUrl} alt={clientName} className="w-full h-full object-cover" />
                    ) : (
                      <span className="font-bold text-[10px] text-primary">{clientName.slice(0, 2).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="leading-tight">
                    <div className="font-bold text-[11px] text-foreground truncate max-w-[170px]">
                      {clientName.toLowerCase().replace(/\s+/g, "_")}
                    </div>
                    <div className="text-[9px] text-muted-foreground">Patrocinado • Mídia.OS</div>
                  </div>
                </div>
                <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
              </div>

              {/* Imagem / Mídia do Post */}
              <div className="w-full aspect-square bg-muted flex items-center justify-center overflow-hidden relative">
                {mediaUrls.length > 0 ? (
                  <img src={mediaUrls[0]} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center justify-center text-muted-foreground p-4 text-center">
                    <ImageIcon className="w-10 h-10 mb-1 opacity-40" />
                    <span className="text-[11px]">Nenhuma mídia anexada</span>
                    <span className="text-[9px] opacity-70">Faça o upload ao lado</span>
                  </div>
                )}
                {mediaUrls.length > 1 && (
                  <Badge className="absolute top-2 right-2 bg-black/60 text-white text-[9px] px-1.5 py-0 border-none">
                    1/{mediaUrls.length}
                  </Badge>
                )}
              </div>

              {/* Barra de Ações (Curtir, Comentar, Compartilhar) */}
              <div className="p-2.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Heart className="w-4 h-4 text-foreground hover:text-rose-500 cursor-pointer" />
                    <MessageCircle className="w-4 h-4 text-foreground cursor-pointer" />
                    <Send className="w-4 h-4 text-foreground cursor-pointer" />
                  </div>
                  <Bookmark className="w-4 h-4 text-foreground cursor-pointer" />
                </div>

                <div className="font-bold text-[10px]">1.482 curtidas</div>

                {/* Legenda com quebras e truncate */}
                <div className="text-[11px] leading-relaxed text-foreground">
                  <span className="font-bold mr-1.5">{clientName.toLowerCase().replace(/\s+/g, "_")}</span>
                  <span className="whitespace-pre-wrap">
                    {caption || "Sua legenda formatada aparecerá aqui exatamente como o público verá no feed..."}
                  </span>
                </div>

                <div className="text-[9px] text-muted-foreground uppercase pt-1">
                  Agendado para {scheduleDate || "amanhã"} às {scheduleTime}
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="p-4 border-t bg-muted/20 flex items-center justify-between sm:justify-between w-full shrink-0">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>

          <Button
            size="sm"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="gap-1.5 font-semibold text-xs"
          >
            {saveMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            {editingPost ? "Salvar Alterações" : "Confirmar Agendamento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
