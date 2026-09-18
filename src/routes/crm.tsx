import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Info, Search, RefreshCw, AlertCircle, Clock, TrendingUp, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getFunilCrm, stageLabels, type FunnelStage, type CrmCard } from "@/lib/crm.functions";
import { formatBRL } from "@/lib/mock-data";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";


export const Route = createFileRoute("/crm")({
  head: () => ({ meta: [{ title: "Funil CRM — Mídia.OS" }] }),
  component: CRM,
});

const stageDot: Record<FunnelStage, string> = {
  prospeccao: "bg-muted-foreground",
  negociacao: "bg-accent",
  proposta: "bg-primary",
  aprovacao: "bg-gold",
  faturamento: "bg-success",
  finalizado: "bg-secondary-foreground",
};

const STAGES: FunnelStage[] = ["prospeccao", "negociacao", "proposta", "aprovacao", "faturamento", "finalizado"];

function CRM() {
  const [search, setSearch] = useState("");
  const { data = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["crm-funil"],
    queryFn: () => getFunilCrm() as unknown as Promise<CrmCard[]>,
  });

  const filtrados = useMemo(
    () => data.filter((c) => !search || c.cliente_nome.toLowerCase().includes(search.toLowerCase()) || c.campanha.toLowerCase().includes(search.toLowerCase())),
    [data, search],
  );

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-semibold tracking-tight">Funil de Vendas</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Atualizado automaticamente conforme você usa o sistema — sem arrastar.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar cliente ou campanha…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 w-64" />
          </div>
          <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`size-4 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <TrendingUp className="size-5" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase font-semibold">Total em Aberto</div>
              <div className="text-xl font-bold">{formatBRL(data.reduce((a, b) => a + (b.stage !== "finalizado" ? b.valor : 0), 0))}</div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gold/5 border-gold/20">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="size-10 rounded-full bg-gold/10 flex items-center justify-center text-gold">
              <AlertCircle className="size-5" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase font-semibold">Alertas Críticos</div>
              <div className="text-xl font-bold text-destructive">{data.filter(c => c.alerta === "urgente").length}</div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-success/5 border-success/20">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="size-10 rounded-full bg-success/10 flex items-center justify-center text-success">
              <DollarSign className="size-5" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase font-semibold">Faturamento Mês</div>
              <div className="text-xl font-bold">{formatBRL(data.filter(c => c.stage === "faturamento").reduce((a, b) => a + b.valor, 0))}</div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-muted/5 border-muted-foreground/20">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="size-10 rounded-full bg-muted/20 flex items-center justify-center text-muted-foreground">
              <Clock className="size-5" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase font-semibold">Tempo Médio</div>
              <div className="text-xl font-bold">12 dias</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-lg border bg-blue-50/50 p-4 mb-6 flex items-start gap-3 text-sm text-blue-900 dark:bg-blue-950/20 dark:text-blue-200">
        <Info className="size-5 mt-0.5 shrink-0 text-blue-600" />
        <div>
          <p className="font-semibold mb-1">Como funciona o Funil Automático?</p>
          As etapas são calculadas em tempo real: cliente sem oportunidade fica em <strong>Prospecção</strong>; proposta em rascunho vai para <strong>Negociação</strong>; proposta enviada/aprovada vai para <strong>Proposta enviada</strong>; PI rascunho/enviado vai para <strong>Em aprovação</strong>; PI aprovado em veiculação vai para <strong>Faturamento</strong>; PI faturado ou com período encerrado vai para <strong>Finalizado</strong>.
        </div>
      </div>


      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {STAGES.map((s) => {
          const items = filtrados.filter((n) => n.stage === s);
          const total = items.reduce((a, b) => a + b.valor, 0);
          return (
            <div key={s} className="bg-muted/40 rounded-xl p-3 min-h-[400px]">
              <div className="flex items-center justify-between mb-3 px-1">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{stageLabels[s]}</div>
                  <div className="text-xs text-foreground/60 mt-0.5">{items.length} • {formatBRL(total)}</div>
                </div>
                <span className={`size-2 rounded-full ${stageDot[s]}`} />
              </div>
              <div className="space-y-2">
                {isLoading && <p className="text-xs text-muted-foreground px-1">Carregando…</p>}
                {!isLoading && items.length === 0 && <p className="text-xs text-muted-foreground/60 px-1 italic">Vazio</p>}
                {items.map((n) => (
                  <Card key={n.cliente_id} className={`hover:shadow-lg transition-all border-l-4 ${
                    n.alerta === "urgente" ? "border-l-destructive bg-destructive/5" : 
                    n.alerta === "atencao" ? "border-l-gold bg-gold/5" : "border-l-primary/40"
                  }`}>
                    <CardContent className="p-3">
                      <div className="flex justify-between items-start mb-1">
                        <div className="font-semibold text-sm leading-tight text-foreground/90">{n.cliente_nome}</div>
                        {n.alerta && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <AlertCircle className={`size-4 ${n.alerta === "urgente" ? "text-destructive" : "text-gold"}`} />
                              </TooltipTrigger>
                              <TooltipContent>{n.alerta_msg}</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground mb-3 truncate font-medium bg-muted/50 rounded px-1.5 py-0.5 inline-block">{n.campanha}</div>
                      
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-sm font-bold text-primary">{formatBRL(n.valor)}</span>
                        {n.executivo && (
                          <Badge variant="secondary" className="text-[9px] h-4 px-1 uppercase font-bold tracking-tighter">
                            {n.executivo.split(" ")[0]}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="mt-3 pt-2 border-t flex flex-col gap-1.5">
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                          <Clock className="size-3" />
                          <span>Atualizado {new Date(n.atualizado_em).toLocaleDateString("pt-BR")}</span>
                        </div>
                        <div className="text-[11px] font-medium text-foreground/70 bg-primary/5 rounded p-1.5 border border-primary/10 italic">
                          "{n.proximoPasso}"
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                ))}
              </div>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
