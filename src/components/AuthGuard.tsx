import React, { useRef, useEffect, useState } from "react";
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
  const [showFallbackControls, setShowFallbackControls] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  const lastCheckedUserId = useRef<string | null>(null);

  // Timeout de segurança: após 2.0s mostra botões de escape e após 2.5s destrava obrigatoriamente
  useEffect(() => {
    const helpTimer = setTimeout(() => {
      setShowFallbackControls(true);
    }, 2000);

    const hardTimer = setTimeout(() => {
      setTimedOut(true);
      setChecking(false);
    }, 2500);

    return () => {
      clearTimeout(helpTimer);
      clearTimeout(hardTimer);
    };
  }, []);

  useEffect(() => {
    if (loading && !timedOut) return;

    if (!user) {
      // Redireciona com replace para evitar loops no histórico de navegação
      nav({ to: "/login", replace: true });
      return;
    }

    // Usuários Master possuem acesso perpétuo irrestrito — liberados instantaneamente
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
        // Consulta ao Supabase com timeout protetivo de 2 segundos para nunca travar
        const queryPromise = supabase
          .from("profiles")
          .select("trial_ends_at")
          .eq("id", user.id)
          .maybeSingle();

        const timeoutPromise = new Promise<{ data: null; error: Error }>((_, reject) =>
          setTimeout(() => reject(new Error("Timeout verificação de perfil")), 2000),
        );

        const { data, error } = (await Promise.race([queryPromise, timeoutPromise])) as any;

        if (cancelled) return;
        if (error) {
          console.warn("AuthGuard: perfil temporariamente inacessível:", error);
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
        console.warn("AuthGuard: prosseguindo com acesso seguro após timeout/erro:", err);
      } finally {
        if (!cancelled) {
          setChecking(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.email, loading, tick, timedOut, nav]);

  // Se ainda estiver carregando a autenticação ou checando o perfil e não estourou o timeout
  if ((loading && !timedOut) || (user && checking && !timedOut)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 select-none">
        <div className="size-9 rounded-full border-2 border-primary border-t-transparent animate-spin mb-4" />
        <p className="text-sm font-medium text-foreground">Carregando painel…</p>
        <p className="text-xs text-muted-foreground mt-1">Sincronizando seus dados de acesso</p>

        {showFallbackControls && (
          <div className="mt-6 flex flex-col sm:flex-row items-center gap-3 animate-in fade-in duration-300">
            <button
              type="button"
              onClick={() => {
                setChecking(false);
                setTimedOut(true);
              }}
              className="text-xs font-semibold px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
            >
              Continuar para o Painel
            </button>
            <button
              type="button"
              onClick={async () => {
                await supabase.auth.signOut({ scope: "local" }).catch(() => {});
                window.location.href = "/login?logout=1";
              }}
              className="text-xs px-4 py-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              Trocar de Conta / Sair
            </button>
          </div>
        )}
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
