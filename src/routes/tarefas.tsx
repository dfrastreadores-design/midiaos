import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, ArrowRight, ArrowLeft, Calendar, Flag, Link2 } from "lucide-react";
import { toast } from "sonner";
import { listTarefas, upsertTarefa, moveTarefa, deleteTarefa } from "@/lib/tarefas.functions";
import { listClientes } from "@/lib/clientes.functions";
import { listAgencias } from "@/lib/agencias.functions";
import { listPis } from "@/lib/pi.functions";
import { listPropostas } from "@/lib/propostas.functions";
import { listProjetos } from "@/lib/projetos.functions";

export const Route = createFileRoute("/tarefas")({
  head: () => ({ meta: [{ title: "Tarefas — Mídia.OS" }] }),
  component: TarefasPage,
});

type Status = "a_fazer" | "fazendo" | "concluido";
type Prioridade = "baixa" | "media" | "alta";

type Tarefa = {
  id: string;
  titulo: string;
  descricao: string | null;
  status: Status;
  prioridade: Prioridade;
  prazo: string | null;
  responsavel: string | null;
  cliente_id: string | null;
  agencia_id: string | null;
  pi_id: string | null;
  proposta_id: string | null;
  projeto_id: string | null;
  cliente?: { razao_social?: string | null; nome_fantasia?: string | null } | null;
  agencia?: { razao_social?: string | null; nome_fantasia?: string | null } | null;
  pi?: { numero?: string | null } | null;
  proposta?: { numero?: string | null } | null;
  projeto?: { nome?: string | null } | null;
};

const COLUNAS: { id: Status; label: string; tone: string }[] = [
  { id: "a_fazer", label: "A fazer", tone: "bg-muted text-muted-foreground" },
  { id: "fazendo", label: "Fazendo", tone: "bg-primary/10 text-primary" },
  { id: "concluido", label: "Concluído", tone: "bg-success/15 text-success" },
];

const PRIO_COLORS: Record<Prioridade, string> = {
  baixa: "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  media: "bg-amber-200/70 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200",
  alta: "bg-red-200/80 text-red-900 dark:bg-red-900/40 dark:text-red-200",
};

const PRIO_LABEL: Record<Prioridade, string> = { baixa: "Baixa", media: "Média", alta: "Alta" };

const fmtDate = (s?: string | null) =>
  s ? new Date(s + "T00:00:00").toLocaleDateString("pt-BR") : null;

function TarefasPage() {
  const qc = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Tarefa | null>(null);
  const [defaultStatus, setDefaultStatus] = useState<Status>("a_fazer");

  const { data: tarefas = [], isLoading } = useQuery({
    queryKey: ["tarefas"],
    queryFn: () => listTarefas() as unknown as Promise<Tarefa[]>,
  });

  const move = useMutation({
    mutationFn: (vars: { id: string; status: Status }) => moveTarefa({ data: vars }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tarefas"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: (id: string) => deleteTarefa({ data: { id } }),
    onSuccess: () => {
      toast.success("Tarefa removida");
      qc.invalidateQueries({ queryKey: ["tarefas"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const grouped = useMemo(() => {
    const map: Record<Status, Tarefa[]> = { a_fazer: [], fazendo: [], concluido: [] };
    for (const t of tarefas) map[t.status]?.push(t);
    return map;
  }, [tarefas]);

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-semibold tracking-tight">
            Minhas Tarefas
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Organize seu trabalho em um quadro pessoal estilo Kanban.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setDefaultStatus("a_fazer");
            setFormOpen(true);
          }}
        >
          <Plus className="size-4 mr-2" /> Nova tarefa
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center text-muted-foreground py-16">Carregando…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {COLUNAS.map((col) => (
            <Card key={col.id} className="bg-card/60">
              <CardContent className="p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className={col.tone}>{col.label}</Badge>
                    <span className="text-xs text-muted-foreground">{grouped[col.id].length}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditing(null);
                      setDefaultStatus(col.id);
                      setFormOpen(true);
                    }}
                  >
                    <Plus className="size-4" />
                  </Button>
                </div>
                <div className="space-y-2 min-h-[120px]">
                  {grouped[col.id].length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-6 border border-dashed rounded-md">
                      Sem tarefas
                    </p>
                  )}
                  {grouped[col.id].map((t) => {
                    const vinculo =
                      t.cliente?.nome_fantasia ||
                      t.cliente?.razao_social ||
                      t.agencia?.nome_fantasia ||
                      t.agencia?.razao_social ||
                      (t.pi?.numero ? `PI ${t.pi.numero}` : null) ||
                      (t.proposta?.numero ? `Prop ${t.proposta.numero}` : null) ||
                      t.projeto?.nome ||
                      null;
                    const prazo = fmtDate(t.prazo);
                    const atrasada =
                      t.prazo &&
                      t.status !== "concluido" &&
                      new Date(t.prazo + "T23:59:59") < new Date();
                    const idx = COLUNAS.findIndex((c) => c.id === col.id);
                    const prev = idx > 0 ? COLUNAS[idx - 1] : null;
                    const next = idx < COLUNAS.length - 1 ? COLUNAS[idx + 1] : null;
                    return (
                      <div
                        key={t.id}
                        className="rounded-md border bg-background p-3 shadow-sm space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <button
                            className="font-medium text-sm text-left hover:underline flex-1"
                            onClick={() => {
                              setEditing(t);
                              setFormOpen(true);
                            }}
                          >
                            {t.titulo}
                          </button>
                          <div className="flex gap-0.5 shrink-0">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-7"
                              title="Editar"
                              onClick={() => {
                                setEditing(t);
                                setFormOpen(true);
                              }}
                            >
                              <Pencil className="size-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-7"
                              title="Excluir"
                              onClick={() => {
                                if (confirm("Excluir tarefa?")) del.mutate(t.id);
                              }}
                            >
                              <Trash2 className="size-3.5 text-destructive" />
                            </Button>
                          </div>
                        </div>
                        {t.descricao && (
                          <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-3">
                            {t.descricao}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge className={PRIO_COLORS[t.prioridade]} variant="secondary">
                            <Flag className="size-3 mr-1" />
                            {PRIO_LABEL[t.prioridade]}
                          </Badge>
                          {prazo && (
                            <Badge
                              variant="outline"
                              className={atrasada ? "border-destructive text-destructive" : ""}
                            >
                              <Calendar className="size-3 mr-1" />
                              {prazo}
                            </Badge>
                          )}
                          {t.responsavel && <Badge variant="outline">{t.responsavel}</Badge>}
                          {vinculo && (
                            <Badge variant="outline" className="max-w-[180px] truncate">
                              <Link2 className="size-3 mr-1 shrink-0" />
                              <span className="truncate">{vinculo}</span>
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t">
                          {prev ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs"
                              onClick={() => move.mutate({ id: t.id, status: prev.id })}
                            >
                              <ArrowLeft className="size-3 mr-1" />
                              {prev.label}
                            </Button>
                          ) : (
                            <span />
                          )}
                          {next ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs ml-auto"
                              onClick={() => move.mutate({ id: t.id, status: next.id })}
                            >
                              {next.label}
                              <ArrowRight className="size-3 ml-1" />
                            </Button>
                          ) : (
                            <span />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <TarefaFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editing}
        defaultStatus={defaultStatus}
        onSaved={() => qc.invalidateQueries({ queryKey: ["tarefas"] })}
      />
    </AppShell>
  );
}

function TarefaFormDialog({
  open,
  onOpenChange,
  initial,
  defaultStatus,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: Tarefa | null;
  defaultStatus: Status;
  onSaved: () => void;
}) {
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [status, setStatus] = useState<Status>(defaultStatus);
  const [prioridade, setPrioridade] = useState<Prioridade>("media");
  const [prazo, setPrazo] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [vinculoTipo, setVinculoTipo] = useState<
    "nenhum" | "cliente" | "agencia" | "pi" | "proposta" | "projeto"
  >("nenhum");
  const [vinculoId, setVinculoId] = useState<string>("");

  useEffect(() => {
    if (!open) return;
    setTitulo(initial?.titulo ?? "");
    setDescricao(initial?.descricao ?? "");
    setStatus(initial?.status ?? defaultStatus);
    setPrioridade(initial?.prioridade ?? "media");
    setPrazo(initial?.prazo ?? "");
    setResponsavel(initial?.responsavel ?? "");
    if (initial?.cliente_id) {
      setVinculoTipo("cliente");
      setVinculoId(initial.cliente_id);
    } else if (initial?.agencia_id) {
      setVinculoTipo("agencia");
      setVinculoId(initial.agencia_id);
    } else if (initial?.pi_id) {
      setVinculoTipo("pi");
      setVinculoId(initial.pi_id);
    } else if (initial?.proposta_id) {
      setVinculoTipo("proposta");
      setVinculoId(initial.proposta_id);
    } else if (initial?.projeto_id) {
      setVinculoTipo("projeto");
      setVinculoId(initial.projeto_id);
    } else {
      setVinculoTipo("nenhum");
      setVinculoId("");
    }
  }, [open, initial, defaultStatus]);

  const { data: clientes = [] } = useQuery({
    queryKey: ["clientes"],
    queryFn: () => listClientes(),
    enabled: vinculoTipo === "cliente",
  });
  const { data: agencias = [] } = useQuery({
    queryKey: ["agencias"],
    queryFn: () => listAgencias(),
    enabled: vinculoTipo === "agencia",
  });
  const { data: pis = [] } = useQuery({
    queryKey: ["pis"],
    queryFn: () => listPis(),
    enabled: vinculoTipo === "pi",
  });
  const { data: propostas = [] } = useQuery({
    queryKey: ["propostas"],
    queryFn: () => listPropostas(),
    enabled: vinculoTipo === "proposta",
  });
  const { data: projetos = [] } = useQuery({
    queryKey: ["projetos"],
    queryFn: () => listProjetos(),
    enabled: vinculoTipo === "projeto",
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!titulo.trim()) throw new Error("Informe o título");
      return upsertTarefa({
        data: {
          id: initial?.id,
          titulo: titulo.trim(),
          descricao: descricao.trim() || null,
          status,
          prioridade,
          prazo: prazo || null,
          responsavel: responsavel.trim() || null,
          cliente_id: vinculoTipo === "cliente" ? vinculoId || null : null,
          agencia_id: vinculoTipo === "agencia" ? vinculoId || null : null,
          pi_id: vinculoTipo === "pi" ? vinculoId || null : null,
          proposta_id: vinculoTipo === "proposta" ? vinculoId || null : null,
          projeto_id: vinculoTipo === "projeto" ? vinculoId || null : null,
        },
      });
    },
    onSuccess: () => {
      toast.success("Tarefa salva");
      onSaved();
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? "Editar tarefa" : "Nova tarefa"}</DialogTitle>
          <DialogDescription>Quadro pessoal — só você visualiza suas tarefas.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label>Título</Label>
            <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={200} />
          </div>
          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Textarea
              rows={3}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              maxLength={4000}
            />
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Lista</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as Status)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COLUNAS.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Prioridade</Label>
              <Select value={prioridade} onValueChange={(v) => setPrioridade(v as Prioridade)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Prazo</Label>
              <Input type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Responsável</Label>
            <Input
              value={responsavel}
              onChange={(e) => setResponsavel(e.target.value)}
              placeholder="Nome ou apelido"
              maxLength={120}
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Vínculo</Label>
              <Select
                value={vinculoTipo}
                onValueChange={(v) => {
                  setVinculoTipo(v as typeof vinculoTipo);
                  setVinculoId("");
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nenhum">— Sem vínculo —</SelectItem>
                  <SelectItem value="cliente">Cliente</SelectItem>
                  <SelectItem value="agencia">Agência</SelectItem>
                  <SelectItem value="pi">PI</SelectItem>
                  <SelectItem value="proposta">Proposta</SelectItem>
                  <SelectItem value="projeto">Projeto Especial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {vinculoTipo !== "nenhum" && (
              <div className="space-y-1.5">
                <Label>Registro</Label>
                <Select
                  value={vinculoId || "none"}
                  onValueChange={(v) => setVinculoId(v === "none" ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Selecione —</SelectItem>
                    {vinculoTipo === "cliente" &&
                      (clientes as any[]).map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nome_fantasia || c.razao_social}
                        </SelectItem>
                      ))}
                    {vinculoTipo === "agencia" &&
                      (agencias as any[]).map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.nome_fantasia || a.razao_social}
                        </SelectItem>
                      ))}
                    {vinculoTipo === "pi" &&
                      (pis as any[]).map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.numero}
                        </SelectItem>
                      ))}
                    {vinculoTipo === "proposta" &&
                      (propostas as any[]).map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.numero} · {p.campanha}
                        </SelectItem>
                      ))}
                    {vinculoTipo === "projeto" &&
                      (projetos as any[]).map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.nome}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
