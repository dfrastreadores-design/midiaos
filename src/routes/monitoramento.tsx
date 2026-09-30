import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Activity, Mail, Clock, AlertTriangle, RefreshCw } from "lucide-react";
import { useUserRoles } from "@/hooks/use-roles";
import { getMonitoramentoSummary } from "@/lib/monitoramento.functions";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/monitoramento")({
  component: MonitoramentoPage,
});

function fmt(ts: string | null | undefined) {
  if (!ts) return "—";
  return new Date(ts).toLocaleString("pt-BR");
}

function StatCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "ok" | "warn" | "fail";
}) {
  const colors: Record<string, string> = {
    default: "text-foreground",
    ok: "text-emerald-600",
    warn: "text-amber-600",
    fail: "text-rose-600",
  };
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
          {label}
        </div>
        <div className={`text-3xl font-bold mt-2 ${colors[tone]}`}>{value}</div>
        {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
      </CardContent>
    </Card>
  );
}

function MonitoramentoPage() {
  const { isSuperAdmin, loading } = useUserRoles();
  const fetchSummary = useServerFn(getMonitoramentoSummary);
  const { data, isFetching, refetch } = useQuery({
    queryKey: ["monitoramento-summary"],
    queryFn: () => fetchSummary(),
    enabled: isSuperAdmin,
    refetchInterval: 30000,
  });

  if (loading) {
    return (
      <AppShell>
        <div className="p-8 text-muted-foreground">Carregando…</div>
      </AppShell>
    );
  }
  if (!isSuperAdmin) {
    return (
      <AppShell>
        <div className="p-8">
          <Card>
            <CardContent className="pt-6 text-center">
              <AlertTriangle className="mx-auto h-10 w-10 text-amber-500 mb-3" />
              <p className="font-semibold">Acesso restrito</p>
              <p className="text-sm text-muted-foreground mt-1">
                Apenas administradores podem visualizar o monitoramento.
              </p>
              <Link to="/" className="text-primary text-sm underline mt-3 inline-block">
                Voltar ao Dashboard
              </Link>
            </CardContent>
          </Card>
        </div>
      </AppShell>
    );
  }

  const e = data?.emailStats;
  const c = data?.cronStats;
  const p = data?.piStats;

  return (
    <AppShell>
      <div className="p-4 md:p-8 space-y-6">
        <PageHeader
          title="Monitoramento"
          description="Saúde da fila de e-mail, jobs agendados, PIs gerados e ações sensíveis."
          icon={<Activity className="h-6 w-6" />}
          actions={
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
          }
        />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            label="E-mails 24h"
            value={e?.total24h ?? "—"}
            hint={`${e?.sent24h ?? 0} enviados • ${e?.pending24h ?? 0} pendentes`}
            tone="ok"
          />
          <StatCard
            label="Falhas e-mail 24h"
            value={e?.failed24h ?? "—"}
            hint={`${e?.suppressed24h ?? 0} suprimidos`}
            tone={(e?.failed24h ?? 0) > 0 ? "fail" : "ok"}
          />
          <StatCard
            label="Jobs com falha"
            value={c?.failed ?? "—"}
            hint={`de ${c?.total ?? 0} execuções recentes`}
            tone={(c?.failed ?? 0) > 0 ? "warn" : "ok"}
          />
          <StatCard
            label="PIs criados 24h"
            value={p?.total24h ?? "—"}
            hint={`${p?.rascunho ?? 0} rascunho • ${p?.cancelado ?? 0} cancelado`}
          />
        </div>

        <Tabs defaultValue="emails">
          <TabsList>
            <TabsTrigger value="emails">
              <Mail className="h-4 w-4 mr-2" />
              E-mails
            </TabsTrigger>
            <TabsTrigger value="jobs">
              <Clock className="h-4 w-4 mr-2" />
              Jobs agendados
            </TabsTrigger>
            <TabsTrigger value="auditoria">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Auditoria
            </TabsTrigger>
          </TabsList>

          <TabsContent value="emails">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Últimas falhas de e-mail</CardTitle>
              </CardHeader>
              <CardContent>
                {(data?.emailFailures?.length ?? 0) === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhuma falha registrada nos últimos 7 dias. ✅
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Quando</TableHead>
                          <TableHead>Template</TableHead>
                          <TableHead>Destinatário</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Erro</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(data?.emailFailures ?? []).map((r: any, i: number) => (
                          <TableRow key={i}>
                            <TableCell className="text-xs">{fmt(r.created_at)}</TableCell>
                            <TableCell className="text-xs">{r.template_name}</TableCell>
                            <TableCell className="text-xs">{r.recipient_email}</TableCell>
                            <TableCell>
                              <Badge variant="destructive">{r.status}</Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-[420px] truncate">
                              {r.error_message ?? "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="jobs">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Histórico de execuções (pg_cron)</CardTitle>
              </CardHeader>
              <CardContent>
                {(data?.cronRuns?.length ?? 0) === 0 ? (
                  <p className="text-sm text-muted-foreground">Sem histórico disponível.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Job</TableHead>
                          <TableHead>Início</TableHead>
                          <TableHead>Fim</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Mensagem</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(data?.cronRuns ?? []).map((r: any, i: number) => (
                          <TableRow key={i}>
                            <TableCell className="text-xs font-medium">
                              {r.jobname ?? `job ${r.jobid}`}
                            </TableCell>
                            <TableCell className="text-xs">{fmt(r.start_time)}</TableCell>
                            <TableCell className="text-xs">{fmt(r.end_time)}</TableCell>
                            <TableCell>
                              {r.status === "succeeded" ? (
                                <Badge
                                  variant="outline"
                                  className="text-emerald-600 border-emerald-200"
                                >
                                  {r.status}
                                </Badge>
                              ) : (
                                <Badge variant="destructive">{r.status}</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-[420px] truncate">
                              {r.return_message ?? "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="auditoria">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Exclusões recentes (últimos 7 dias)</CardTitle>
              </CardHeader>
              <CardContent>
                {(data?.auditDeletes?.length ?? 0) === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma exclusão registrada. ✅</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Quando</TableHead>
                          <TableHead>Tabela</TableHead>
                          <TableHead>Registro</TableHead>
                          <TableHead>Usuário</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(data?.auditDeletes ?? []).map((r: any) => (
                          <TableRow key={r.id}>
                            <TableCell className="text-xs">{fmt(r.created_at)}</TableCell>
                            <TableCell className="text-xs font-medium">{r.tabela}</TableCell>
                            <TableCell className="text-xs font-mono">{r.registro_id}</TableCell>
                            <TableCell className="text-xs">{r.user_id ?? "sistema"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {data?.generatedAt && (
          <p className="text-xs text-muted-foreground text-right">
            Atualizado em {fmt(data.generatedAt)} • atualização automática a cada 30s
          </p>
        )}
      </div>
    </AppShell>
  );
}
