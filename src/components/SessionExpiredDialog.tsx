import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Eye, EyeOff, ShieldAlert, Loader2, LogOut, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { translateError } from "@/lib/translate-error";

export function SessionExpiredDialog() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleExpired = async () => {
      const { data } = await supabase.auth.getSession();
      const currentEmail = data.session?.user?.email || "";
      if (currentEmail) {
        setEmail(currentEmail);
      }
      setOpen(true);
    };

    window.addEventListener("midiaos:session-expired", handleExpired);
    return () => {
      window.removeEventListener("midiaos:session-expired", handleExpired);
    };
  }, []);

  const handleReauth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      toast.error("Informe sua senha para continuar.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email || (await supabase.auth.getUser()).data.user?.email || "",
        password,
      });

      if (error) {
        toast.error(translateError(error) || "Senha incorreta. Tente novamente.");
        return;
      }

      setOpen(false);
      setPassword("");
      toast.success("Sessão renovada com sucesso!", {
        description: "Seus dados na tela foram preservados. Você já pode salvar novamente.",
      });
    } catch (err: any) {
      toast.error(err?.message || "Erro ao autenticar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoToLogin = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      /* ignore */
    }
    window.location.href = "/login";
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && setOpen(false)}>
      <DialogContent
        className="max-w-md p-6 bg-card border-border shadow-2xl rounded-2xl"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="text-center sm:text-left space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center shrink-0">
              <ShieldAlert className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-foreground">
                Sessão Expirada por Inatividade
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Renove seu acesso para salvar sem perder o que já preencheu.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleReauth} className="space-y-4 pt-2">
          <div className="rounded-xl border border-muted bg-muted/30 p-3 space-y-1">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">
              Usuário Conectado
            </span>
            <p className="text-sm font-semibold text-foreground truncate">{email || "Sua conta"}</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reauth-password" className="text-xs font-semibold text-foreground">
              Sua Senha
            </Label>
            <div className="relative">
              <Input
                id="reauth-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite sua senha de acesso"
                className="pr-10 h-10 text-sm"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <Button
              type="submit"
              disabled={loading || !password}
              className="w-full h-10 font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-md gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Renovando Acesso...
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-4" />
                  Renovar Sessão e Continuar
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleGoToLogin}
              className="w-full text-xs text-muted-foreground hover:text-foreground gap-1.5"
            >
              <LogOut className="size-3.5" />
              Sair para a tela de Login
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
