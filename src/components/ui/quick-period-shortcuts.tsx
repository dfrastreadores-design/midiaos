import React from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickPeriodShortcutsProps {
  onSelectRange: (startIso: string, endIso: string, label: string) => void;
  className?: string;
  size?: "xs" | "sm";
}

function formatDateToIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Calcula os períodos rápidos e bi-semanas tradicionais OOH
 */
function getOohPeriodPresets() {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  // 1. Bi-semana Atual (Alinha na última segunda-feira e vai por 14 dias até o domingo correspondente)
  const diaSemana = hoje.getDay(); // 0 = Domingo, 1 = Segunda ...
  // Distância até a segunda-feira desta semana (ou anterior)
  const diffSegunda = (diaSemana === 0 ? -6 : 1) - diaSemana;
  const inicioBiSemana = new Date(hoje);
  inicioBiSemana.setDate(hoje.getDate() + diffSegunda);

  const fimBiSemana = new Date(inicioBiSemana);
  fimBiSemana.setDate(inicioBiSemana.getDate() + 13); // 14 dias de veiculação

  // 2. Próxima Bi-semana (inicia na segunda-feira seguinte ao término da atual)
  const inicioProxBiSemana = new Date(fimBiSemana);
  inicioProxBiSemana.setDate(fimBiSemana.getDate() + 1);

  const fimProxBiSemana = new Date(inicioProxBiSemana);
  fimProxBiSemana.setDate(inicioProxBiSemana.getDate() + 13);

  // 3. 15 Dias (a partir de hoje)
  const fim15Dias = new Date(hoje);
  fim15Dias.setDate(hoje.getDate() + 14);

  // 4. Mês Fechado / Mês Corrente (do 1º ao último dia do mês corrente)
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

  // 5. Próximo Mês Fechado
  const inicioProxMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1);
  const fimProxMes = new Date(hoje.getFullYear(), hoje.getMonth() + 2, 0);

  return [
    {
      id: "bs_atual",
      label: "Bi-semana Atual",
      badge: "14 dias",
      startIso: formatDateToIso(inicioBiSemana),
      endIso: formatDateToIso(fimBiSemana),
    },
    {
      id: "bs_prox",
      label: "Próxima Bi-semana",
      badge: "14 dias",
      startIso: formatDateToIso(inicioProxBiSemana),
      endIso: formatDateToIso(fimProxBiSemana),
    },
    {
      id: "quinzena",
      label: "15 Dias",
      badge: "Hoje + 14d",
      startIso: formatDateToIso(hoje),
      endIso: formatDateToIso(fim15Dias),
    },
    {
      id: "mes_fechado",
      label: "Mês Fechado",
      badge: "30 dias",
      startIso: formatDateToIso(inicioMes),
      endIso: formatDateToIso(fimMes),
    },
    {
      id: "prox_mes",
      label: "Próximo Mês",
      badge: "30 dias",
      startIso: formatDateToIso(inicioProxMes),
      endIso: formatDateToIso(fimProxMes),
    },
  ];
}

export function QuickPeriodShortcuts({
  onSelectRange,
  className,
  size = "xs",
}: QuickPeriodShortcutsProps) {
  const presets = React.useMemo(() => getOohPeriodPresets(), []);

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1 mr-1">
        <Sparkles className="size-3 text-amber-500" />
        Atalhos OOH:
      </span>
      {presets.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => onSelectRange(p.startIso, p.endIso, p.label)}
          className={cn(
            "inline-flex items-center gap-1 rounded-md border border-border/80 bg-background/80 hover:bg-primary/10 hover:border-primary/50 text-foreground transition-all duration-150 font-medium cursor-pointer shadow-2xs hover:shadow-xs",
            size === "xs" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
          )}
          title={`Preencher de ${p.startIso} até ${p.endIso}`}
        >
          <CalendarDays className="size-2.5 text-primary opacity-80" />
          <span>{p.label}</span>
          <span className="text-[9px] text-muted-foreground/80 font-normal bg-muted/60 px-1 py-0.2 rounded">
            {p.badge}
          </span>
        </button>
      ))}
    </div>
  );
}
