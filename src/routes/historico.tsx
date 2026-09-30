import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ShieldAlert, History, Eye } from "lucide-react";
import { listAuditoriaAlteracoes } from "@/lib/auditoria.functions";
import { useUserRoles } from "@/hooks/use-roles";

export const Route = createFileRoute("/historico")({
  head: () => ({ meta: [{ title: "Histórico de Alterações — Mídia.OS" }] }),
  component: HistoricoPage,
});

const TABELAS: { key: string; label: string }[] = [
  { key: "", label: "Todas as tabelas" },
  { key: "clientes", label: "Clientes" },
  { key: "agencias", label: "Agências" },
  { key: "pis", label: "Pedidos de Inserção" },
  { key: "pi_itens", label: "Itens de PI" },
  { key: "propostas", label: "Propostas" },
  { key: "proposta_itens", label: "Itens de Proposta" },
  { key: "projetos_especiais", label: "Projetos Especiais" },
  { key: "reunioes", label: "Reuniões" },
  { key: "metas_executivo", label: "Metas" },
  { key: "produtos", label: "Produtos" },
  { key: "profiles", label: "Perfis de Usuário" },
  { key: "user_roles", label: "Papéis de Usuário" },
  { key: "midia_config", label: "Configuração de Mídia" },
  { key: "notificacao_config", label: "Configuração de Notificações" },
];

type Row = {
  id: string;
  user_id: string | null;
  tabela: string;
  registro_id: string | null;
  operacao: "INSERT" | "UPDATE" | "DELETE";
  alteracoes: Record<string, { old: unknown; new: unknown }> | null;
  valor_anterior: Record<string, unknown> | null;
  valor_novo: Record<string, unknown> | null;
  created_at: string;
  autor: { nome: string; email: string } | null;
};

const opVariant: Record<string, "default" | "secondary" | "destructive"> = {
  INSERT: "default",
  UPDATE: "secondary",
  DELETE: "destructive",
};

function HistoricoPage() {
  const { isAdmin, loading } = useUserRoles();
  const fetchList = useServerFn(listAuditoriaAlteracoes);
  const [tabela, setTabela] = useState("");
  const [op, setOp] = useState<string>("");
  const [search, setSearch] = useState("");
  const [detalhe, setDetalhe] = useState<Row | null>(null);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["auditoria_alteracoes", tabela, op],
    queryFn: () =>
      fetchList({
        data: {
          tabela: tabela || undefined,
          operacao: (op || undefined) as "INSERT" | "UPDATE" | "DELETE" | undefined,
          limit: 300,
        },
      }) as unknown as Promise<Row[]>,
    enabled: isAdmin,
  });

  const filtered = useMemo(() => {
    const s = search.toLowerCase().trim();
    if (!s) return rows;
    return rows.filter(
      (r) =>
        r.autor?.nome?.toLowerCase().includes(s) ||
        r.autor?.email?.toLowerCase().includes(s) ||
        r.registro_id?.toLowerCase().includes(s) ||
        r.tabela.toLowerCase().includes(s),
    );
  }, [rows, search]);

  if (loading)
    return (
      <AppShell>
        <p className="text-muted-foreground">Carregando…</p>
      </AppShell>
    );
  if (!isAdmin) {
    return (
      <AppShell>
        <Card>
          <CardContent className="p-10 text-center">
            <ShieldAlert className="size-10 mx-auto mb-3 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Acesso restrito</h2>
            <p className="text-sm text-muted-foreground">
              Apenas administradores podem visualizar o histórico de alterações.
            </p>
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <History className="size-6" />
          <h1 className="text-2xl lg:text-3xl font-display font-semibold tracking-tight">
            Histórico de Alterações
          </h1>
        </div>
        <p className="text-muted-foreground text-sm mt-1">
          Registro completo de criações, edições e exclusões feitas por qualquer usuário.
        </p>
      </div>

      <Card className="mb-4">
        <CardContent className="p-4 grid sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Tabela</label>
            <Select
              value={tabela || "__all"}
              onValueChange={(v) => setTabela(v === "__all" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TABELAS.map((t) => (
                  <SelectItem key={t.key || "__all"} value={t.key || "__all"}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Operação</label>
            <Select value={op || "__all"} onValueChange={(v) => setOp(v === "__all" ? "" : v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">Todas</SelectItem>
                <SelectItem value="INSERT">Criação</SelectItem>
                <SelectItem value="UPDATE">Edição</SelectItem>
                <SelectItem value="DELETE">Exclusão</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Buscar (autor, tabela, id)</label>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filtrar…"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Autor</TableHead>
                <TableHead>Tabela</TableHead>
                <TableHead>Operação</TableHead>
                <TableHead>Registro</TableHead>
                <TableHead>Campos alterados</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Carregando…
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhum registro encontrado.
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((r) => {
                const campos = r.alteracoes ? Object.keys(r.alteracoes) : [];
                return (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs whitespace-nowrap">
                      {new Date(r.created_at).toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-sm">
                      {r.autor ? (
                        <div>
                          <div className="font-medium">{r.autor.nome}</div>
                          <div className="text-xs text-muted-foreground">{r.autor.email}</div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">Sistema</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{r.tabela}</TableCell>
                    <TableCell>
                      <Badge variant={opVariant[r.operacao]}>{r.operacao}</Badge>
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {r.registro_id?.slice(0, 8) ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[280px] truncate">
                      {r.operacao === "INSERT"
                        ? "(novo registro)"
                        : r.operacao === "DELETE"
                          ? "(registro removido)"
                          : campos.join(", ") || "—"}
                    </TableCell>
                    <TableCell>
                      <button
                        className="text-primary hover:underline text-xs flex items-center gap-1"
                        onClick={() => setDetalhe(r)}
                      >
                        <Eye className="size-3" /> ver
                      </button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!detalhe} onOpenChange={(v) => !v && setDetalhe(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da alteração</DialogTitle>
          </DialogHeader>
          {detalhe && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Quando:</span>{" "}
                  {new Date(detalhe.created_at).toLocaleString("pt-BR")}
                </div>
                <div>
                  <span className="text-muted-foreground">Autor:</span>{" "}
                  {detalhe.autor?.nome ?? "Sistema"}
                </div>
                <div>
                  <span className="text-muted-foreground">Tabela:</span> {detalhe.tabela}
                </div>
                <div>
                  <span className="text-muted-foreground">Operação:</span> {detalhe.operacao}
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">ID do registro:</span>{" "}
                  <span className="font-mono">{detalhe.registro_id}</span>
                </div>
              </div>

              {detalhe.operacao === "UPDATE" && detalhe.alteracoes && (
                <div>
                  <div className="font-medium mb-2">Campos alterados</div>
                  <div className="space-y-2">
                    {Object.entries(detalhe.alteracoes).map(([campo, diff]) => (
                      <div key={campo} className="rounded border p-2 bg-muted/30">
                        <div className="text-xs font-medium mb-1">{campo}</div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <div className="text-muted-foreground">Antes</div>
                            <pre className="whitespace-pre-wrap break-all bg-destructive/5 p-1.5 rounded">
                              {JSON.stringify(diff.old, null, 2)}
                            </pre>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Depois</div>
                            <pre className="whitespace-pre-wrap break-all bg-primary/5 p-1.5 rounded">
                              {JSON.stringify(diff.new, null, 2)}
                            </pre>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {detalhe.operacao === "INSERT" && detalhe.valor_novo && (
                <div>
                  <div className="font-medium mb-2">Registro criado</div>
                  <pre className="text-xs whitespace-pre-wrap break-all bg-muted p-2 rounded">
                    {JSON.stringify(detalhe.valor_novo, null, 2)}
                  </pre>
                </div>
              )}
              {detalhe.operacao === "DELETE" && detalhe.valor_anterior && (
                <div>
                  <div className="font-medium mb-2">Registro removido</div>
                  <pre className="text-xs whitespace-pre-wrap break-all bg-muted p-2 rounded">
                    {JSON.stringify(detalhe.valor_anterior, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
