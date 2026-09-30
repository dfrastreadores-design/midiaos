import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { listUsuarios } from "@/lib/usuarios.functions";
import { setActingAsExecutivo, useActingAsExecutivo } from "@/hooks/use-acting-as";
import { UserCheck, X } from "lucide-react";

export function ImpersonateDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [q, setQ] = useState("");
  const acting = useActingAsExecutivo();
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["usuarios-impersonate"],
    queryFn: () => listUsuarios(),
    enabled: open,
    staleTime: 60_000,
  });

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = (users as any[]).filter((u) => u.ativo !== false);
    if (!term) return list;
    return list.filter(
      (u) =>
        (u.nome || "").toLowerCase().includes(term) || (u.email || "").toLowerCase().includes(term),
    );
  }, [users, q]);

  const pick = (id: string | null) => {
    setActingAsExecutivo(id);
    onOpenChange(false);
    if (id) window.location.reload();
    else window.location.reload();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Trocar de perfil</DialogTitle>
          <DialogDescription>
            Visualize e trabalhe como se fosse outro usuário. Suas ações serão atribuídas ao usuário
            selecionado.
          </DialogDescription>
        </DialogHeader>

        {acting && (
          <div className="flex items-center justify-between rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            <span className="font-semibold">Atuando como outro usuário</span>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 gap-1 text-amber-900"
              onClick={() => pick(null)}
            >
              <X className="size-3" /> Sair
            </Button>
          </div>
        )}

        <Input
          placeholder="Buscar por nome ou e-mail…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />

        <div className="max-h-80 overflow-y-auto space-y-1">
          {isLoading && (
            <div className="text-sm text-muted-foreground py-4 text-center">Carregando…</div>
          )}
          {!isLoading && filtered.length === 0 && (
            <div className="text-sm text-muted-foreground py-4 text-center">
              Nenhum usuário encontrado.
            </div>
          )}
          {filtered.map((u: any) => (
            <button
              key={u.id}
              onClick={() => pick(u.id)}
              className={`w-full text-left rounded-lg border px-3 py-2 hover:bg-accent transition ${acting === u.id ? "border-primary bg-primary/5" : "border-border"}`}
            >
              <div className="flex items-center gap-2">
                <UserCheck className="size-4 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{u.nome || u.email}</div>
                  <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                </div>
                {(u.roles ?? []).length > 0 && (
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {(u.roles as string[]).join(", ")}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
