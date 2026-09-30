import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { eventosCalendario } from "@/lib/mock-data";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/calendario")({
  head: () => ({ meta: [{ title: "Calendário — Mídia.OS" }] }),
  component: Calendario,
});

const tipoColor: Record<string, string> = {
  Reunião: "bg-primary/10 text-primary",
  Campanha: "bg-success/15 text-success",
  Financeiro: "bg-warning/20 text-warning-foreground",
  Proposta: "bg-gold/20 text-gold-foreground",
};

function Calendario() {
  const dias = Array.from({ length: 31 }, (_, i) => i + 1);
  const eventosPorDia = (d: number) =>
    eventosCalendario.filter((e) => parseInt(e.data.split("/")[0]) === d);

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-display font-semibold tracking-tight">
          Calendário Comercial
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Maio / 2026</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardContent className="p-4">
            <div className="grid grid-cols-7 gap-1 text-xs text-center text-muted-foreground font-medium mb-2">
              {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => (
                <div key={i}>{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {dias.map((d) => {
                const evs = eventosPorDia(d);
                return (
                  <div
                    key={d}
                    className="aspect-square border rounded-md p-1.5 text-xs hover:bg-muted/50 transition relative"
                  >
                    <div className="font-medium">{d}</div>
                    {evs.length > 0 && (
                      <div className="absolute bottom-1 left-1 right-1 flex gap-0.5">
                        {evs.slice(0, 3).map((e, i) => (
                          <div
                            key={i}
                            className={`h-1 flex-1 rounded-full ${tipoColor[e.tipo].split(" ")[0]}`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Próximos Eventos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {eventosCalendario.map((e, i) => (
              <div key={i} className="flex gap-3 pb-3 border-b last:border-0 last:pb-0">
                <div className="w-12 text-center">
                  <div className="text-xs text-muted-foreground">Mai</div>
                  <div className="text-lg font-display font-semibold">{e.data.split("/")[0]}</div>
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">{e.titulo}</div>
                  <Badge className={`mt-1 text-[10px] ${tipoColor[e.tipo]}`}>{e.tipo}</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <DatasComemorativasCard />
    </AppShell>
  );
}

function DatasComemorativasCard() {
  const { data: datas = [] } = useQuery({
    queryKey: ["datas-comemorativas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("datas_comemorativas")
        .select("*")
        .eq("ativo", true);
      if (error) throw error;
      const hoje = new Date();
      return (data ?? [])
        .map((d: any) => {
          const ano = hoje.getFullYear();
          let alvo = new Date(ano, d.mes - 1, d.dia);
          if (alvo < hoje) alvo = new Date(ano + 1, d.mes - 1, d.dia);
          const diasRestantes = Math.ceil((alvo.getTime() - hoje.getTime()) / 86400000);
          return { ...d, alvo, diasRestantes };
        })
        .sort((a: any, b: any) => a.diasRestantes - b.diasRestantes)
        .slice(0, 12);
    },
  });

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="size-4 text-gold" />
          Datas Comemorativas e Sazonais
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Você será notificado automaticamente 45 dias antes de cada data com sugestões de clientes
          e projetos.
        </p>
      </CardHeader>
      <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {datas.map((d: any) => (
          <div key={d.id} className="border rounded-lg p-3 hover:bg-muted/40 transition">
            <div className="flex items-start justify-between gap-2">
              <div className="text-sm font-semibold">{d.nome}</div>
              <Badge
                variant={d.diasRestantes <= 45 ? "default" : "secondary"}
                className="text-[10px] shrink-0"
              >
                {d.diasRestantes}d
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {String(d.dia).padStart(2, "0")}/{String(d.mes).padStart(2, "0")} · {d.categoria}
            </div>
            {d.sugestoes_projetos && (
              <p className="text-[11px] text-muted-foreground mt-2 line-clamp-2">
                {d.sugestoes_projetos}
              </p>
            )}
            {d.segmentos_alvo?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {d.segmentos_alvo.slice(0, 4).map((s: string) => (
                  <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-muted">
                    {s}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
