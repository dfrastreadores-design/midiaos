import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { DemoTour } from "@/components/DemoTour";
import { TrialExpiredScreen } from "@/components/TrialExpiredScreen";
import { isMasterEmail } from "@/lib/master-user";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [checking, setChecking] = useState(true);
  const [expired, setExpired] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const [tick, setTick] = useState(0);

  const lastCheckedUserId = useRef<string | null>(null);

  // Timeout de segurança global: nunca travar na tela de carregamento por mais de 2.0 segundos
  useEffect(() => {
    const timer = setTimeout(() => {
      setChecking(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      nav({ to: "/login" });
      return;
    }

    // Usuários Master possuem acesso perpétuo irrestrito — não verificam expiração de trial
    if (isMasterEmail(user.email)) {
      setIsDemo(false);
      setExpired(false);
      setChecking(false);
      return;
    }

    if (lastCheckedUserId.current === user.id && tick === 0) {
      setChecking(false);
      return;
    }
    lastCheckedUserId.current = user.id;

    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("trial_ends_at")
          .eq("id", user.id)
          .maybeSingle();

        if (cancelled) return;
        if (error) {
          console.warn("AuthGuard: erro ao buscar perfil do usuário:", error);
        }

        const ends = data?.trial_ends_at ? new Date(data.trial_ends_at) : null;
        const demo = !!ends;
        setIsDemo(demo);

        try {
          if (demo) localStorage.setItem("midiaos:is_demo", "1");
          else localStorage.removeItem("midiaos:is_demo");
        } catch {
          /* noop */
        }

        setExpired(!!(ends && ends.getTime() < Date.now()));
      } catch (err) {
        console.warn("AuthGuard: exceção ao verificar status:", err);
      } finally {
        if (!cancelled) {
          setChecking(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.email, loading, tick]);

  if (loading || (user && checking)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
        <div className="size-9 rounded-full border-2 border-primary border-t-transparent animate-spin mb-4" />
        <p className="text-sm font-medium text-foreground">Carregando painel…</p>
        <p className="text-xs text-muted-foreground mt-1">Sincronizando seus dados de acesso</p>
      </div>
    );
  }

  if (!user) return null;

  if (expired) {
    return (
      <TrialExpiredScreen
        email={user.email}
        onUpgraded={() => {
          setExpired(false);
          setChecking(true);
          setTick((t) => t + 1);
        }}
      />
    );
  }

  return (
    <>
      {children}
      <DemoTour isDemo={isDemo} />
    </>
  );
}
