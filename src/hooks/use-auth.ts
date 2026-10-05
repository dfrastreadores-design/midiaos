import { useEffect, useRef, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { touchLastActive } from "@/lib/presence.functions";

export type AppRole =
  | "super_admin"
  | "admin"
  | "executivo"
  | "opec"
  | "financeiro"
  | "diretoria"
  | "producao"
  | "parceiro_comercial";

const MAX_SESSION_MS = 5 * 24 * 60 * 60 * 1000; // 5 dias
const HEARTBEAT_MS = 5 * 60 * 1000; // 5 minutos

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const lastTouchRef = useRef(0);

  useEffect(() => {
    let resolved = false;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
      resolved = true;
    });

    supabase.auth
      .getSession()
      .then(({ data }) => {
        setSession(data.session);
        setUser(data.session?.user ?? null);
      })
      .catch((err) => {
        console.warn("useAuth getSession error:", err);
      })
      .finally(() => {
        setLoading(false);
        resolved = true;
      });

    // Timeout de segurança: nunca travar em loading por mais de 1.5s
    const timer = setTimeout(() => {
      if (!resolved) setLoading(false);
    }, 1500);

    return () => {
      clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, []);

  // Atualiza last_active_at + força logout após 5 dias contínuos
  useEffect(() => {
    if (!user || !session) return;

    const checkExpiry = () => {
      const lastSignIn = session.user.last_sign_in_at
        ? new Date(session.user.last_sign_in_at).getTime()
        : 0;
      if (lastSignIn && Date.now() - lastSignIn > MAX_SESSION_MS) {
        signOut();
        return true;
      }
      return false;
    };

    const touch = async () => {
      if (checkExpiry()) return;
      const now = Date.now();
      if (now - lastTouchRef.current < HEARTBEAT_MS) return;
      lastTouchRef.current = now;
      try {
        await touchLastActive();
      } catch {
        /* ignore */
      }
    };

    touch();
    const interval = setInterval(touch, HEARTBEAT_MS);
    const onActivity = () => touch();
    window.addEventListener("focus", onActivity);
    window.addEventListener("click", onActivity);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onActivity);
      window.removeEventListener("click", onActivity);
    };
  }, [user, session]);

  return { session, user, loading };
}

export async function signOut() {
  await supabase.auth.signOut();
  window.location.href = "/login";
}
