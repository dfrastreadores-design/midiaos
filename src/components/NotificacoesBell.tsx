import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import { Bell, Check } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { listMinhasNotificacoes, marcarNotificacaoLida } from "@/lib/notificacoes.functions";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { PushNotificationManager } from "@/components/PushNotificationManager";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export function NotificacoesBell() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { showLocalPush } = usePushNotifications();
  const fetchList = useServerFn(listMinhasNotificacoes);
  const markRead = useServerFn(marcarNotificacaoLida);
  const { data: items = [] } = useQuery({
    queryKey: ["minhas-notificacoes"],
    queryFn: () => fetchList(),
    refetchInterval: 60000,
  });

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`notif-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notificacoes",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const n = payload.new as { titulo: string; mensagem: string | null; link: string | null };
          
          // Toast in-app
          toast(n.titulo, {
            description: n.mensagem ?? undefined,
            action: n.link
              ? {
                  label: "Abrir",
                  onClick: () => {
                    window.location.href = n.link!;
                  },
                }
              : undefined,
          });

          // Push nativo no Desktop (Windows/Mac) e App (Android/iOS)
          showLocalPush(n.titulo, {
            body: n.mensagem ?? undefined,
            url: n.link ?? "/",
          });

          qc.invalidateQueries({ queryKey: ["minhas-notificacoes"] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, qc, showLocalPush]);

  const naoLidas = items.filter((i) => !i.lida).length;

  const mark = useMutation({
    mutationFn: async (vars: { id?: string; todas?: boolean }) => markRead({ data: vars }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["minhas-notificacoes"] }),
  });

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="relative p-2 rounded-md hover:bg-muted transition"
          aria-label="Notificações"
        >
          <Bell className="size-5" />
          {naoLidas > 0 && (
            <Badge className="absolute -top-1 -right-1 size-5 p-0 flex items-center justify-center bg-gold text-gold-foreground text-[10px]">
              {naoLidas}
            </Badge>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="font-medium text-sm">Notificações</div>
          <Button
            variant="ghost"
            size="sm"
            disabled={naoLidas === 0}
            onClick={() => mark.mutate({ todas: true })}
          >
            <Check className="size-3.5 mr-1" /> Marcar todas
          </Button>
        </div>
        <div className="p-2 border-b bg-muted/20">
          <PushNotificationManager compact />
        </div>
        <div className="max-h-[28rem] overflow-y-auto divide-y">
          {items.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              Sem notificações no momento.
            </div>
          )}
          {items.map((n) => (
            <Link
              key={n.id}
              to={(n.link ?? "/") as string}
              onClick={() => !n.lida && mark.mutate({ id: n.id })}
              className={`block px-4 py-3 hover:bg-muted/50 transition ${!n.lida ? "bg-muted/30" : ""}`}
            >
              <div className="flex items-start gap-2">
                <span
                  className={`mt-1.5 size-2 rounded-full ${!n.lida ? "bg-primary" : "bg-transparent"}`}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium leading-tight">{n.titulo}</div>
                  {n.mensagem && (
                    <div className="text-xs text-muted-foreground mt-0.5">{n.mensagem}</div>
                  )}
                  <div className="text-[10px] text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
