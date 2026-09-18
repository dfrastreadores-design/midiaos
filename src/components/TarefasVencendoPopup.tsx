import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CalendarClock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { listTarefasVencendo } from "@/lib/tarefas.functions";
import { useAuth } from "@/hooks/use-auth";

const STORAGE_KEY = "tarefas-vencendo-popup-shown";

function isToday(d: Date) {
  const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
}

export function TarefasVencendoPopup() {
  const { user } = useAuth();
  const fetchFn = useServerFn(listTarefasVencendo);
  const [open, setOpen] = useState(false);

  const { data } = useQuery({
    queryKey: ["tarefas-vencendo"],
    queryFn: () => fetchFn(),
    enabled: !!user,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!data || data.length === 0) return;
    const today = new Date().toISOString().slice(0, 10);
    if (sessionStorage.getItem(STORAGE_KEY) === today) return;
    setOpen(true);
    sessionStorage.setItem(STORAGE_KEY, today);
  }, [data]);

  if (!data || data.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-amber-500" />
            Tarefas a vencer
          </DialogTitle>
          <DialogDescription>
            Você tem {data.length} tarefa{data.length > 1 ? "s" : ""} vencendo hoje ou em atraso.
          </DialogDescription>
        </DialogHeader>
        <ul className="space-y-2 max-h-72 overflow-y-auto">
          {data.map((t: { id: string; titulo: string; prazo: string | null }) => {
            const prazo = t.prazo ? new Date(t.prazo) : null;
            const vencida = prazo ? prazo < new Date() && !isToday(prazo) : false;
            return (
              <li key={t.id} className="flex items-center justify-between gap-2 rounded-lg border p-2 text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <CalendarClock className="size-4 text-muted-foreground shrink-0" />
                  <span className="truncate">{t.titulo}</span>
                </div>
                <Badge variant={vencida ? "destructive" : "secondary"}>
                  {vencida ? "Vencida" : "Hoje"}
                </Badge>
              </li>
            );
          })}
        </ul>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Fechar</Button>
          <Button asChild onClick={() => setOpen(false)}>
            <Link to="/tarefas">Ver tarefas</Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
