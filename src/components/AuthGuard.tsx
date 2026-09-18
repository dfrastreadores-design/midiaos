import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { DemoTour } from "@/components/DemoTour";
import { TrialExpiredScreen } from "@/components/TrialExpiredScreen";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [checking, setChecking] = useState(true);
  const [expired, setExpired] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      nav({ to: "/site" });
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("trial_ends_at")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      const ends = data?.trial_ends_at ? new Date(data.trial_ends_at) : null;
      const demo = !!ends;
      setIsDemo(demo);
      try {
        if (demo) localStorage.setItem("midiaos:is_demo", "1");
        else localStorage.removeItem("midiaos:is_demo");
      } catch { /* noop */ }
      setExpired(!!(ends && ends.getTime() < Date.now()));
      setChecking(false);
    })();
    return () => { cancelled = true; };
  }, [user, loading, nav, tick]);

  if (loading || (user && checking)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground text-sm">
        Carregando…
      </div>
    );
  }
  if (!user) return null;
  if (expired) return <TrialExpiredScreen email={user.email} onUpgraded={() => { setExpired(false); setChecking(true); setTick((t) => t + 1); }} />;
  return (
    <>
      {children}
      <DemoTour isDemo={isDemo} />
    </>
  );
}

