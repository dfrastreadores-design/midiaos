import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listSyncCnpjLog } from "@/lib/sync-cnpj.functions";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/relatorio-sincronizacao")({
  component: Page,
});

function statusBadge(s: string) {
  const map: Record<string, { label: string; cls: string }> = {
    atualizado: { label: "Atualizado", cls: "bg-emerald-100 text-emerald-800" },
    sem_alteracao: { label: "Sem alteração", cls: "bg-slate-100 text-slate-700" },
    erro: { label: "Erro", cls: "bg-red-100 text-red-800" },
    ignorado: { label: "Ignorado", cls: "bg-amber-100 text-amber-800" },
  };
  const m = map[s] ?? { label: s, cls: "bg-muted" };
  return (
    <Badge className={m.cls} variant="secondary">
      {m.label}
    </Badge>
  );
}

function Page() {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["sync-cnpj-log", "all"],
    queryFn: () => listSyncCnpjLog({ data: { limit: 10000 } }),
    refetchInterval: 30_000,
  });

  const rows = (data?.rows ?? []) as any[];
  const grupos = rows.reduce<Record<string, any[]>>((acc, r) => {
    const dia = new Date(r.created_at).toLocaleDateString("pt-BR");
    (acc[dia] ||= []).push(r);
    return acc;
  }, {});
  const dias = Object.keys(grupos);

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-display font-semibold">Relatório de Sincronização</h1>
            <p className="text-sm text-muted-foreground">
              Rotina diária 00:01–05:55 (Brasília): verifica empresas com CNPJ cadastrado, atualiza
              divergências e aguarda 60s entre cada consulta.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`size-4 mr-2 ${isFetching ? "animate-spin" : ""}`} /> Atualizar
          </Button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Clientes c/ CNPJ</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">
              {data?.stats.clientes_total ?? "—"}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Clientes pendentes</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">
              {data?.stats.clientes_pendentes ?? "—"}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Agências c/ CNPJ</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">
              {data?.stats.agencias_total ?? "—"}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Agências pendentes</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">
              {data?.stats.agencias_pendentes ?? "—"}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              Histórico completo{" "}
              {rows.length > 0 && (
                <span className="text-sm font-normal text-muted-foreground">
                  ({rows.length} registros · {dias.length} dia(s))
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto space-y-6">
            {isLoading ? (
              <div className="text-center text-muted-foreground py-8">Carregando…</div>
            ) : rows.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                Nenhuma verificação registrada ainda.
              </div>
            ) : (
              dias.map((dia) => (
                <div key={dia} className="space-y-2">
                  <div className="flex items-center justify-between sticky top-0 bg-background py-1 z-10">
                    <h3 className="font-semibold text-sm">{dia}</h3>
                    <span className="text-xs text-muted-foreground">
                      {grupos[dia].length} verificação(ões)
                    </span>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Hora</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Razão social</TableHead>
                        <TableHead>CNPJ</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Detalhes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {grupos[dia].map((r: any) => {
                        const campos =
                          r.campos_alterados && typeof r.campos_alterados === "object"
                            ? Object.keys(r.campos_alterados)
                            : [];
                        return (
                          <TableRow key={r.id}>
                            <TableCell className="whitespace-nowrap text-xs">
                              {new Date(r.created_at).toLocaleTimeString("pt-BR")}
                            </TableCell>
                            <TableCell className="capitalize">{r.entidade_tipo}</TableCell>
                            <TableCell className="max-w-[260px] truncate">
                              {r.razao_social ?? "—"}
                            </TableCell>
                            <TableCell className="font-mono text-xs">{r.cnpj ?? "—"}</TableCell>
                            <TableCell>{statusBadge(r.status)}</TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-[360px]">
                              {campos.length > 0 ? (
                                <span>
                                  <b>Alterados:</b> {campos.join(", ")}
                                </span>
                              ) : (
                                (r.mensagem ?? "—")
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
