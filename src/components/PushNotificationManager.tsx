import { Bell, BellOff, BellRing, Smartphone, Monitor, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { usePushNotifications } from "@/hooks/use-push-notifications";

interface PushNotificationManagerProps {
  compact?: boolean;
}

export function PushNotificationManager({ compact = false }: PushNotificationManagerProps) {
  const {
    isSupported,
    permission,
    loading,
    deviceType,
    isStandalone,
    requestPermission,
    sendTestNotification,
  } = usePushNotifications();

  if (!isSupported) {
    return (
      <div className="rounded-xl border border-border/50 bg-muted/30 p-3 text-xs text-muted-foreground flex items-center gap-2">
        <AlertCircle className="size-4 shrink-0 text-muted-foreground" />
        <span>Seu navegador ou dispositivo atual não suporta notificações Web Push.</span>
      </div>
    );
  }

  const isGranted = permission === "granted";
  const isDenied = permission === "denied";

  if (compact) {
    return (
      <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-border/40 bg-card">
        <div className="flex items-center gap-2 min-w-0">
          {isGranted ? (
            <div className="size-7 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
              <BellRing className="size-4" />
            </div>
          ) : isDenied ? (
            <div className="size-7 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
              <BellOff className="size-4" />
            </div>
          ) : (
            <div className="size-7 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
              <Bell className="size-4" />
            </div>
          )}
          <div className="min-w-0">
            <div className="text-xs font-semibold truncate flex items-center gap-1.5">
              <span>Push Notifications</span>
              {isGranted ? (
                <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-600 bg-emerald-500/5 px-1.5 py-0 h-4">
                  Ativo
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-600 bg-amber-500/5 px-1.5 py-0 h-4">
                  Pendente
                </Badge>
              )}
            </div>
            <div className="text-[11px] text-muted-foreground truncate">
              {deviceType === "android"
                ? "Dispositivo Android"
                : deviceType === "ios"
                ? "iPhone / iPad (iOS)"
                : "Desktop / Computador"}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {isGranted ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={sendTestNotification}
              className="h-7 text-xs px-2.5 rounded-lg"
            >
              Testar
            </Button>
          ) : isDenied ? (
            <span className="text-[11px] text-destructive font-medium">Bloqueado</span>
          ) : (
            <Button
              type="button"
              size="sm"
              disabled={loading}
              onClick={requestPermission}
              className="h-7 text-xs px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              {loading ? <RefreshCw className="size-3 animate-spin mr-1" /> : <BellRing className="size-3 mr-1" />}
              Ativar
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <BellRing className="size-5" />
            </div>
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                Notificações Push no Desktop e App
                {isGranted && (
                  <Badge className="bg-emerald-600 text-white text-[10px] font-bold">
                    <CheckCircle2 className="size-3 mr-1" /> Conectado
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-xs">
                Receba alertas instantâneos de novos PIs, assinaturas eletrônicas e tarefas na barra do sistema ou no celular.
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className="text-xs gap-1 bg-muted/40">
              {deviceType === "desktop" ? <Monitor className="size-3" /> : <Smartphone className="size-3" />}
              {deviceType === "android" ? "Android" : deviceType === "ios" ? "iOS" : "Desktop"}
            </Badge>
            {isStandalone && (
              <Badge variant="outline" className="text-xs gap-1 border-primary/30 text-primary bg-primary/5">
                App Instalado
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isGranted ? (
          <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="size-8 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="size-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-emerald-900 dark:text-emerald-300">
                  Notificações ativadas para este dispositivo!
                </p>
                <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80">
                  Você receberá balões nativos no sistema operacional mesmo com a janela em segundo plano.
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={sendTestNotification}
              className="h-8 text-xs font-semibold rounded-lg shrink-0 border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
            >
              <BellRing className="size-3.5 mr-1.5" /> Enviar Push de Teste
            </Button>
          </div>
        ) : isDenied ? (
          <div className="p-3.5 rounded-xl border border-destructive/20 bg-destructive/5 flex items-start gap-2.5">
            <BellOff className="size-5 text-destructive shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-bold text-destructive">As notificações foram bloqueadas nas permissões do navegador.</p>
              <p className="text-muted-foreground leading-relaxed">
                Para reativar, clique no ícone de cadeado ao lado do endereço do site (barra de URL) e altere a permissão de <strong>Notificações</strong> para <strong>Permitir</strong>.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="size-8 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                <Bell className="size-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-amber-900 dark:text-amber-300">
                  Notificações ainda não foram ativadas
                </p>
                <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80">
                  Autorize agora para receber alertas importantes de faturamento e aprovação em tempo real.
                </p>
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              disabled={loading}
              onClick={requestPermission}
              className="h-8 text-xs font-bold rounded-lg shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
            >
              {loading ? <RefreshCw className="size-3.5 mr-1.5 animate-spin" /> : <BellRing className="size-3.5 mr-1.5" />}
              Ativar Notificações no Dispositivo
            </Button>
          </div>
        )}

        <div className="text-[11px] text-muted-foreground/80 flex items-center gap-1.5 pt-1">
          <Smartphone className="size-3 text-primary" />
          <span>
            <strong>Dica Mobile:</strong> No Android e iOS (iPhone), adicione o Mídia.OS à tela de início para receber alertas push com vibração e som na tela de bloqueio.
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
