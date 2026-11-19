import React from "react";
import { Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  FileCheck2,
  Clock,
  Camera,
  ArrowRight,
  ShieldAlert,
  Send,
  Sparkles,
} from "lucide-react";

interface RadarPendenciasProps {
  radar?: {
    campanhasSemPi?: any[];
    propostasAguardando?: any[];
    checkingPendente?: any[];
    ativosVencendo?: any[];
  };
  isLoading?: boolean;
}

export function RadarPendenciasCriticas({
  radar,
  isLoading = false,
}: RadarPendenciasProps) {
  const campanhasSemPiCount = radar?.campanhasSemPi?.length ?? 0;
  const ativosVencendoCount = radar?.ativosVencendo?.length ?? 0;
  const checkingPendenteCount = radar?.checkingPendente?.length ?? 0;
  const propostasAguardandoCount = radar?.propostasAguardando?.length ?? 0;

  const totalPendencias =
    campanhasSemPiCount +
    ativosVencendoCount +
    checkingPendenteCount +
    propostasAguardandoCount;

  return (
    <Card className="border border-border/80 bg-card/60 shadow-xs overflow-hidden">
      <div className="bg-muted/40 px-5 py-3 border-b border-border/60 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <ShieldAlert className="size-4 text-amber-500" />
          <h3 className="font-bold text-xs sm:text-sm text-foreground">
            Radar Operacional de Pendências & Alertas Críticos
          </h3>
        </div>
        <Badge
          variant={totalPendencias > 0 ? "default" : "secondary"}
          className={`text-[10px] font-semibold ${
            totalPendencias > 0
              ? "bg-amber-500 hover:bg-amber-600 text-amber-950 font-bold"
              : ""
          }`}
        >
          {isLoading ? "…" : `${totalPendencias} itens no radar`}
        </Badge>
      </div>

      <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        {/* 1. Campanhas sem PI emitido */}
        <Link
          to="/propostas"
          className={`p-3 rounded-xl border transition-all duration-150 flex flex-col justify-between group ${
            campanhasSemPiCount > 0
              ? "bg-rose-500/5 border-rose-500/30 hover:border-rose-500/60 hover:bg-rose-500/10"
              : "bg-muted/20 border-border/50 hover:bg-muted/40"
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="size-7 rounded-lg bg-rose-500/15 text-rose-600 flex items-center justify-center font-bold">
              <FileCheck2 className="size-3.5" />
            </div>
            <Badge
              variant="outline"
              className={`text-[10px] font-bold ${
                campanhasSemPiCount > 0
                  ? "border-rose-300 text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40"
                  : "text-muted-foreground"
              }`}
            >
              {isLoading ? "…" : campanhasSemPiCount}
            </Badge>
          </div>
          <div className="mt-2.5">
            <div className="font-semibold text-xs text-foreground group-hover:text-rose-600 transition-colors">
              Campanhas sem PI Emitido
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
              {campanhasSemPiCount > 0
                ? "Propostas aprovadas aguardando emissão formal para liberar veiculação."
                : "Nenhuma campanha travada. Veiculações liberadas."}
            </p>
          </div>
          <div className="mt-2 text-[10px] text-rose-600 font-semibold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <span>Emitir agora</span>
            <ArrowRight className="size-2.5" />
          </div>
        </Link>

        {/* 2. Ativos com Veiculação Vencendo */}
        <Link
          to="/pi"
          className={`p-3 rounded-xl border transition-all duration-150 flex flex-col justify-between group ${
            ativosVencendoCount > 0
              ? "bg-amber-500/5 border-amber-500/30 hover:border-amber-500/60 hover:bg-amber-500/10"
              : "bg-muted/20 border-border/50 hover:bg-muted/40"
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="size-7 rounded-lg bg-amber-500/15 text-amber-600 flex items-center justify-center font-bold">
              <Clock className="size-3.5" />
            </div>
            <Badge
              variant="outline"
              className={`text-[10px] font-bold ${
                ativosVencendoCount > 0
                  ? "border-amber-300 text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40"
                  : "text-muted-foreground"
              }`}
            >
              {isLoading ? "…" : ativosVencendoCount}
            </Badge>
          </div>
          <div className="mt-2.5">
            <div className="font-semibold text-xs text-foreground group-hover:text-amber-600 transition-colors">
              Veiculação Vencendo (7d)
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
              {ativosVencendoCount > 0
                ? "Oportunidade ativa para propor renovação antecipada ao cliente."
                : "Sem contratos expirando nesta semana."}
            </p>
          </div>
          <div className="mt-2 text-[10px] text-amber-600 font-semibold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <span>Ver contratos</span>
            <ArrowRight className="size-2.5" />
          </div>
        </Link>

        {/* 3. Checking Pendente */}
        <Link
          to="/historico-veiculacao"
          className={`p-3 rounded-xl border transition-all duration-150 flex flex-col justify-between group ${
            checkingPendenteCount > 0
              ? "bg-purple-500/5 border-purple-500/30 hover:border-purple-500/60 hover:bg-purple-500/10"
              : "bg-muted/20 border-border/50 hover:bg-muted/40"
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="size-7 rounded-lg bg-purple-500/15 text-purple-600 flex items-center justify-center font-bold">
              <Camera className="size-3.5" />
            </div>
            <Badge
              variant="outline"
              className={`text-[10px] font-bold ${
                checkingPendenteCount > 0
                  ? "border-purple-300 text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40"
                  : "text-muted-foreground"
              }`}
            >
              {isLoading ? "…" : checkingPendenteCount}
            </Badge>
          </div>
          <div className="mt-2.5">
            <div className="font-semibold text-xs text-foreground group-hover:text-purple-600 transition-colors">
              Checking Fotográfico
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
              {checkingPendenteCount > 0
                ? "Fotos ou relatórios de exibição aguardando upload/auditoria."
                : "Todos os comprovantes em dia."}
            </p>
          </div>
          <div className="mt-2 text-[10px] text-purple-600 font-semibold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <span>Auditar agora</span>
            <ArrowRight className="size-2.5" />
          </div>
        </Link>

        {/* 4. Propostas Aguardando Retorno */}
        <Link
          to="/propostas"
          className={`p-3 rounded-xl border transition-all duration-150 flex flex-col justify-between group ${
            propostasAguardandoCount > 0
              ? "bg-sky-500/5 border-sky-500/30 hover:border-sky-500/60 hover:bg-sky-500/10"
              : "bg-muted/20 border-border/50 hover:bg-muted/40"
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="size-7 rounded-lg bg-sky-500/15 text-sky-600 flex items-center justify-center font-bold">
              <Send className="size-3.5" />
            </div>
            <Badge
              variant="outline"
              className={`text-[10px] font-bold ${
                propostasAguardandoCount > 0
                  ? "border-sky-300 text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/40"
                  : "text-muted-foreground"
              }`}
            >
              {isLoading ? "…" : propostasAguardandoCount}
            </Badge>
          </div>
          <div className="mt-2.5">
            <div className="font-semibold text-xs text-foreground group-hover:text-sky-600 transition-colors">
              Follow-up de Propostas
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
              {propostasAguardandoCount > 0
                ? "Propostas enviadas ao cliente precisando de contato ou fechamento."
                : "Sem propostas pendentes de resposta."}
            </p>
          </div>
          <div className="mt-2 text-[10px] text-sky-600 font-semibold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <span>Fazer follow-up</span>
            <ArrowRight className="size-2.5" />
          </div>
        </Link>
      </CardContent>
    </Card>
  );
}
