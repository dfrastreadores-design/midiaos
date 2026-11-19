import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Calendar, AlertTriangle, FileText, Receipt, Clock } from "lucide-react";
import { getInicio } from "@/lib/inicio.functions";
import { useUserRoles } from "@/hooks/use-roles";
import { QuickActionsBar } from "@/components/QuickActionsBar";
import { RadarPendenciasCriticas } from "@/components/RadarPendenciasCriticas";

const fmtHora = (iso: string) =>
  new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
const fmtData = (s: string) => new Date(s + "T00:00:00").toLocaleDateString("pt-BR");
const fmtBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

function saudacao() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

export function WelcomeHero() {
  const { roles } = useUserRoles();
  const isProducaoOnly =
    roles.includes("producao") &&
    !roles.includes("admin") &&
    !roles.includes("executivo") &&
    !roles.includes("opec");

  const { data, isLoading } = useQuery({
    queryKey: ["inicio"],
    queryFn: () => getInicio(),
  });

  const nome = data?.nome?.split(" ")[0] ?? "";
  const totalTarefas = (data?.reunioesHoje.length ?? 0) + (data?.eventosHoje.length ?? 0);
  const totalVencer = (data?.propostasAVencer.length ?? 0) + (data?.pisAVencer.length ?? 0);

  return (
    <div className="mb-6 space-y-4">
      {/* Hero */}
      <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-background to-gold/5">
        <CardContent className="p-6 flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wider text-primary font-medium flex items-center gap-1.5">
              <Sparkles className="size-3.5" />{" "}
              {new Date().toLocaleDateString("pt-BR", {
                weekday: "long",
                day: "2-digit",
                month: "long",
              })}
            </div>
            <h1 className="text-3xl lg:text-4xl font-display font-semibold">
              {saudacao()}
              {nome ? `, ${nome}` : ""} 👋
            </h1>
          </div>
          <div className="flex gap-3">
            <div className="text-center px-4 py-2 rounded-lg bg-primary/10 border border-primary/20">
              <div className="text-2xl font-display font-semibold text-primary">
                {isLoading ? "…" : totalTarefas}
              </div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Hoje</div>
            </div>
            <div className="text-center px-4 py-2 rounded-lg bg-warning/10 border border-warning/20">
              <div className="text-2xl font-display font-semibold text-warning">
                {isLoading ? "…" : totalVencer}
              </div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                A vencer
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Central de Comando: Ações Rápidas em 1 Clique */}
      <QuickActionsBar />

      {/* Radar Operacional de Pendências Críticas */}
      <RadarPendenciasCriticas
        radar={(data as any)?.radar}
        isLoading={isLoading}
      />

      {!isProducaoOnly && (
        <div className="grid lg:grid-cols-2 gap-4">
          {/* Tarefas do dia */}
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="size-4 text-primary" />
                <h2 className="font-medium">Tarefas e reuniões de hoje</h2>
                <Badge variant="secondary" className="ml-auto">
                  {totalTarefas}
                </Badge>
              </div>
              {totalTarefas === 0 && (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  Nenhum compromisso para hoje. Bom momento para prospectar! 🚀
                </p>
              )}
              <div className="space-y-2">
                {data?.reunioesHoje.map((r) => (
                  <div key={r.id} className="flex items-start gap-3 p-2 rounded hover:bg-muted/40">
                    <Clock className="size-4 text-primary mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{r.titulo}</div>
                      <div className="text-xs text-muted-foreground">
                        {fmtHora(r.data_inicio)} – {fmtHora(r.data_fim)}{" "}
                        {r.local ? `· ${r.local}` : ""}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      {r.status}
                    </Badge>
                  </div>
                ))}
                {data?.eventosHoje.map((e) => (
                  <div key={e.id} className="flex items-start gap-3 p-2 rounded hover:bg-muted/40">
                    <Calendar className="size-4 text-muted-foreground mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{e.titulo}</div>
                      <div className="text-xs text-muted-foreground">
                        {fmtHora(e.inicio)} {e.local ? `· ${e.local}` : ""}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      {e.origem}
                    </Badge>
                  </div>
                ))}
              </div>
              <Link
                to="/calendario"
                className="text-xs text-primary hover:underline mt-3 inline-block"
              >
                Ver agenda completa →
              </Link>
            </CardContent>
          </Card>

          {/* A vencer */}
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="size-4 text-warning" />
                <h2 className="font-medium">A vencer nos próximos 7 dias</h2>
                <Badge variant="secondary" className="ml-auto">
                  {totalVencer}
                </Badge>
              </div>
              {totalVencer === 0 && (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  Nada vencendo. Tudo sob controle ✅
                </p>
              )}
              <div className="space-y-2">
                {(() => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const diasAte = (d?: string | null) => {
                    if (!d) return Infinity;
                    const dt = new Date(d);
                    dt.setHours(0, 0, 0, 0);
                    return Math.round((dt.getTime() - today.getTime()) / 86400000);
                  };
                  const urgencia = (dias: number) => {
                    if (dias <= 1)
                      return {
                        wrap: "border-l-4 border-destructive bg-destructive/10 hover:bg-destructive/15 animate-pulse",
                        badge: "destructive" as const,
                        label: dias < 0 ? "Vencido" : dias === 0 ? "Vence hoje" : "Vence amanhã",
                      };
                    if (dias <= 3)
                      return {
                        wrap: "border-l-4 border-warning bg-warning/10 hover:bg-warning/15",
                        badge: "secondary" as const,
                        label: `${dias} dias`,
                      };
                    return {
                      wrap: "hover:bg-muted/40",
                      badge: "outline" as const,
                      label: `${dias} dias`,
                    };
                  };
                  return (
                    <>
                      {data?.propostasAVencer.map((p) => {
                        const dias = diasAte(p.validade);
                        const u = urgencia(dias);
                        return (
                          <Link
                            key={p.id}
                            to="/propostas"
                            className={`flex items-start gap-3 p-2 rounded ${u.wrap}`}
                          >
                            <FileText
                              className={`size-4 mt-0.5 ${dias <= 1 ? "text-destructive" : dias <= 3 ? "text-warning" : "text-primary"}`}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">
                                {p.numero} · {p.campanha}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Validade: {p.validade ? fmtData(p.validade) : "—"} ·{" "}
                                {fmtBRL(Number(p.valor_negociado))}
                              </div>
                            </div>
                            <Badge variant={u.badge} className="text-[10px] shrink-0">
                              {u.label}
                            </Badge>
                          </Link>
                        );
                      })}
                      {data?.pisAVencer.map((p) => {
                        const proxima = p.periodo_fim ?? undefined;
                        const label = "Fim da veiculação";
                        const dias = diasAte(proxima);
                        const u = urgencia(dias);
                        return (
                          <Link
                            key={p.id}
                            to="/pi"
                            className={`flex items-start gap-3 p-2 rounded ${u.wrap}`}
                          >
                            <Receipt
                              className={`size-4 mt-0.5 ${dias <= 1 ? "text-destructive" : dias <= 3 ? "text-warning" : "text-gold"}`}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">
                                {p.numero} · {p.campanha}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {label}: {proxima ? fmtData(proxima) : "—"} ·{" "}
                                {fmtBRL(Number(p.valor_negociado))}
                              </div>
                            </div>
                            <Badge variant={u.badge} className="text-[10px] shrink-0">
                              {u.label}
                            </Badge>
                          </Link>
                        );
                      })}
                    </>
                  );
                })()}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
