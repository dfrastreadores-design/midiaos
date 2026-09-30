import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  listAnnouncementsAtivos,
  type SystemAnnouncement,
} from "@/lib/system-announcements.functions";
import { useAuth } from "@/hooks/use-auth";

const STORAGE_PREFIX = "system-announcements-vistos-v2:";

function storageKey(userId?: string | null) {
  return `${STORAGE_PREFIX}${userId ?? "anon"}`;
}

function getVistos(userId?: string | null): string[] {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function marcarVistos(userId: string | null | undefined, ids: string[]) {
  const vistos = new Set(getVistos(userId));
  ids.forEach((id) => vistos.add(id));
  const arr = Array.from(vistos).slice(-200);
  localStorage.setItem(storageKey(userId), JSON.stringify(arr));
}

export function SystemUpdatePopup() {
  const { user } = useAuth();
  const fetchFn = useServerFn(listAnnouncementsAtivos);
  const [open, setOpen] = useState(false);
  const [agrupados, setAgrupados] = useState<SystemAnnouncement[]>([]);
  const [vistosVersion, setVistosVersion] = useState(0);

  const shownRef = useRef(false);

  const { data } = useQuery({
    queryKey: ["system-announcements-ativos"],
    queryFn: () => fetchFn(),
    enabled: !!user,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  const naoVistos = useMemo(() => {
    if (!data || data.length === 0) return [];
    const vistos = new Set(getVistos(user?.id));
    return data.filter((a) => !vistos.has(a.id));
  }, [data, user?.id, vistosVersion]);

  useEffect(() => {
    if (shownRef.current) return;
    if (!user?.id) return;
    if (naoVistos.length === 0) return;
    shownRef.current = true;
    // Persist immediately so remounts / other tabs won't reopen the same items.
    marcarVistos(
      user.id,
      naoVistos.map((a) => a.id),
    );
    setVistosVersion((v) => v + 1);
    setAgrupados(naoVistos);
    setOpen(true);
  }, [naoVistos, user?.id]);

  const fechar = () => {
    if (agrupados.length > 0) {
      marcarVistos(
        user?.id,
        agrupados.map((a) => a.id),
      );
      setVistosVersion((version) => version + 1);
    }
    setOpen(false);
    setTimeout(() => setAgrupados([]), 200);
  };

  const naoMostrarNovamente = () => {
    // Marca como vistos TODOS os avisos ativos atualmente (não só os agrupados),
    // suprimindo o popup até que uma nova atualização (novo id) seja publicada.
    const idsAtivos = (data ?? []).map((a) => a.id);
    const ids = Array.from(new Set([...idsAtivos, ...agrupados.map((a) => a.id)]));
    if (ids.length > 0) {
      marcarVistos(user?.id, ids);
      setVistosVersion((v) => v + 1);
    }
    setOpen(false);
    setTimeout(() => setAgrupados([]), 200);
  };

  if (agrupados.length === 0) return null;

  const multiplas = agrupados.length > 1;
  const principal = agrupados[0];
  const versoes = Array.from(new Set(agrupados.map((a) => a.versao).filter(Boolean))) as string[];

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) fechar();
      }}
    >
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-3xl" aria-hidden>
              {principal.emoji || "✨"}
            </span>
            {multiplas ? (
              <Badge variant="secondary">{agrupados.length} novidades</Badge>
            ) : (
              principal.versao && <Badge variant="secondary">v{principal.versao}</Badge>
            )}
            {multiplas &&
              versoes.slice(0, 3).map((v) => (
                <Badge key={v} variant="outline">
                  v{v}
                </Badge>
              ))}
          </div>
          <DialogTitle className="text-xl">
            {multiplas ? "Você tem novidades no sistema" : principal.titulo}
          </DialogTitle>
          <DialogDescription asChild>
            <div className="text-sm text-muted-foreground pt-2 leading-relaxed space-y-4">
              {multiplas ? (
                <>
                  <p>Reunimos abaixo as atualizações que você ainda não tinha visto:</p>
                  {agrupados.map((a) => (
                    <div key={a.id} className="border-l-2 border-primary/40 pl-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg" aria-hidden>
                          {a.emoji || "✨"}
                        </span>
                        <span className="font-medium text-foreground">{a.titulo}</span>
                        {a.versao && (
                          <Badge variant="outline" className="text-xs">
                            v{a.versao}
                          </Badge>
                        )}
                      </div>
                      <div className="whitespace-pre-wrap">{a.mensagem}</div>
                    </div>
                  ))}
                </>
              ) : (
                <div className="whitespace-pre-wrap">{principal.mensagem}</div>
              )}
              <div className="pt-3 mt-2 border-t text-foreground font-medium italic">
                — Equipe Mídia Online
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <div className="flex-1 flex items-center text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 mr-1" />
            {multiplas ? "Novidades do sistema" : "Novidade do sistema"}
          </div>
          <Button variant="ghost" onClick={naoMostrarNovamente}>
            Não mostrar novamente
          </Button>
          <Button onClick={fechar}>Entendi, obrigado!</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
