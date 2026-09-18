import { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CalcItemOut } from "@/components/PriceCalculator";

const MESES = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

const fmtBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

const parseBRL = (s: string): number | null => {
  const t = (s || "").replace(/\./g, "").replace(",", ".").trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

type Props = {
  items: CalcItemOut[];
  defaultMes: number;
  defaultAno: number;
  values: Record<string, string>;
  onChange: (v: Record<string, string>) => void;
};

export function InvestimentoMensalSection({ items, defaultMes, defaultAno, values, onChange }: Props) {
  const months = useMemo(() => {
    const map = new Map<string, { key: string; mes: number; ano: number; auto: number }>();
    for (const it of items || []) {
      const m = (it as any).mes || defaultMes;
      const a = (it as any).ano || defaultAno;
      if (!m || !a) continue;
      const key = `${a}-${String(m).padStart(2, "0")}`;
      const auto = Number((it as any).valor_negociado || 0);
      const prev = map.get(key);
      if (prev) prev.auto += auto;
      else map.set(key, { key, mes: m, ano: a, auto });
    }
    return Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key));
  }, [items, defaultMes, defaultAno]);

  if (months.length < 2) return null;

  return (
    <div className="mt-4 rounded-lg border bg-muted/30 p-3 space-y-2">
      <div>
        <Label className="text-sm font-semibold">Investimento mensal do cliente (rodapé do mapa)</Label>
        <p className="text-xs text-muted-foreground">
          Contrato cobre {months.length} meses. Preencha para sobrescrever manualmente ou deixe em branco para usar a soma automática da entrega de cada mês.
        </p>
      </div>
      <div className="grid sm:grid-cols-2 gap-2">
        {months.map((m) => (
          <div key={m.key} className="flex items-center gap-2">
            <Label className="w-32 shrink-0 text-xs">
              {MESES[m.mes - 1]}/{m.ano}
            </Label>
            <Input
              inputMode="decimal"
              placeholder={`auto: ${fmtBRL(m.auto)}`}
              value={values[m.key] ?? ""}
              onChange={(e) => {
                const next = { ...values };
                const v = e.target.value;
                if (v.trim() === "") delete next[m.key];
                else next[m.key] = v;
                onChange(next);
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export function serializeInvestimentosMensais(values: Record<string, string>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(values || {})) {
    const n = parseBRL(v);
    if (n != null && n > 0) out[k] = n;
  }
  return out;
}
