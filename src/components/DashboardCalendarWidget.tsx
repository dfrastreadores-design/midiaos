import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { CalendarDays, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

type Ev = { id: string; titulo: string; inicio: string; fim: string | null; origem: string | null };

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
  const [month, setMonth] = useState<Date>(new Date());

  const ini = new Date(month.getFullYear(), month.getMonth(), 1);
  const fim = new Date(month.getFullYear(), month.getMonth() + 1, 1);

  const { data: eventos = [] } = useQuery({
    queryKey: ["dash-cal", user?.id, month.getFullYear(), month.getMonth()],
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

  const diasComEvento = useMemo(() => eventos.map((e) => new Date(e.inicio)), [eventos]);

  const doDia = useMemo(
    () => eventos.filter((e) => sameDay(new Date(e.inicio), selected)),
    [eventos, selected],
  );

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
          <Calendar
            mode="single"
            selected={selected}
            onSelect={(d) => d && setSelected(d)}
            month={month}
            onMonthChange={setMonth}
            modifiers={{ hasEvent: diasComEvento }}
            modifiersClassNames={{
              hasEvent:
                "relative after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:size-1 after:rounded-full after:bg-primary",
            }}
            className={cn("p-2 pointer-events-auto rounded-md border")}
          />
          <div className="min-h-[220px] rounded-md border p-2">
            <div className="mb-2 text-xs font-semibold text-muted-foreground">
              {selected.toLocaleDateString("pt-BR", {
                weekday: "long",
                day: "2-digit",
                month: "long",
              })}
            </div>
            {doDia.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground">
                Sem eventos neste dia
              </div>
            ) : (
              <ul className="space-y-1.5">
                {doDia.slice(0, 6).map((e) => (
                  <li key={e.id} className="rounded-md border bg-muted/30 p-2 text-xs">
                    <div className="font-medium truncate">{e.titulo}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {new Date(e.inicio).toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {e.origem ? ` · ${e.origem}` : ""}
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
