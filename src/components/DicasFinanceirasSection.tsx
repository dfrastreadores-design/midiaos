import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Lightbulb,
  AlertTriangle,
  TrendingUp,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Percent,
  RefreshCw,
} from "lucide-react";
import { getDicasFinanceiras, type DicaFinanceira } from "@/lib/financeiro.functions";
import { toast } from "sonner";

export function DicasFinanceirasSection() {
  const fetchDicasFn = useServerFn(getDicasFinanceiras);
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");

  const {
    data: dicas = [],
    isLoading,
    refetch,
    isFetching,
  } = useQuery<DicaFinanceira[]>({
    queryKey: ["dicas_financeiras"],
    queryFn: () => fetchDicasFn(),
  });

  const filtradas = dicas.filter((d) => {
    if (filtroTipo === "todos") return true;
    return d.tipo === filtroTipo;
  });

  const getIcon = (tipo: DicaFinanceira["tipo"]) => {
    switch (tipo) {
      case "alerta":
        return <AlertTriangle className="size-5 text-amber-600 dark:text-amber-400" />;
      case "estrategia":
        return <TrendingUp className="size-5 text-indigo-600 dark:text-indigo-400" />;
      case "positivo":
        return <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400" />;
      case "otimizacao":
        return <Percent className="size-5 text-purple-600 dark:text-purple-400" />;
      default:
        return <Lightbulb className="size-5 text-amber-500" />;
    }
  };

  const getBadge = (tipo: DicaFinanceira["tipo"]) => {
    switch (tipo) {
      case "alerta":
        return (
          <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300 text-[10px]">
            ⚠️ Alerta de Risco
          </Badge>
        );
      case "estrategia":
        return (
          <Badge className="bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-300 text-[10px]">
            📈 Estratégia de Crescimento
          </Badge>
        );
      case "positivo":
        return (
          <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 text-[10px]">
            ✅ Boa Prática
          </Badge>
        );
      case "otimizacao":
        return (
          <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-300 text-[10px]">
            💡 Otimização de Custos
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Banner de Apresentação das Dicas */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 p-6 text-white shadow-lg">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-semibold backdrop-blur-md">
              <Sparkles className="size-3.5 text-amber-400" />
              Consultor Financeiro Inteligente Mídia.OS
            </div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white">
              Dicas & Recomendações Financeiras da Sua Empresa
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Diagnósticos contínuos gerados a partir do seu fluxo de caixa, pagamentos de
              comissões, faturamento de PIs e despesas fixas para maximizar a lucratividade.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                refetch();
                toast.success("Diagnóstico financeiro atualizado com sucesso!");
              }}
              disabled={isFetching}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 gap-1.5 shadow-sm"
            >
              <RefreshCw className={`size-3.5 ${isFetching ? "animate-spin" : ""}`} />
              Atualizar Diagnóstico
            </Button>
          </div>
        </div>

        {/* Efeito decorativo */}
        <div className="absolute -right-10 -bottom-10 size-48 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
      </div>

      {/* Filtros de Categoria de Dicas */}
      <div className="flex flex-wrap gap-2 items-center">
        {[
          { id: "todos", label: "Todas as Dicas" },
          { id: "alerta", label: "Alertas de Risco" },
          { id: "estrategia", label: "Estratégia & Break-Even" },
          { id: "otimizacao", label: "Otimização de Custos" },
          { id: "positivo", label: "Boas Práticas" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFiltroTipo(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              filtroTipo === tab.id
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-background text-muted-foreground hover:bg-muted"
            }`}
          >
            {tab.label}
          </button>
        ))}
        <span className="text-xs text-muted-foreground ml-auto">
          {filtradas.length} recomendação(ões) ativa(s)
        </span>
      </div>

      {/* Grid de Cards de Dicas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtradas.map((dica) => (
          <Card
            key={dica.id}
            className="border-muted/80 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="p-2 rounded-xl bg-muted/40 shrink-0">{getIcon(dica.tipo)}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">{getBadge(dica.tipo)}</div>
                  <CardTitle className="text-base font-semibold leading-snug">
                    {dica.titulo}
                  </CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <p className="text-xs text-muted-foreground leading-relaxed">{dica.descricao}</p>

              <div className="p-2.5 rounded-lg bg-muted/30 border space-y-1.5">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground/80">
                  <ShieldCheck className="size-3.5 text-primary" />
                  Impacto nos Resultados:
                  <span className="font-normal text-muted-foreground">{dica.impacto}</span>
                </div>
                <div className="flex items-start gap-1.5 text-[11px] font-semibold text-primary">
                  <ArrowRight className="size-3.5 shrink-0 mt-0.5" />
                  <span>
                    Ação Recomendada:{" "}
                    <strong className="font-medium text-foreground">{dica.acaoRecomendada}</strong>
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
