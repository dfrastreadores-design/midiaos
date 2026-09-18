import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Sparkles, Pencil, Trash2, AlertTriangle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listProjetos, deleteProjeto } from "@/lib/projetos.functions";
import { ProjetoFormDialog } from "@/components/ProjetoFormDialog";
import { toast } from "sonner";

export const Route = createFileRoute("/projetos-especiais")({
  head: () => ({ meta: [{ title: "Projetos Especiais — Mídia.OS" }] }),
  component: ProjetosEspeciais,
});

const STATUS: Record<string, string> = {
  em_comercializacao: "bg-primary/10 text-primary",
  vendido: "bg-success/15 text-success",
  encerrado: "bg-muted text-muted-foreground",
  cancelado: "bg-destructive/15 text-destructive",
};

const fmt = (v: number | null) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

type Row = {
  id: string; nome: string; descricao: string | null; cliente_alvo: string | null;
  cliente_id: string | null; agencia_id: string | null;
  comercializacao_inicio: string | null; comercializacao_fim: string;
  valor_estimado: number | null; materiais: string | null; observacao: string | null;
  status: "em_comercializacao" | "vendido" | "encerrado" | "cancelado";
};

function daysLeft(date: string) {
  const d = new Date(date).getTime();
  return Math.floor((d - Date.now()) / (1000 * 60 * 60 * 24));
}

function ProjetosEspeciais() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["projetos"], queryFn: () => listProjetos() as unknown as Promise<Row[]>,
  });

  const del = useMutation({
    mutationFn: (id: string) => deleteProjeto({ data: { id } }),
    onSuccess: () => { toast.success("Projeto removido"); qc.invalidateQueries({ queryKey: ["projetos"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-semibold tracking-tight flex items-center gap-2">
            <Sparkles className="size-6 text-gold" /> Projetos Especiais
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Ações especiais com prazo de comercialização.</p>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus className="size-4 mr-2" /> Novo Projeto
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Projeto</TableHead>
                <TableHead>Cliente Alvo</TableHead>
                <TableHead>Comercialização</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando…</TableCell></TableRow>}
              {!isLoading && rows.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum projeto. Clique em "Novo Projeto".</TableCell></TableRow>
              )}
              {rows.map((p) => {
                const dl = daysLeft(p.comercializacao_fim);
                const isClosing = p.status === "em_comercializacao" && dl <= 7 && dl >= 0;
                const isOverdue = p.status === "em_comercializacao" && dl < 0;
                return (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="font-medium">{p.nome}</div>
                      {p.descricao && <div className="text-xs text-muted-foreground line-clamp-1 max-w-md">{p.descricao}</div>}
                    </TableCell>
                    <TableCell className="text-sm">{p.cliente_alvo || "—"}</TableCell>
                    <TableCell className="text-sm">
                      <div>{p.comercializacao_inicio ? new Date(p.comercializacao_inicio).toLocaleDateString("pt-BR") : "—"} → {new Date(p.comercializacao_fim).toLocaleDateString("pt-BR")}</div>
                      {(isClosing || isOverdue) && (
                        <div className={`text-xs flex items-center gap-1 mt-1 ${isOverdue ? "text-destructive" : "text-amber-600"}`}>
                          <AlertTriangle className="size-3" />
                          {isOverdue ? `Vencido há ${Math.abs(dl)}d` : `Faltam ${dl}d`}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-semibold">{fmt(p.valor_estimado)}</TableCell>
                    <TableCell><Badge className={STATUS[p.status]}>{p.status.replace("_", " ")}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-end">
                        <Button size="icon" variant="ghost" onClick={() => { setEditing(p); setOpen(true); }}><Pencil className="size-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => { if (confirm("Excluir projeto?")) del.mutate(p.id); }}><Trash2 className="size-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ProjetoFormDialog open={open} onOpenChange={setOpen} initial={editing} />
    </AppShell>
  );
}
