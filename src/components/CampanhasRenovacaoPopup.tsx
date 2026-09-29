import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  RotateCcw,
  AlertTriangle,
  Building2,
  User,
  ArrowRight,
  MessageSquare,
  DollarSign,
  Copy,
  Calendar,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import {
  listCampanhasRenovacao10Dias,
  dispararNotificacoesRenovacao10Dias,
  type CampanhaRenovacaoAlerta,
} from "@/lib/campanhas-renovacao.functions";

const STORAGE_KEY = "campanhas-renovacao-popup-shown-date";

export function CampanhasRenovacaoPopup() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const fetchCampanhasFn = useServerFn(listCampanhasRenovacao10Dias);
  const dispararNotifFn = useServerFn(dispararNotificacoesRenovacao10Dias);

  const { data: campanhas = [], isLoading } = useQuery({
    queryKey: ["campanhas-renovacao-10-dias"],
    queryFn: () => fetchCampanhasFn(),
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  // Disparar notificações de renovação em background uma vez
  const notifMut = useMutation({
    mutationFn: () => dispararNotifFn(),
  });

  useEffect(() => {
    if (campanhas.length > 0) {
      notifMut.mutate();
    }
  }, [campanhas.length]);

  useEffect(() => {
    if (!campanhas || campanhas.length === 0) return;

    const hoje = new Date().toISOString().slice(0, 10);
    const jaExibidoHoje = sessionStorage.getItem(STORAGE_KEY) === hoje;

    // Se ainda não exibiu nesta sessão hoje, exibe o popup
    if (!jaExibidoHoje) {
      setOpen(true);
      sessionStorage.setItem(STORAGE_KEY, hoje);
    }
  }, [campanhas]);

  if (!campanhas || campanhas.length === 0) return null;

  const copiarMensagemWhatsapp = (c: CampanhaRenovacaoAlerta) => {
    const contato = c.cliente_contato ? `Olá ${c.cliente_contato}` : "Olá";
    const msg = `${contato}, tudo bem?\n\nPassando para lembrar que a sua campanha "${c.campanha}" está nos últimos ${c.dias_uteis_restantes} dias úteis de veiculação (previsão de término em ${c.periodo_fim.split("-").reverse().join("/")}).\n\nPodemos agendar uma rápida conversa para alinharmos a renovação e mantermos sua marca com presença contínua nos melhores pontos com condições exclusivas?`;

    navigator.clipboard.writeText(msg);
    toast.success("Mensagem de renovação copiada para o WhatsApp!");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Header do Alerta */}
        <DialogHeader className="p-5 pb-4 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-b border-border/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center font-bold">
                <Clock className="size-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-lg font-bold tracking-tight text-foreground">
                    Campanhas Próximas da Renovação
                  </DialogTitle>
                  <Badge variant="outline" className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-300 font-bold text-[10px]">
                    ≤ 10 Dias Úteis
                  </Badge>
                </div>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Existem <strong>{campanhas.length}</strong> campanha(s) na janela ideal para iniciar as negociações de renovação contratual com os clientes.
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Lista de Campanhas com Alerta */}
        <div className="p-5 overflow-y-auto space-y-3.5 max-h-[58vh]">
          {campanhas.map((c) => {
            const isCritico = c.urgencia === "critica";
            const isAlta = c.urgencia === "alta";

            const badgeBg = isCritico
              ? "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900/50"
              : isAlta
              ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/50"
              : "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900/50";

            const diasFormatados =
              c.dias_uteis_restantes === 0
                ? "Encerra HOJE!"
                : c.dias_uteis_restantes === 1
                ? "Resta 1 dia útil"
                : `Restam ${c.dias_uteis_restantes} dias úteis`;

            return (
              <div
                key={c.pi_id}
                className="rounded-xl border border-border/60 bg-card p-4 shadow-xs hover:border-primary/40 transition-all space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-foreground">
                        {c.cliente_nome}
                      </span>
                      <span className="text-xs text-muted-foreground font-mono">
                        PI {c.numero}
                      </span>
                    </div>

                    <div className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                      <span>Campanha:</span>
                      <strong className="text-foreground">{c.campanha}</strong>
                    </div>
                  </div>

                  <Badge variant="outline" className={`text-xs px-2.5 py-0.5 font-bold ${badgeBg}`}>
                    {diasFormatados}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 py-2 px-3 rounded-lg bg-muted/30 border border-border/40 text-xs">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Calendar className="size-3.5 text-muted-foreground" />
                    <span>Término: <strong className="text-foreground">{c.periodo_fim.split("-").reverse().join("/")}</strong></span>
                  </div>

                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <DollarSign className="size-3.5 text-emerald-600" />
                    <span>Valor: <strong className="text-foreground">R$ {c.valor_negociado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong></span>
                  </div>

                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <User className="size-3.5 text-muted-foreground" />
                    <span className="truncate">Executivo: <strong className="text-foreground">{c.executivo_nome || "Geral"}</strong></span>
                  </div>
                </div>

                {/* Ações Rápidas por Campanha */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs px-2.5 text-muted-foreground hover:text-foreground gap-1.5"
                    onClick={() => copiarMensagemWhatsapp(c)}
                  >
                    <Copy className="size-3.5 text-emerald-600" />
                    Copiar WhatsApp
                  </Button>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      className="h-8 text-xs font-semibold gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
                      onClick={() => {
                        setOpen(false);
                        navigate({
                          to: "/pi",
                          search: { renovar: c.pi_id } as any,
                        });
                      }}
                    >
                      <RotateCcw className="size-3.5" />
                      Iniciar Renovação
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Rodapé da Dialog */}
        <DialogFooter className="p-4 bg-muted/20 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-amber-500 inline-block animate-ping" />
            <span>Alerta disparado a 10 dias úteis da vigência final</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
            >
              Fechar
            </Button>

            <Button
              asChild
              size="sm"
              variant="secondary"
              onClick={() => setOpen(false)}
              className="gap-1.5 text-xs font-semibold"
            >
              <Link to="/pi">
                Ver Todos os PIs
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
