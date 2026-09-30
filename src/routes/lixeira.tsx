import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trash2, RotateCcw, AlertTriangle } from "lucide-react";
import { listTrashItems, restoreTrashItem, purgeTrashItem } from "@/lib/lixeira.functions";
import { useUserRoles } from "@/hooks/use-roles";
import { toast } from "sonner";

export const Route = createFileRoute("/lixeira")({
  head: () => ({ meta: [{ title: "Lixeira — Mídia.OS" }] }),
  component: LixeiraPage,
});

const TABELA_LABEL: Record<string, string> = {
  clientes: "Cliente",
  agencias: "Agência",
  propostas: "Proposta",
  pis: "PI",
  briefings: "Briefing",
  produtos: "Produto",
  projetos_especiais: "Projeto Especial",
  influenciadores: "Influenciador",
  tarefas: "Tarefa",
  emissoras: "Emissora",
  reunioes: "Reunião",
  eventos_calendario: "Evento",
  materiais_apoio: "Material",
  links_uteis: "Link",
  permuta_recebimentos: "Permuta",
  metas_executivo: "Meta",
};

function LixeiraPage() {
  const qc = useQueryClient();
  const { isAdmin, roles, loading } = useUserRoles();
  const autorizado = isAdmin || roles.includes("super_admin");

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["trash-items"],
    enabled: autorizado,
    queryFn: () => listTrashItems() as unknown as Promise<any[]>,
  });

  const restore = useMutation({
    mutationFn: (id: string) => restoreTrashItem({ data: { id } }),
    onSuccess: () => {
      toast.success("Item restaurado");
      qc.invalidateQueries({ queryKey: ["trash-items"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const purge = useMutation({
    mutationFn: (id: string) => purgeTrashItem({ data: { id } }),
    onSuccess: () => {
      toast.success("Item apagado permanentemente");
      qc.invalidateQueries({ queryKey: ["trash-items"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-md bg-destructive/10 text-destructive flex items-center justify-center">
            <Trash2 className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-semibold leading-tight">Lixeira</h1>
            <p className="text-sm text-muted-foreground">
              Itens excluídos ficam aqui por 45 dias antes da remoção definitiva.
            </p>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : !autorizado ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              Acesso restrito a administradores.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <p className="p-6 text-sm text-muted-foreground">Carregando...</p>
              ) : items.length === 0 ? (
                <p className="p-6 text-sm text-muted-foreground">A lixeira está vazia.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Excluído em</TableHead>
                        <TableHead>Expira em</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((r) => {
                        const dias = Math.max(
                          0,
                          Math.ceil((new Date(r.expires_at).getTime() - Date.now()) / 86400000),
                        );
                        return (
                          <TableRow key={r.id}>
                            <TableCell>
                              <Badge variant="secondary">
                                {TABELA_LABEL[r.tabela] || r.tabela}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium truncate max-w-[320px]">
                              {r.descricao || r.registro_id}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(r.deleted_at).toLocaleString("pt-BR")}
                            </TableCell>
                            <TableCell className="text-sm">
                              <span
                                className={
                                  dias <= 7
                                    ? "text-destructive font-medium flex items-center gap-1"
                                    : ""
                                }
                              >
                                {dias <= 7 && <AlertTriangle className="size-3" />}
                                {dias} dia{dias !== 1 ? "s" : ""}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => restore.mutate(r.id)}
                                  disabled={restore.isPending}
                                >
                                  <RotateCcw className="size-4 mr-1" /> Restaurar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => {
                                    if (
                                      confirm(
                                        "Apagar permanentemente? Esta ação não pode ser desfeita.",
                                      )
                                    )
                                      purge.mutate(r.id);
                                  }}
                                  disabled={purge.isPending}
                                >
                                  <Trash2 className="size-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
