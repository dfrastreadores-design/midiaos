import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

type Ev = { id: string; titulo: string; inicio: string; fim: string | null; origem: string | null };

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function DashboardCalendarWidget() {
  const { user } = useAuth();
  const [selected, setSelected] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const ini = new Date(year, month, 1);
  const fim = new Date(year, month + 1, 1);

  const { data: eventos = [] } = useQuery({
    queryKey: ["dash-cal", user?.id, year, month],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("eventos_calendario")
        .select("id,titulo,inicio,fim,origem")
        .eq("user_id", user!.id)
        .gte("inicio", ini.toISOString())
        .lt("inicio", fim.toISOString())
        .order("inicio");
      if (error) throw error;
      return (data ?? []) as Ev[];
    },
  });

  const diasComEvento = useMemo(() => {
    const set = new Set<string>();
    for (const e of eventos) {
      const d = new Date(e.inicio);
      set.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
    }
    return set;
  }, [eventos]);

  const doDia = useMemo(
    () => eventos.filter((e) => sameDay(new Date(e.inicio), selected)),
    [eventos, selected],
  );

  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days: { date: Date; isCurrentMonth: boolean }[] = [];

    // Leading days from previous month
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, daysInPrevMonth - i),
        isCurrentMonth: false,
      });
    }

    // Days in current month
    for (let d = 1; d <= daysInMonth; d++) {
      days.push({
        date: new Date(year, month, d),
        isCurrentMonth: true,
      });
    }

    // Trailing days to complete 35 or 42 grid
    const totalSlots = days.length <= 35 ? 35 : 42;
    const remaining = totalSlots - days.length;
    for (let d = 1; d <= remaining; d++) {
      days.push({
        date: new Date(year, month + 1, d),
        isCurrentMonth: false,
      });
    }

    return days;
  }, [year, month]);

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));
  const goToday = () => {
    const now = new Date();
    setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelected(now);
  };

  const today = new Date();

  return (
    <Card className="lg:col-span-3">
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-md bg-primary/10 text-primary flex items-center justify-center">
              <CalendarDays className="size-4" />
            </div>
            <div>
              <div className="text-sm font-semibold">Calendário</div>
              <div className="text-[11px] text-muted-foreground">Eventos do mês</div>
            </div>
          </div>
          <Button asChild size="sm" variant="ghost" className="h-7 gap-1 text-xs">
            <Link to="/calendario">
              Abrir <ArrowRight className="size-3" />
            </Link>
          </Button>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {/* Calendário Nativo Autocontido */}
          <div className="rounded-lg border bg-card p-3 select-none flex flex-col justify-between">
            {/* Header com mês e controles */}
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/40">
              <span className="text-sm font-bold capitalize text-foreground">
                {MESES[month]} <span className="font-normal text-muted-foreground">{year}</span>
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={prevMonth}
                  title="Mês anterior"
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                  onClick={goToday}
                  title="Ir para o mês atual"
                >
                  Hoje
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={nextMonth}
                  title="Próximo mês"
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>

            {/* Cabeçalho dos dias da semana */}
            <div className="grid grid-cols-7 gap-1 text-center mb-1">
              {DIAS_SEMANA.map((d, i) => (
                <div
                  key={d}
                  className={cn(
                    "text-[10px] font-semibold uppercase tracking-wider py-1",
                    i === 0 || i === 6 ? "text-muted-foreground/70" : "text-muted-foreground",
                  )}
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Grade de dias */}
            <div className="grid grid-cols-7 gap-1 text-center">
              {calendarDays.map(({ date, isCurrentMonth }, idx) => {
                const isSel = sameDay(date, selected);
                const isTod = sameDay(date, today);
                const hasEv = diasComEvento.has(
                  `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`,
                );

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSelected(date);
                      if (!isCurrentMonth) {
                        setCurrentMonth(new Date(date.getFullYear(), date.getMonth(), 1));
                      }
                    }}
                    className={cn(
                      "relative h-8 rounded-md flex flex-col items-center justify-center text-xs transition-colors",
                      !isCurrentMonth && "text-muted-foreground/40",
                      isCurrentMonth && "text-foreground hover:bg-accent",
                      isTod && !isSel && "font-bold text-primary border border-primary/30",
                      isSel &&
                        "bg-primary text-primary-foreground font-semibold shadow-xs hover:bg-primary/90",
                    )}
                  >
                    <span>{date.getDate()}</span>
                    {hasEv && (
                      <span
                        className={cn(
                          "absolute bottom-1 size-1 rounded-full",
                          isSel ? "bg-primary-foreground" : "bg-primary",
                        )}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Lista de eventos do dia selecionado */}
          <div className="min-h-[220px] rounded-lg border bg-card p-3 flex flex-col">
            <div className="mb-2 pb-2 border-b border-border/40 text-xs font-semibold text-muted-foreground capitalize flex items-center justify-between">
              <span>
                {selected.toLocaleDateString("pt-BR", {
                  weekday: "long",
                  day: "2-digit",
                  month: "long",
                })}
              </span>
              <span className="text-[10px] font-normal text-muted-foreground">
                {doDia.length} evento{doDia.length !== 1 ? "s" : ""}
              </span>
            </div>
            {doDia.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-6 text-center text-xs text-muted-foreground">
                <CalendarDays className="size-6 text-muted-foreground/40 mb-1" />
                Sem compromissos neste dia
              </div>
            ) : (
              <ul className="space-y-1.5 overflow-y-auto max-h-[190px] pr-1">
                {doDia.slice(0, 8).map((e) => (
                  <li
                    key={e.id}
                    className="rounded-md border bg-muted/30 p-2 text-xs hover:bg-muted/50 transition-colors"
                  >
                    <div className="font-medium truncate text-foreground">{e.titulo}</div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground flex items-center gap-1.5">
                      <span>
                        {new Date(e.inicio).toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {e.origem && (
                        <span className="rounded bg-muted px-1.5 py-0.2 text-[9px] font-medium">
                          {e.origem}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
