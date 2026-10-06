import { useRef, useState, useEffect, useMemo, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar as CalendarIcon,
  Clock,
  Plus,
  ChevronLeft,
  ChevronRight,
  Filter,
  Layers,
  Image as ImageIcon,
  Video,
  FileText,
  Pencil,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Share2,
  List,
  CalendarDays,
} from "lucide-react";
import { toast } from "sonner";
import {
  SocialScheduledPost,
  SocialPlatform,
  PostStatus,
  POST_STATUS_BADGES,
  SOCIAL_PLATFORMS_META,
  POST_TYPES_CONFIG,
} from "@/types/client-social-traffic.types";
import {
  reschedulePost,
  deleteScheduledPost,
} from "@/lib/client-social-traffic.functions";

interface CalendarioConteudoSocialProps {
  posts: SocialScheduledPost[];
  onEditPost: (post: SocialScheduledPost) => void;
  onNewPost: () => void;
  clientId?: string;
}

export function CalendarioConteudoSocial({
  posts,
  onEditPost,
  onNewPost,
  clientId,
}: CalendarioConteudoSocialProps) {
  const qc = useQueryClient();
  const rescheduleFn = useServerFn(reschedulePost);
  const deletePostFn = useServerFn(deleteScheduledPost);

  // States
  const [viewMode, setViewMode] = useState<"mensal" | "semanal" | "timeline">("mensal");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [draggedPostId, setDraggedPostId] = useState<string | null>(null);

  // Filtro de posts por status
  const filteredPosts = useMemo(() => {
    return posts.filter((p) => {
      if (statusFilter !== "todos" && p.status !== statusFilter) return false;
      return true;
    });
  }, [posts, statusFilter]);

  // Navegação no calendário
  const prevMonth = useCallback(() => {
    setCurrentDate((d) => {
      const n = new Date(d);
      n.setMonth(n.getMonth() - 1);
      return n;
    });
  }, []);

  const nextMonth = useCallback(() => {
    setCurrentDate((d) => {
      const n = new Date(d);
      n.setMonth(n.getMonth() + 1);
      return n;
    });
  }, []);

  const today = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  // Matriz de dias do mês selecionado
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const startingDayOfWeek = firstDay.getDay(); // 0 = Domingo
    const totalDays = lastDay.getDate();

    const days: Array<{
      date: Date;
      isCurrentMonth: boolean;
      dateStr: string;
      posts: SocialScheduledPost[];
    }> = [];

    // Dias do mês anterior para preencher a primeira semana
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthLastDay - i);
      const str = d.toISOString().slice(0, 10);
      days.push({
        date: d,
        isCurrentMonth: false,
        dateStr: str,
        posts: filteredPosts.filter((p) => p.scheduled_for?.startsWith(str)),
      });
    }

    // Dias do mês corrente
    for (let i = 1; i <= totalDays; i++) {
      const d = new Date(year, month, i);
      const str = d.toISOString().slice(0, 10);
      days.push({
        date: d,
        isCurrentMonth: true,
        dateStr: str,
        posts: filteredPosts.filter((p) => p.scheduled_for?.startsWith(str)),
      });
    }

    // Dias do próximo mês para completar a última semana
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      const str = d.toISOString().slice(0, 10);
      days.push({
        date: d,
        isCurrentMonth: false,
        dateStr: str,
        posts: filteredPosts.filter((p) => p.scheduled_for?.startsWith(str)),
      });
    }

    return days;
  }, [currentDate, filteredPosts]);

  // Mutations
  const rescheduleMut = useMutation({
    mutationFn: (data: { id: string; scheduledFor: string }) => rescheduleFn({ data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client_scheduled_posts"] });
      toast.success("Publicação reagendada!");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao reagendar post"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deletePostFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client_scheduled_posts"] });
      toast.success("Publicação excluída com sucesso!");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao excluir"),
  });

  // Drag & Drop Handlers
  const handleDragStart = (e: React.DragEvent, postId: string) => {
    e.dataTransfer.setData("text/plain", postId);
    setDraggedPostId(postId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDropOnDay = (e: React.DragEvent, targetDateStr: string) => {
    e.preventDefault();
    const postId = e.dataTransfer.getData("text/plain") || draggedPostId;
    if (!postId) return;

    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    // Mantém a hora original mas atualiza a data
    const originalDate = new Date(post.scheduled_for);
    const hours = String(originalDate.getHours()).padStart(2, "0");
    const minutes = String(originalDate.getMinutes()).padStart(2, "0");
    const newScheduledFor = new Date(`${targetDateStr}T${hours}:${minutes}:00`).toISOString();

    rescheduleMut.mutate({ id: postId, scheduledFor: newScheduledFor });
    setDraggedPostId(null);
  };

  const mesAnoFormatado = currentDate.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-4">
      {/* Controles de Cabeçalho do Calendário */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 rounded-xl border bg-card/60">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={today} className="text-xs h-8">
            Hoje
          </Button>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={prevMonth} className="h-8 w-8">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-bold capitalize px-2 min-w-[140px] text-center">
              {mesAnoFormatado}
            </span>
            <Button variant="ghost" size="icon" onClick={nextMonth} className="h-8 w-8">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Seletor de visualização */}
          <div className="flex rounded-lg border p-0.5 bg-muted/40">
            <Button
              type="button"
              variant={viewMode === "mensal" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("mensal")}
              className="h-7 text-xs px-2.5 gap-1"
            >
              <CalendarDays className="w-3.5 h-3.5" /> Mês
            </Button>
            <Button
              type="button"
              variant={viewMode === "timeline" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("timeline")}
              className="h-7 text-xs px-2.5 gap-1"
            >
              <List className="w-3.5 h-3.5" /> Fila / Lista
            </Button>
          </div>

          {/* Filtro de Status */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 text-xs w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos" className="text-xs">
                Todos os Status
              </SelectItem>
              <SelectItem value="scheduled" className="text-xs">
                Agendados
              </SelectItem>
              <SelectItem value="published" className="text-xs">
                Publicados
              </SelectItem>
              <SelectItem value="draft" className="text-xs">
                Rascunhos
              </SelectItem>
            </SelectContent>
          </Select>

          <Button size="sm" onClick={onNewPost} className="h-8 text-xs gap-1.5 font-semibold">
            <Plus className="w-3.5 h-3.5" /> Agendar Post
          </Button>
        </div>
      </div>

      {/* MODO 1: CALENDÁRIO MENSAL COM DRAG & DROP */}
      {viewMode === "mensal" && (
        <div className="border rounded-xl overflow-hidden bg-card shadow-xs">
          {/* Header dos Dias da Semana */}
          <div className="grid grid-cols-7 border-b bg-muted/40 text-center text-[11px] font-bold py-2 text-muted-foreground">
            <div>DOM</div>
            <div>SEG</div>
            <div>TER</div>
            <div>QUA</div>
            <div>QUI</div>
            <div>SEX</div>
            <div>SÁB</div>
          </div>

          {/* Grid de Dias */}
          <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-border/60 bg-background/50">
            {calendarDays.map((dia, idx) => {
              const isToday = dia.date.toDateString() === new Date().toDateString();
              return (
                <div
                  key={idx}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDropOnDay(e, dia.dateStr)}
                  className={`min-h-[110px] p-1.5 transition-colors flex flex-col justify-between ${
                    dia.isCurrentMonth ? "bg-card" : "bg-muted/15 text-muted-foreground/60"
                  } ${isToday ? "ring-2 ring-primary/40 ring-inset" : ""}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center ${
                        isToday ? "bg-primary text-primary-foreground" : ""
                      }`}
                    >
                      {dia.date.getDate()}
                    </span>
                    {dia.posts.length > 0 && (
                      <span className="text-[10px] font-semibold text-muted-foreground">
                        {dia.posts.length} {dia.posts.length === 1 ? "post" : "posts"}
                      </span>
                    )}
                  </div>

                  {/* Cards de Posts no Dia */}
                  <div className="space-y-1 flex-1 overflow-y-auto max-h-[120px]">
                    {dia.posts.map((post) => {
                      const hora = new Date(post.scheduled_for).toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      });
                      const badgeStatus = POST_STATUS_BADGES[post.status];
                      return (
                        <div
                          key={post.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, post.id)}
                          onClick={() => onEditPost(post)}
                          className={`p-1.5 rounded border text-[10px] leading-tight cursor-grab active:cursor-grabbing hover:shadow-xs transition-all bg-card/90 ${badgeStatus.corBadge}`}
                        >
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <span className="font-bold flex items-center gap-1 truncate">
                              <Clock className="w-2.5 h-2.5 shrink-0" /> {hora}
                            </span>
                            <div className="flex gap-0.5 shrink-0">
                              {post.platforms.map((plat) => (
                                <span
                                  key={plat}
                                  className="w-1.5 h-1.5 rounded-full"
                                  style={{ backgroundColor: SOCIAL_PLATFORMS_META[plat]?.color || "#999" }}
                                />
                              ))}
                            </div>
                          </div>
                          <div className="truncate font-medium text-foreground">{post.caption}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODO 2: TIMELINE / FILA DE POSTS */}
      {viewMode === "timeline" && (
        <div className="space-y-2">
          {filteredPosts.length === 0 ? (
            <div className="border border-dashed rounded-xl py-12 text-center text-muted-foreground">
              <CalendarIcon className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-semibold">Nenhuma publicação agendada encontrada.</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Crie um novo post com IA para popular o calendário do anunciante.
              </p>
            </div>
          ) : (
            filteredPosts.map((post) => {
              const d = new Date(post.scheduled_for);
              const dataFormatada = d.toLocaleDateString("pt-BR", {
                weekday: "short",
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              });
              const badge = POST_STATUS_BADGES[post.status];

              return (
                <div
                  key={post.id}
                  className="p-3 rounded-xl border bg-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs hover:border-primary/40 transition-all"
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {/* Thumbnail da Mídia ou Ícone do Formato */}
                    <div className="w-12 h-12 rounded-lg border bg-muted flex items-center justify-center overflow-hidden shrink-0">
                      {post.media_urls?.[0] ? (
                        <img src={post.media_urls[0]} alt="Post" className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="w-5 h-5 text-muted-foreground/60" />
                      )}
                    </div>

                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${badge.corBadge}`}>
                          {badge.label}
                        </Badge>
                        <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {dataFormatada}
                        </span>
                        <div className="flex gap-1 items-center">
                          {post.platforms.map((plat) => (
                            <Badge
                              key={plat}
                              variant="outline"
                              className="text-[9px] px-1 py-0"
                              style={{ borderColor: SOCIAL_PLATFORMS_META[plat]?.color }}
                            >
                              {SOCIAL_PLATFORMS_META[plat]?.nome}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <p className="text-xs text-foreground line-clamp-2 leading-relaxed">
                        {post.caption}
                      </p>
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEditPost(post)}
                      className="h-8 text-xs gap-1"
                    >
                      <Pencil className="w-3.5 h-3.5" /> Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm("Excluir este agendamento?")) {
                          deleteMut.mutate(post.id);
                        }
                      }}
                      className="h-8 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 px-2"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
