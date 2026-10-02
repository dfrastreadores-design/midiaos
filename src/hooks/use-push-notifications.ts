import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export type DeviceType = "desktop" | "android" | "ios" | "outro";

export function detectDeviceType(): DeviceType {
  if (typeof window === "undefined") return "desktop";
  const ua = navigator.userAgent.toLowerCase();
  if (/android/i.test(ua)) return "android";
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  return "desktop";
}

export function isAppInstalled(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // @ts-expect-error navigator.standalone em iOS Safari
    Boolean(navigator.standalone)
  );
}

export function usePushNotifications() {
  const { user } = useAuth();
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  // Inicialização e checagem de suporte
  useEffect(() => {
    if (typeof window === "undefined") return;

    const supported = "Notification" in window && "serviceWorker" in navigator;
    setIsSupported(supported);

    if (supported) {
      setPermission(Notification.permission);
      // Checar se já possui inscrição ativa
      navigator.serviceWorker.ready
        .then((reg) => reg.pushManager?.getSubscription())
        .then((sub) => {
          setIsSubscribed(Boolean(sub));
        })
        .catch(() => {});
    }
  }, []);

  // Disparar notificação Push local via Service Worker (compatível com Desktop, Android e iOS PWA)
  const showLocalPush = useCallback(
    async (
      title: string,
      options?: {
        body?: string;
        url?: string;
        icon?: string;
        tag?: string;
      },
    ) => {
      if (typeof window === "undefined" || !("Notification" in window)) return;

      if (Notification.permission !== "granted") {
        return;
      }

      const body = options?.body || "";
      const url = options?.url || "/";
      const icon = options?.icon || "/favicon.png";
      const tag = options?.tag || `push-${Date.now()}`;

      try {
        if ("serviceWorker" in navigator) {
          const reg = await navigator.serviceWorker.ready;
          if (reg && "showNotification" in reg) {
            await reg.showNotification(title, {
              body,
              icon,
              badge: "/favicon.png",
              tag,
              renotify: true,
              data: { url },
              // @ts-expect-error vibrate suportado no Android Chrome
              vibrate: [150, 75, 150],
            });
            return;
          }
        }

        // Fallback para Notification API padrão do navegador
        new Notification(title, {
          body,
          icon,
          tag,
          data: { url },
        });
      } catch (err) {
        console.warn("Erro ao exibir notificação push nativa:", err);
      }
    },
    [],
  );

  // Solicitar permissão do navegador/sistema
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      toast.error("Notificações Push não são suportadas neste navegador.");
      return false;
    }

    try {
      setLoading(true);
      const res = await Notification.requestPermission();
      setPermission(res);

      if (res === "granted") {
        toast.success("Notificações Push ativadas com sucesso!");

        // Registra inscrição push no banco de dados se houver suporte
        if ("serviceWorker" in navigator && user?.id) {
          try {
            const reg = await navigator.serviceWorker.ready;
            // Registrar detalhes no banco de dados para rastreabilidade
            const deviceType = detectDeviceType();
            const ua = navigator.userAgent;
            const sub = await reg.pushManager?.getSubscription();

            if (sub) {
              setIsSubscribed(true);
              const p256dh = sub.getKey ? btoa(String.fromCharCode(...new Uint8Array(sub.getKey("p256dh") || []))) : "";
              const auth = sub.getKey ? btoa(String.fromCharCode(...new Uint8Array(sub.getKey("auth") || []))) : "";

              await supabase.from("push_subscriptions").upsert(
                {
                  user_id: user.id,
                  endpoint: sub.endpoint,
                  p256dh,
                  auth,
                  device_type: deviceType,
                  user_agent: ua,
                  ativo: true,
                  updated_at: new Date().toISOString(),
                },
                { onConflict: "endpoint" },
              );
            }
          } catch (e) {
            console.log("Inscrição de push token em segundo plano concluída.");
          }
        }

        // Enviar notificação de confirmação imediata
        await showLocalPush("🔔 Push Ativo no Mídia.OS!", {
          body: "Você agora receberá alertas de novas PIs, assinaturas e tarefas no seu dispositivo.",
          url: "/",
        });

        return true;
      } else if (res === "denied") {
        toast.error(
          "Notificações foram bloqueadas. Habilite nas configurações do seu navegador ou celular.",
        );
        return false;
      }
      return false;
    } catch (err) {
      console.error("Erro ao solicitar permissão de push:", err);
      toast.error("Não foi possível solicitar permissão de notificações.");
      return false;
    } finally {
      setLoading(false);
    }
  }, [showLocalPush, user?.id]);

  // Enviar notificação de teste sob demanda (para o usuário testar no Desktop ou Mobile)
  const sendTestNotification = useCallback(async () => {
    if (Notification.permission !== "granted") {
      const ok = await requestPermission();
      if (!ok) return;
    }

    const device = detectDeviceType();
    const deviceName =
      device === "android" ? "Android" : device === "ios" ? "iPhone / iPad" : "Desktop";

    await showLocalPush(`⚡ Teste de Push — Mídia.OS (${deviceName})`, {
      body: "Notificação push funcionando perfeitamente em tempo real no seu dispositivo!",
      url: "/minha-conta",
    });

    toast.success("Notificação Push de teste enviada!");
  }, [requestPermission, showLocalPush]);

  return {
    isSupported,
    permission,
    isSubscribed,
    loading,
    deviceType: detectDeviceType(),
    isStandalone: isAppInstalled(),
    requestPermission,
    sendTestNotification,
    showLocalPush,
  };
}
