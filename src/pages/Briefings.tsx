import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { BriefingFormDialog } from "@/components/BriefingFormDialog";
import { listBriefings, deleteBriefing, updateBriefingStatus } from "@/lib/briefings.functions";
import { useUserRoles } from "@/hooks/use-roles";
import { Plus, Pencil, Trash2, FileText, FilePlus2, UserCheck, Inbox, FileEdit, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const TIMELINE_STEPS = [
  { key: "novo", label: "Solicitação enviada", desc: "Executivo Parceiro", icon: UserCheck },
  { key: "em_analise", label: "Recebida pelo ADM", desc: "Em análise", icon: Inbox },
  { key: "em_proposta", label: "Proposta em confecção", desc: "ADM elaborando", icon: FileEdit },
  { key: "concluido", label: "Proposta entregue", desc: "Finalizado", icon: CheckCircle2 },
];

function BriefingTimeline({ status }: { status: string }) {
  if (status === "recusado") {
    return (
      <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
        <XCircle className="size-4" /> Solicitação recusada pelo ADM
      </div>
    );
  }
  const currentIdx = TIMELINE_STEPS.findIndex((s) => s.key === status);
  const idx = currentIdx < 0 ? 0 : currentIdx;
  return (
    <ol className="relative flex items-start justify-between gap-1">
      {TIMELINE_STEPS.map((step, i) => {
        const Icon = step.icon;
        const done = i < idx;
        const active = i === idx;
        return (
          <li key={step.key} className="flex-1 flex flex-col items-center text-center relative">
            {i > 0 && (
              <span
                className={cn(
                  "absolute top-3 right-1/2 w-full h-0.5",
                  done || active ? "bg-primary" : "bg-border"
                )}
              />
            )}
            <span
              className={cn(
                "relative z-10 flex size-6 items-center justify-center rounded-full border-2 bg-background",
                done && "border-primary bg-primary text-primary-foreground",
                active && "border-primary text-primary ring-2 ring-primary/20",
                !done && !active && "border-border text-muted-foreground"
              )}
            >
              <Icon className="size-3" />
            </span>
            <span
              className={cn(
                "mt-1 text-[10px] leading-tight",
                active ? "font-semibold text-foreground" : "text-muted-foreground"
              )}
            >
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

const STATUS_LABEL: Record<string, string> = {
  novo: "Aguardando ADM",
  em_analise: "Em análise pelo ADM",
  em_proposta: "Proposta em confecção",
  concluido: "Proposta entregue",
  recusado: "Recusado",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  novo: "default",
  em_analise: "secondary",
  em_proposta: "secondary",
  concluido: "outline",
  recusado: "destructive",
};

export default function Briefings() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { isAdmin } = useUserRoles();
  const listFn = useServerFn(listBriefings);
  const delFn = useServerFn(deleteBriefing);
  const statusFn = useServerFn(updateBriefingStatus);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: briefings = [], isLoading } = useQuery({
    queryKey: ["briefings"],
    queryFn: () => listFn(),
  });

  const del = useMutation({
    mutationFn: async (id: string) => delFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Briefing removido");
      qc.invalidateQueries({ queryKey: ["briefings"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });

  const changeStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) =>
      statusFn({ data: { id, status: status as any } }),
    onSuccess: () => {
      toast.success("Status atualizado");
      qc.invalidateQueries({ queryKey: ["briefings"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });

  const filtered = (briefings as any[]).filter((b) => {
    const matchSearch = !search ||
      b.razao_social?.toLowerCase().includes(search.toLowerCase()) ||
      b.campanha?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || b.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-semibold">Solicitação de Proposta</h1>
            <p className="text-sm text-muted-foreground">
              Solicite ao ADM a confecção de uma proposta. Informe cliente/agência, campanha, verba e produtos de TV desejados.
            </p>
          </div>
          <Button onClick={() => { setEditing(null); setOpen(true); }}>
            <Plus className="size-4" /> Nova Solicitação
          </Button>
        </div>

        <div className="flex gap-2">
          <Input
            placeholder="Buscar por razão social ou campanha…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos status</SelectItem>
              {Object.entries(STATUS_LABEL).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground">Carregando…</p>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="size-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">Nenhum briefing encontrado.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((b) => (
              <Card key={b.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{b.razao_social}</CardTitle>
                    <Badge variant={STATUS_VARIANT[b.status] ?? "default"}>
                      {STATUS_LABEL[b.status] ?? b.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col gap-3">
                  <div className="text-sm">
                    <div><span className="text-muted-foreground">Campanha:</span> {b.campanha}</div>
                    {b.verba_estimada && (
                      <div>
                        <span className="text-muted-foreground">Verba:</span>{" "}
                        {Number(b.verba_estimada).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </div>
                    )}
                    {b.periodo_estimado && (
                      <div><span className="text-muted-foreground">Período:</span> {b.periodo_estimado}</div>
                    )}
                    {b.produtos && b.produtos.length > 0 && (
                      <div><span className="text-muted-foreground">Produtos TV:</span> {b.produtos.length}</div>
                    )}
                  </div>
                  <BriefingTimeline status={b.status} />
                  <div className="flex gap-2 mt-auto flex-wrap">

                    <Select
                      value={b.status}
                      onValueChange={(v) => changeStatus.mutate({ id: b.id, status: v })}
                    >
                      <SelectTrigger className="h-8 text-xs flex-1 min-w-[140px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(STATUS_LABEL).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {isAdmin && b.status !== "concluido" && b.status !== "recusado" && (
                      <Button
                        size="sm"
                        variant="default"
                        className="h-8"
                        onClick={async () => {
                          await changeStatus.mutateAsync({ id: b.id, status: "em_proposta" });
                          navigate({ to: "/propostas" });
                        }}
                        title="Marcar como 'em confecção' e abrir Propostas"
                      >
                        <FilePlus2 className="size-4 mr-1" /> Criar Proposta
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" onClick={() => { setEditing(b); setOpen(true); }}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => { if (confirm("Excluir esta solicitação?")) del.mutate(b.id); }}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <BriefingFormDialog
        open={open}
        onOpenChange={setOpen}
        initial={editing}
      />
    </AppShell>
  );
}
