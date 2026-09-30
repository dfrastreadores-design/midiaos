import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Loader2 } from "lucide-react";
import { getPisDrillDown, type DrillFilter } from "@/lib/dashboard.functions";

const formatBRL = (n: number) =>
  (n || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });

export type DrillDownState = {
  open: boolean;
  title: string;
  subtitle?: string;
  filter: DrillFilter;
};

export function DrillDownDialog({
  state,
  onOpenChange,
}: {
  state: DrillDownState;
  onOpenChange: (open: boolean) => void;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["pis-drilldown", state.filter],
    queryFn: () => getPisDrillDown({ data: state.filter }),
    enabled: state.open,
  });

  const rows = data ?? [];
  const totalBruto = rows.reduce((a, b) => a + b.valor_bruto, 0);
  const totalLiq = rows.reduce((a, b) => a + b.valor_liquido, 0);

  return (
    <Dialog open={state.open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {state.title}
            <Badge variant="secondary" className="font-normal">
              {rows.length} PI{rows.length !== 1 ? "s" : ""}
            </Badge>
          </DialogTitle>
          {state.subtitle && <DialogDescription>{state.subtitle}</DialogDescription>}
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 py-2 shrink-0">
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
              Bruto
            </div>
            <div className="text-lg font-display font-bold tabular-nums">
              {formatBRL(totalBruto)}
            </div>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
              Líquido
            </div>
            <div className="text-lg font-display font-bold tabular-nums">{formatBRL(totalLiq)}</div>
          </div>
        </div>

        <div className="flex-1 overflow-auto -mx-6 px-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground">
              <Loader2 className="size-5 animate-spin mr-2" /> Carregando…
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-10 text-sm text-muted-foreground">
              Nenhum PI encontrado com esses critérios.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-[11px] uppercase text-muted-foreground sticky top-0 bg-background z-10">
                <tr className="border-b">
                  <th className="text-left py-2 font-semibold">PI</th>
                  <th className="text-left py-2 font-semibold">Cliente</th>
                  <th className="text-left py-2 font-semibold hidden md:table-cell">Executivo</th>
                  <th className="text-left py-2 font-semibold">Status</th>
                  <th className="text-right py-2 font-semibold">Bruto</th>
                  <th className="text-right py-2 font-semibold hidden sm:table-cell">Líquido</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id} className="border-b last:border-0 hover:bg-muted/40">
                    <td className="py-2 font-mono text-xs">{p.numero_pi || p.id.slice(0, 6)}</td>
                    <td className="py-2 truncate max-w-[180px]">{p.cliente}</td>
                    <td className="py-2 hidden md:table-cell text-muted-foreground text-xs">
                      {p.executivo}
                    </td>
                    <td className="py-2">
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {p.status}
                      </Badge>
                    </td>
                    <td className="py-2 text-right tabular-nums font-medium">
                      {formatBRL(p.valor_bruto)}
                    </td>
                    <td className="py-2 text-right tabular-nums text-muted-foreground hidden sm:table-cell">
                      {formatBRL(p.valor_liquido)}
                    </td>
                    <td className="py-2 text-right">
                      <Button asChild size="sm" variant="ghost" className="h-7 px-2">
                        <Link to="/pi" onClick={() => onOpenChange(false)}>
                          <ExternalLink className="size-3.5" />
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
