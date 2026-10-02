import { useState, useEffect } from "react";
import { BellRing, X, Smartphone, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePushNotifications } from "@/hooks/use-push-notifications";

export function PushNotificationBanner() {
  const { isSupported, permission, loading, deviceType, requestPermission } =
    usePushNotifications();
  const [dismissed, setDismissed] = useState<boolean>(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hide = localStorage.getItem("midiaos_push_banner_dismissed");
    if (!hide && isSupported && permission === "default") {
      setDismissed(false);
    } else {
      setDismissed(true);
    }
  }, [isSupported, permission]);

  if (dismissed || !isSupported || permission !== "default") {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("midiaos_push_banner_dismissed", "1");
  };

  const handleEnable = async () => {
    const ok = await requestPermission();
    if (ok) {
      setDismissed(true);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-3 sm:p-4 shadow-sm animate-fade-down">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="size-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-md">
            <BellRing className="size-5 animate-pulse" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold tracking-tight text-foreground flex items-center gap-2">
              <span>Ativar Notificações Push</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary font-bold flex items-center gap-1">
                {deviceType === "desktop" ? <Monitor className="size-3" /> : <Smartphone className="size-3" />}
                {deviceType === "desktop" ? "Desktop" : "Mobile / App"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Receba alertas imediatos de novas PIs, assinaturas e aprovações no seu{" "}
              {deviceType === "android"
                ? "celular Android"
                : deviceType === "ios"
                ? "iPhone"
                : "computador"}
              , mesmo com a aba em segundo plano.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="h-8 text-xs text-muted-foreground hover:text-foreground"
          >
            Depois
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={loading}
            onClick={handleEnable}
            className="h-8 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-sm"
          >
            <BellRing className="size-3.5 mr-1.5" /> Ativar Agora
          </Button>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Fechar"
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
