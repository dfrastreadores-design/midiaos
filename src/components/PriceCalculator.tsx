import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Calculator,
  Plus,
  Trash2,
  CalendarRange,
  PlusCircle,
  Minus,
  ChevronLeft,
  ChevronRight,
  Copy,
  Handshake,
  Building2,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";

import {
  productTypes as staticProductTypes,
  programsByType as staticProgramsByType,
  formatsByTypeAndProgram as staticFormatsByTypeAndProgram,
  findPrice,
} from "@/lib/price-table";
import { listProdutos } from "@/lib/produtos.functions";
import { formatBRL } from "@/lib/mock-data";
import { NovoProdutoButton } from "@/components/QuickCadastroButtons";

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
const EMPTY_DB_PRODUTOS: any[] = [];

export type CalcItemOut = {
  tipo: string;
  programa: string | null;
  horario: string | null;
  formato: string | null;
  insercoes_dia: number;
  dias_semana: string[];
  dias_mes: number[];
  mes?: number | null;
  ano?: number | null;
  desconto: number;
  valor_unit: number;
  valor_tabela: number;
  valor_negociado: number;
  total_insercoes: number;
  dias_veiculacao?: number | null;
  link_modelo?: string | null;
  produto_id?: string | null;
  parceiro_id?: string | null;
  parceiro_nome?: string | null;
  parceiro_cnpj?: string | null;
  comissao_inquilino_pct?: number | null;
};

export type CalcTotals = {
  tabela: number;
  desconto: number;
  negociado: number;
  insercoes: number;
};

type Props = {
  title?: string;
  description?: string;
  mes?: number;
  ano?: number;
  initialItems?: CalcItemOut[];
  onChange?: (items: CalcItemOut[], totals: CalcTotals) => void;
  isLoading?: boolean;
};

type Item = {
  id: string;
  tipo: string;
  programa: string;
  horario: string;
  formato: string;
  mes: number | null;
  ano: number | null;
  /** Inserções padrão por dia (aplicado quando um novo dia é marcado). */
  insercoesDia: number;
  /** Override por dia: { "2024-06-11": 3 } = dia 11/06/2024 com 3 inserções. */
  insercoesPorDia: Record<string, number>;
  /** Permite digitar a quantidade total de inserções sem marcar dias. */
  insercoesManual: number | null;
  desconto: number;
  diasSemana: string[];
  negociadoOverride?: number | null;
  /** Permite digitar/cadastrar um valor unitário fora da tabela. */
  valorUnitOverride?: number | null;
  diasVeiculacao?: number | null;
  linkModelo?: string | null;
  produtoId?: string | null;
  parceiroId?: string | null;
  parceiroNome?: string | null;
  parceiroCnpj?: string | null;
  comissaoInquilinoPct?: number | null;
};

const round2 = (v: number) => Math.round(v * 100) / 100;

const newItem = (mes: number | null, ano: number | null): Item => ({
  id: crypto.randomUUID(),
  tipo: "VT",
  programa: "",
  horario: "",
  formato: "",
  mes,
  ano,
  insercoesDia: 1,
  insercoesPorDia: {},
  insercoesManual: null,
  desconto: 0,
  diasSemana: [],
  negociadoOverride: null,
  valorUnitOverride: null,
  diasVeiculacao: null,
  linkModelo: null,
  produtoId: null,
  parceiroId: null,
  parceiroNome: null,
  parceiroCnpj: null,
  comissaoInquilinoPct: null,
});

function totalInsercoesItem(it: Item): number {
  if (it.insercoesManual != null && Number.isFinite(it.insercoesManual) && it.insercoesManual > 0) {
    return Math.max(0, Math.round(it.insercoesManual));
  }
  return Object.values(it.insercoesPorDia).reduce((a, b) => a + (b || 0), 0);
}

function calcItemsSignature(items?: CalcItemOut[]) {
  return JSON.stringify(
    (items ?? []).map((it) => ({
      tipo: it.tipo ?? "",
      programa: it.programa ?? "",
      horario: it.horario ?? "",
      formato: it.formato ?? "",
      insercoes_dia: it.insercoes_dia ?? 0,
      dias_semana: it.dias_semana ?? [],
      dias_mes: it.dias_mes ?? [],
      mes: it.mes ?? null,
      ano: it.ano ?? null,
      desconto: it.desconto ?? 0,
      valor_unit: it.valor_unit ?? 0,
      valor_tabela: it.valor_tabela ?? 0,
      valor_negociado: it.valor_negociado ?? 0,
      total_insercoes: it.total_insercoes ?? 0,
      dias_veiculacao: it.dias_veiculacao ?? null,
      link_modelo: it.link_modelo ?? null,
      produto_id: it.produto_id ?? null,
      parceiro_id: it.parceiro_id ?? null,
      parceiro_nome: it.parceiro_nome ?? null,
      parceiro_cnpj: it.parceiro_cnpj ?? null,
      comissao_inquilino_pct: it.comissao_inquilino_pct ?? null,
    })),
  );
}

import {
  calculateUnitPrice,
  getItemTotals,
  findDatabaseProduct,
} from "@/lib/services/pricing-service";

function findDbUnit(it: Pick<Item, "tipo" | "programa" | "formato">, dbProdutos: any[]): number {
  return calculateUnitPrice(it, dbProdutos);
}

function itemTotals(it: Item, dbProdutos: any[] = []) {
  const tableRow =
    it.programa && it.formato ? findPrice(it.tipo as any, it.programa, it.formato) : undefined;

  const unitPrice = calculateUnitPrice(
    { tipo: it.tipo, programa: it.programa, formato: it.formato },
    dbProdutos,
    it.valorUnitOverride,
  );

  const totalInsercoes = totalInsercoesItem(it);
  const totals = getItemTotals(totalInsercoes, unitPrice, it.desconto, it.negociadoOverride);

  return {
    row: tableRow,
    valorUnit: unitPrice,
    totalInsercoes,
    valorTabela: totals.valorTabela,
    descontoVal: totals.descontoVal,
    valorNegociado: totals.valorNegociado,
    descontoPct: totals.descontoPct,
  };
}

export function PriceCalculator({
  title = "Calculadora de Proposta / PI",
  description = "Adicione um ou mais produtos. O total é somado automaticamente.",
  mes,
  ano,
  initialItems,
  onChange,
  isLoading,
}: Props) {
  const { data: dbProdutos } = useQuery({ queryKey: ["produtos"], queryFn: () => listProdutos() });
  const allDbProdutos = (dbProdutos as any[] | undefined) ?? EMPTY_DB_PRODUTOS;

  const hoje = new Date();
  const mesRef = mes ?? hoje.getMonth() + 1;
  const anoRef = ano ?? hoje.getFullYear();

  const mapInitial = (): Item[] => {
    const itemsToMap = initialItems && initialItems.length > 0 ? initialItems : [{} as CalcItemOut];
    return itemsToMap.map((it) => {
      const base = it.insercoes_dia || 1;
      const counts: Record<string, number> = {};
      const itemMes = it.mes ?? mesRef;
      const itemAno = it.ano ?? anoRef;

      if (it.dias_mes && itemMes != null && itemAno != null) {
        for (const d of it.dias_mes) {
          const key = `${itemAno}-${String(itemMes).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
          counts[key] = (counts[key] || 0) + base;
        }
      }
      const diasCount = Object.values(counts).reduce((a, b) => a + b, 0);
      const progNormalizado = it.programa || "";
      const formatoNormalizado = it.formato || "";
      const tabelaRow =
        progNormalizado && formatoNormalizado
          ? findPrice(it.tipo as never, progNormalizado, formatoNormalizado)
          : undefined;
      const dbUnit = findDbUnit(
        { tipo: it.tipo || "VT", programa: progNormalizado, formato: formatoNormalizado },
        allDbProdutos,
      );
      const unitTabela = dbUnit > 0 ? dbUnit : (tabelaRow?.valorUnit ?? 0);
      const unitSalvo = round2(it.valor_unit || 0);
      const valorUnitOverride =
        unitSalvo > 0 && Math.abs(unitSalvo - unitTabela) > 0.01 ? unitSalvo : null;
      const unitEfetivo = valorUnitOverride ?? unitTabela;
      const tabela = round2(unitEfetivo * diasCount);
      const calcPorPct = round2(tabela * (1 - (it.desconto || 0) / 100));
      const negociadoSalvo = round2(it.valor_negociado || 0);
      const override = Math.abs(calcPorPct - negociadoSalvo) > 0.01 ? negociadoSalvo : null;
      const totalInsercoes = it.total_insercoes || 0;
      const insercoesManual = diasCount === 0 && totalInsercoes > 0 ? totalInsercoes : null;
      const matchedInit = findDatabaseProduct(
        { tipo: it.tipo || "VT", programa: progNormalizado, formato: formatoNormalizado },
        allDbProdutos,
      );
      return {
        id: crypto.randomUUID(),
        tipo: it.tipo || "VT",
        programa: it.programa || "",
        horario:
          itemMes == null || itemAno == null
            ? it.horario || ""
            : it.horario ||
              (it.programa && it.formato
                ? findPrice(it.tipo as any, it.programa, it.formato)?.horario
                : "") ||
              "",
        formato: it.formato || "",
        mes: itemMes,
        ano: itemAno,
        insercoesDia: base,
        insercoesPorDia: counts,
        insercoesManual,
        desconto: it.desconto || 0,
        diasSemana: it.dias_semana || [],
        negociadoOverride: override,
        valorUnitOverride,
        diasVeiculacao: it.dias_veiculacao ?? null,
        linkModelo: (it as any).link_modelo ?? null,
        produtoId: (it as any).produto_id || matchedInit?.id || null,
        parceiroId: (it as any).parceiro_id || matchedInit?.parceiro_id || null,
        parceiroNome: (it as any).parceiro_nome || matchedInit?.parceiro_nome || null,
        parceiroCnpj: (it as any).parceiro_cnpj || matchedInit?.parceiro_cnpj || null,
        comissaoInquilinoPct: (it as any).comissao_inquilino_pct ?? matchedInit?.comissao_inquilino_pct ?? null,
      };
    });
  };

  const [items, setItems] = useState<Item[]>([]);
  const lastInitialSyncSignatureRef = useRef<string | null>(null);
  const lastEmittedSignatureRef = useRef<string | null>(null);
  const lastEmittedPayloadSignatureRef = useRef<string | null>(null);
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const pendingScrollIdRef = useRef<string | null>(null);

  const addItem = () => {
    const it = newItem(mesRef, anoRef);
    pendingScrollIdRef.current = it.id;
    setItems((p) => [...p, it]);
  };

  useEffect(() => {
    const id = pendingScrollIdRef.current;
    if (!id) return;
    const el = itemRefs.current[id];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      pendingScrollIdRef.current = null;
    }
  }, [items]);

  const update = (id: string, patch: Partial<Item>) =>
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        const next = { ...it, ...patch };

        // Se tipo / programa / formato mudaram, tenta preencher dados completos
        // primeiramente do cadastro de Produtos (DB) e, em fallback, da tabela estática.
        if (
          patch.programa !== undefined ||
          patch.formato !== undefined ||
          patch.tipo !== undefined
        ) {
          const normalize = (s: string) => (s || "").trim().toLowerCase();
          const dbMatch = allDbProdutos.find((p: any) => {
            if (p?.ativo === false) return false;
            const pTipo = normalize(p.tipo);
            const pProg = normalize(p.programa);
            const pNome = normalize(p.nome);
            const pForm = normalize(p.formato);

            const matchTipo = !next.tipo || pTipo === normalize(next.tipo);
            const matchProg = pProg === normalize(next.programa) || (pNome && pNome === normalize(next.programa));
            const matchForm = !pForm || !next.formato || pForm === normalize(next.formato);

            return matchTipo && matchProg && matchForm;
          });
          if (dbMatch) {
            next.produtoId = dbMatch.id || null;
            next.parceiroId = dbMatch.parceiro_id || null;
            next.parceiroNome = dbMatch.parceiro_nome || null;
            next.parceiroCnpj = dbMatch.parceiro_cnpj || null;
            next.comissaoInquilinoPct = dbMatch.comissao_inquilino_pct ?? null;
            if (
              it.mes != null &&
              it.ano != null &&
              dbMatch.faixa &&
              (!next.horario || patch.programa || patch.tipo)
            ) {
              next.horario = dbMatch.faixa;
            }
            // Valor de tabela vem automaticamente do cadastro via itemTotals().
            // Limpamos override só quando o produto muda, para refletir o preço cadastrado.
            if (
              patch.programa !== undefined ||
              patch.formato !== undefined ||
              patch.tipo !== undefined
            ) {
              next.valorUnitOverride = null;
              next.negociadoOverride = null;
            }
            if (Number(dbMatch.insercoes_padrao) > 0 && (patch.programa || patch.formato)) {
              next.insercoesDia = Number(dbMatch.insercoes_padrao);
            }
            next.linkModelo = dbMatch.link_modelo ?? null;
          } else {
            next.produtoId = null;
            next.parceiroId = null;
            next.parceiroNome = null;
            next.parceiroCnpj = null;
            next.comissaoInquilinoPct = null;
            const row =
              next.programa && next.formato
                ? findPrice(next.tipo as any, next.programa, next.formato)
                : undefined;
            if (
              it.mes != null &&
              it.ano != null &&
              row?.horario &&
              (!next.horario || patch.programa || patch.tipo)
            ) {
              next.horario = row.horario;
            }
          }
        }

        return next;
      }),
    );

  const remove = (id: string) =>
    setItems((prev) => (prev.length > 1 ? prev.filter((it) => it.id !== id) : prev));

  const duplicateToMonths = (id: string, targets: Array<{ mes: number; ano: number }>) => {
    if (!targets.length) return;
    setItems((prev) => {
      const src = prev.find((it) => it.id === id);
      if (!src) return prev;
      const clones: Item[] = targets.map(({ mes, ano }) => {
        const nextPorDia: Record<string, number> = {};
        Object.entries(src.insercoesPorDia).forEach(([k, v]) => {
          const day = k.slice(8, 10);
          nextPorDia[`${ano}-${String(mes).padStart(2, "0")}-${day}`] = v;
        });
        return {
          ...src,
          id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
          mes,
          ano,
          insercoesPorDia: nextPorDia,
          insercoesManual: null,
          negociadoOverride: null,
        };
      });
      const idx = prev.findIndex((it) => it.id === id);
      const out = [...prev];
      out.splice(idx + 1, 0, ...clones);
      return out;
    });
  };

  const duplicateAllToMonths = (
    targets: Array<{ mes: number; ano: number }>,
    businessOnly: boolean,
  ) => {
    if (!targets.length) return;
    setItems((prev) => {
      if (prev.length === 0) return prev;
      const clones: Item[] = [];
      for (const src of prev) {
        for (const { mes, ano } of targets) {
          const diasNoMes = new Date(ano, mes, 0).getDate();
          const nextPorDia: Record<string, number> = {};
          const base = Math.max(1, src.insercoesDia || 1);
          if (Object.keys(src.insercoesPorDia).length === 0) {
            // Nada selecionado: preenche o mês inteiro (ou só úteis)
            for (let d = 1; d <= diasNoMes; d++) {
              const dow = new Date(ano, mes - 1, d).getDay();
              if (businessOnly && (dow === 0 || dow === 6)) continue;
              nextPorDia[`${ano}-${String(mes).padStart(2, "0")}-${String(d).padStart(2, "0")}`] =
                base;
            }
          } else {
            Object.entries(src.insercoesPorDia).forEach(([k, v]) => {
              const day = Number(k.slice(8, 10));
              if (day < 1 || day > diasNoMes) return;
              const dow = new Date(ano, mes - 1, day).getDay();
              if (businessOnly && (dow === 0 || dow === 6)) return;
              nextPorDia[`${ano}-${String(mes).padStart(2, "0")}-${String(day).padStart(2, "0")}`] =
                v;
            });
          }
          clones.push({
            ...src,
            id:
              globalThis.crypto?.randomUUID?.() ??
              `${Date.now()}-${Math.random()}-${clones.length}`,
            mes,
            ano,
            insercoesPorDia: nextPorDia,
            insercoesManual: null,
            negociadoOverride: null,
          });
        }
      }
      return [...prev, ...clones];
    });
  };

  const removeMonths = (targets: Array<{ mes: number; ano: number }>) => {
    if (!targets.length) return;
    const keys = new Set(targets.map((t) => `${t.ano}-${t.mes}`));
    setItems((prev) => prev.filter((it) => !keys.has(`${it.ano}-${it.mes}`)));
  };

  const dedupKey = (it: Item) =>
    `${it.mes ?? ""}-${it.ano ?? ""}|${(it.tipo || "").trim().toLowerCase()}|${(it.programa || "").trim().toLowerCase()}|${(it.formato || "").trim().toLowerCase()}|${(it.horario || "").trim().toLowerCase()}`;

  const duplicatesCount = useMemo(() => {
    const seen = new Set<string>();
    let n = 0;
    for (const it of items) {
      const k = dedupKey(it);
      if (seen.has(k)) n++;
      else seen.add(k);
    }
    return n;
  }, [items]);

  const removeDuplicates = () => {
    setItems((prev) => {
      const seen = new Set<string>();
      const out: Item[] = [];
      for (const it of prev) {
        const k = dedupKey(it);
        if (seen.has(k)) continue;
        seen.add(k);
        out.push(it);
      }
      return out.length > 0 ? out : prev;
    });
  };

  const duplicateIds = useMemo(() => {
    const counts = new Map<string, number>();
    for (const it of items) {
      const k = dedupKey(it);
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    const ids = new Set<string>();
    for (const it of items) {
      if ((counts.get(dedupKey(it)) ?? 0) > 1) ids.add(it.id);
    }
    return ids;
  }, [items]);

  const totals = useMemo(() => {
    const acc = items.reduce(
      (a, it) => {
        const t = itemTotals(it, allDbProdutos);
        a.tabela += t.valorTabela;
        a.desconto += t.descontoVal;
        a.negociado += t.valorNegociado;
        a.insercoes += t.totalInsercoes;
        return a;
      },
      { tabela: 0, desconto: 0, negociado: 0, insercoes: 0 },
    );
    return {
      ...acc,
      tabela: round2(acc.tabela),
      desconto: round2(acc.desconto),
      negociado: round2(acc.negociado),
    };
  }, [items, allDbProdutos]);

  const out = useMemo<CalcItemOut[]>(
    () =>
      items.flatMap((it) => {
        const t = itemTotals(it, allDbProdutos);
        // Agrupa as datas selecionadas por (ano, mes) — assim cada mês vira um
        // CalcItemOut próprio e o PDF/Excel renderiza o mapa de TODOS os meses.
        const porMes = new Map<string, Array<[number, number]>>(); // "YYYY-MM" -> [[dia, qtd], ...]
        Object.entries(it.insercoesPorDia).forEach(([dateKey, n]) => {
          const [y, m, d] = dateKey.split("-").map(Number);
          if (!y || !m || !d || !n) return;
          const k = `${y}-${String(m).padStart(2, "0")}`;
          if (!porMes.has(k)) porMes.set(k, []);
          porMes.get(k)!.push([d, n]);
        });

        // Caso nenhum dia tenha sido marcado, mantém um único item com mes/ano do cabeçalho.
        const grupos: Array<{ mes: number | null; ano: number | null; dias_mes: number[] }> =
          porMes.size === 0
            ? [{ mes: it.mes, ano: it.ano, dias_mes: [] }]
            : Array.from(porMes.entries())
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([k, arr]) => {
                  const [yy, mm] = k.split("-").map(Number);
                  const dias_mes: number[] = [];
                  arr
                    .sort((a, b) => a[0] - b[0])
                    .forEach(([d, n]) => {
                      for (let i = 0; i < (n || 0); i++) dias_mes.push(d);
                    });
                  return { mes: mm, ano: yy, dias_mes };
                });

        // Divide totais proporcionalmente pelas inserções de cada mês para que a
        // soma por item se mantenha. Se não houver inserções, distribui igualmente.
        const totalIns = grupos.reduce((s, g) => s + g.dias_mes.length, 0);
        return grupos.map((g, idx) => {
          const share = totalIns > 0 ? g.dias_mes.length / totalIns : 1 / grupos.length;
          const isLast = idx === grupos.length - 1;
          // Para evitar perda por arredondamento, último grupo absorve o resto.
          const valTabela = isLast
            ? round2(
                t.valorTabela -
                  grupos
                    .slice(0, -1)
                    .reduce(
                      (s, gg) =>
                        s +
                        round2(
                          t.valorTabela *
                            (totalIns > 0 ? gg.dias_mes.length / totalIns : 1 / grupos.length),
                        ),
                      0,
                    ),
              )
            : round2(t.valorTabela * share);
          const valNegociado = isLast
            ? round2(
                t.valorNegociado -
                  grupos
                    .slice(0, -1)
                    .reduce(
                      (s, gg) =>
                        s +
                        round2(
                          t.valorNegociado *
                            (totalIns > 0 ? gg.dias_mes.length / totalIns : 1 / grupos.length),
                        ),
                      0,
                    ),
              )
            : round2(t.valorNegociado * share);
          return {
            tipo: it.tipo,
            programa: it.programa || null,
            horario: it.horario || null,
            formato: it.formato || null,
            mes: g.mes,
            ano: g.ano,
            insercoes_dia: 1,
            dias_semana: it.diasSemana,
            dias_mes: g.dias_mes,
            desconto: t.descontoPct,
            valor_unit: t.valorUnit,
            valor_tabela: valTabela,
            valor_negociado: valNegociado,
            total_insercoes: g.dias_mes.length || (grupos.length === 1 ? t.totalInsercoes : 0),
            dias_veiculacao: it.diasVeiculacao ?? null,
            link_modelo: it.linkModelo ?? null,
            produto_id: it.produtoId || null,
            parceiro_id: it.parceiroId || null,
            parceiro_nome: it.parceiroNome || null,
            parceiro_cnpj: it.parceiroCnpj || null,
            comissao_inquilino_pct: it.comissaoInquilinoPct ?? null,
          };
        });
      }),
    [items, allDbProdutos],
  );

  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Sync only real external initial data changes. The calculator also emits its
  // value to the parent; syncing that same emitted value back caused a render loop.
  useEffect(() => {
    const incomingSignature = calcItemsSignature(initialItems);
    if (
      incomingSignature === lastInitialSyncSignatureRef.current ||
      incomingSignature === lastEmittedSignatureRef.current
    ) {
      return;
    }

    lastInitialSyncSignatureRef.current = incomingSignature;
    setItems(mapInitial());
  }, [initialItems, allDbProdutos.length]);

  useEffect(() => {
    if (items.length > 0) {
      const itemsSignature = calcItemsSignature(out);
      const payloadSignature = `${itemsSignature}|${JSON.stringify(totals)}`;
      if (payloadSignature === lastEmittedPayloadSignatureRef.current) return;

      lastEmittedSignatureRef.current = itemsSignature;
      lastEmittedPayloadSignatureRef.current = payloadSignature;
      onChangeRef.current?.(out, totals);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [out, totals]);

  return (
    <Card className="border-primary/20">
      <CardHeader className="flex flex-row items-center justify-between sticky top-0 z-20 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 border-b rounded-t-xl">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Calculator className="size-4 text-primary" />
            {title}
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        </div>
        <Button size="sm" onClick={addItem}>
          <Plus className="size-4 mr-1" /> Adicionar produto
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        {items.length >= 1 && (
          <BulkActions
            showAllExceptDuplicate={items.length > 1}
            onApplyPeriodo={(mes, ano) =>
              setItems((prev) => prev.map((it) => ({ ...it, mes, ano })))
            }
            onApplyDesconto={(desconto) =>
              setItems((prev) => prev.map((it) => ({ ...it, desconto, negociadoOverride: null })))
            }
            onApplyInsercoesDia={(n) =>
              setItems((prev) =>
                prev.map((it) => {
                  const nextPorDia: Record<string, number> = {};
                  Object.keys(it.insercoesPorDia).forEach((k) => {
                    nextPorDia[k] = n;
                  });
                  return { ...it, insercoesDia: n, insercoesPorDia: nextPorDia };
                }),
              )
            }
            onApplyDiasMes={(dias) =>
              setItems((prev) =>
                prev.map((it) => {
                  if (it.mes == null || it.ano == null) return it;
                  const base = Math.max(1, it.insercoesDia || 1);
                  const next: Record<string, number> = {};
                  dias.forEach((d) => {
                    const key = `${it.ano}-${String(it.mes).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                    next[key] = base;
                  });
                  return { ...it, insercoesPorDia: next, insercoesManual: null };
                }),
              )
            }
            onDuplicateAll={(targets, businessOnly) => duplicateAllToMonths(targets, businessOnly)}
            existingMonths={Array.from(
              new Map(
                items
                  .filter((it) => it.mes != null && it.ano != null)
                  .map((it) => [
                    `${it.ano}-${it.mes}`,
                    { mes: it.mes as number, ano: it.ano as number },
                  ]),
              ).values(),
            ).sort((a, b) => a.ano - b.ano || a.mes - b.mes)}
            onRemoveMonths={(targets) => removeMonths(targets)}
            duplicatesCount={duplicatesCount}
            onRemoveDuplicates={removeDuplicates}
          />
        )}

        {items.map((it, idx) => (
          <div
            key={it.id}
            ref={(el) => {
              itemRefs.current[it.id] = el;
            }}
          >
            <ItemRow
              index={idx}
              item={it}
              dbProdutos={allDbProdutos}
              onChange={(patch) => update(it.id, patch)}
              onRemove={() => remove(it.id)}
              onDuplicate={(targets) => duplicateToMonths(it.id, targets)}
              isDuplicate={duplicateIds.has(it.id)}
              canRemove={items.length > 1}
              isLoading={isLoading}
            />
          </div>
        ))}

        <div className="flex justify-center">
          <Button variant="outline" size="sm" onClick={addItem} className="border-dashed">
            <Plus className="size-4 mr-1" /> Adicionar mais um produto
          </Button>
        </div>

        <Separator />

        <div className="grid sm:grid-cols-4 gap-3">
          <SummaryItem label="Inserções totais" value={String(totals.insercoes)} />
          <SummaryItem label="Valor Tabela" value={formatBRL(totals.tabela)} />
          <SummaryItem
            label="Desconto"
            value={
              totals.tabela > 0
                ? `- ${formatBRL(totals.desconto)} (${((totals.desconto / totals.tabela) * 100).toFixed(0)}%)`
                : `- ${formatBRL(totals.desconto)}`
            }
            muted
          />
          <SummaryItem label="Total Negociado" value={formatBRL(totals.negociado)} highlight />
        </div>
      </CardContent>
    </Card>
  );
}

function BulkActions({
  onApplyPeriodo,
  onApplyDesconto,
  onApplyInsercoesDia,
  onApplyDiasMes,
  onDuplicateAll,
  existingMonths = [],
  onRemoveMonths,
  duplicatesCount = 0,
  onRemoveDuplicates,
  showAllExceptDuplicate = true,
}: {
  onApplyPeriodo: (mes: number, ano: number) => void;
  onApplyDesconto: (desconto: number) => void;
  onApplyInsercoesDia: (n: number) => void;
  onApplyDiasMes: (dias: number[]) => void;
  onDuplicateAll?: (targets: Array<{ mes: number; ano: number }>, businessOnly: boolean) => void;
  existingMonths?: Array<{ mes: number; ano: number }>;
  onRemoveMonths?: (targets: Array<{ mes: number; ano: number }>) => void;
  duplicatesCount?: number;
  onRemoveDuplicates?: () => void;
  showAllExceptDuplicate?: boolean;
}) {
  const hoje = new Date();
  const [open, setOpen] = useState(false);
  const [mes, setMes] = useState<number>(hoje.getMonth() + 1);
  const [ano, setAno] = useState<number>(hoje.getFullYear());
  const [desconto, setDesconto] = useState<number>(0);
  const [insercoes, setInsercoes] = useState<number>(1);
  const [diasTxt, setDiasTxt] = useState<string>("");
  const [dupSelected, setDupSelected] = useState<Record<string, boolean>>({});
  const [dupBusinessOnly, setDupBusinessOnly] = useState<boolean>(false);
  const [rmSelected, setRmSelected] = useState<Record<string, boolean>>({});

  const dupOptions = useMemo(() => {
    const arr: Array<{ mes: number; ano: number; key: string; label: string }> = [];
    let m = hoje.getMonth() + 1;
    let a = hoje.getFullYear();
    for (let i = 0; i < 12; i++) {
      m += 1;
      if (m > 12) {
        m = 1;
        a += 1;
      }
      arr.push({ mes: m, ano: a, key: `${a}-${m}`, label: `${MESES[m - 1]}/${a}` });
    }
    return arr;
  }, []);

  const parseDias = (s: string): number[] => {
    const out = new Set<number>();
    s.split(/[,;\s]+/).forEach((tok) => {
      const t = tok.trim();
      if (!t) return;
      const m = t.match(/^(\d{1,2})\s*-\s*(\d{1,2})$/);
      if (m) {
        const a = Math.max(1, Math.min(31, Number(m[1])));
        const b = Math.max(1, Math.min(31, Number(m[2])));
        const [lo, hi] = a <= b ? [a, b] : [b, a];
        for (let i = lo; i <= hi; i++) out.add(i);
      } else {
        const n = Number(t);
        if (Number.isInteger(n) && n >= 1 && n <= 31) out.add(n);
      }
    });
    return Array.from(out).sort((a, b) => a - b);
  };

  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold text-primary">
          <CalendarRange className="size-4" />
          Aplicar a TODOS os produtos
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setOpen((v) => !v)}
          className="h-7 text-xs"
        >
          {open ? "Ocultar" : "Mostrar"}
        </Button>
      </div>

      {open && (
        <div className="space-y-3">
          {showAllExceptDuplicate && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[11px]">Período (mês/ano)</Label>
                <div className="flex gap-1">
                  <Select value={String(mes)} onValueChange={(v) => setMes(Number(v))}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MESES.map((m, i) => (
                        <SelectItem key={i + 1} value={String(i + 1)}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={String(ano)} onValueChange={(v) => setAno(Number(v))}>
                    <SelectTrigger className="h-8 w-[80px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 4 }, (_, i) => hoje.getFullYear() - 1 + i).map((y) => (
                        <SelectItem key={y} value={String(y)}>
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-7 w-full text-xs"
                  onClick={() => onApplyPeriodo(mes, ano)}
                >
                  Aplicar período
                </Button>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px]">Desconto (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  className="h-8 text-xs"
                  value={desconto}
                  onChange={(e) => setDesconto(Number(e.target.value) || 0)}
                />
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-7 w-full text-xs"
                  onClick={() => onApplyDesconto(desconto)}
                >
                  Aplicar desconto
                </Button>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px]">Inserções por dia</Label>
                <Input
                  type="number"
                  min={1}
                  className="h-8 text-xs"
                  value={insercoes}
                  onChange={(e) => setInsercoes(Math.max(1, Number(e.target.value) || 1))}
                />
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-7 w-full text-xs"
                  onClick={() => onApplyInsercoesDia(insercoes)}
                >
                  Aplicar inserções
                </Button>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px]">Dias do mês (ex: 1-10, 15, 20)</Label>
                <Input
                  type="text"
                  className="h-8 text-xs"
                  placeholder="1-5, 10, 15"
                  value={diasTxt}
                  onChange={(e) => setDiasTxt(e.target.value)}
                />
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-7 w-full text-xs"
                  onClick={() => {
                    const dias = parseDias(diasTxt);
                    if (dias.length === 0) return;
                    onApplyDiasMes(dias);
                  }}
                >
                  Aplicar dias
                </Button>
              </div>
            </div>
          )}

          {onDuplicateAll && (
            <div className="rounded-md border bg-background/60 p-2.5 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-[11px] font-semibold">
                  Duplicar TODOS os produtos para outros meses
                </Label>
                <label className="flex items-center gap-1.5 text-[11px] cursor-pointer">
                  <Checkbox
                    checked={dupBusinessOnly}
                    onCheckedChange={(v) => setDupBusinessOnly(!!v)}
                  />
                  <span>Somente dias úteis</span>
                </label>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 max-h-40 overflow-auto">
                {dupOptions.map((o) => (
                  <label
                    key={o.key}
                    className="flex items-center gap-1.5 text-[11px] cursor-pointer"
                  >
                    <Checkbox
                      checked={!!dupSelected[o.key]}
                      onCheckedChange={(v) => setDupSelected((s) => ({ ...s, [o.key]: !!v }))}
                    />
                    <span>{o.label}</span>
                  </label>
                ))}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-[11px]"
                  onClick={() => {
                    const all = dupOptions.every((o) => dupSelected[o.key]);
                    const next: Record<string, boolean> = {};
                    if (!all) dupOptions.forEach((o) => (next[o.key] = true));
                    setDupSelected(next);
                  }}
                >
                  {dupOptions.every((o) => dupSelected[o.key]) ? "Limpar" : "Selecionar todos"}
                </Button>
                <Button
                  size="sm"
                  className="h-7 text-[11px] flex-1"
                  onClick={() => {
                    const targets = dupOptions
                      .filter((o) => dupSelected[o.key])
                      .map(({ mes: mm, ano: aa }) => ({ mes: mm, ano: aa }));
                    if (targets.length === 0) return;
                    onDuplicateAll(targets, dupBusinessOnly);
                    setDupSelected({});
                  }}
                >
                  <Copy className="size-3.5 mr-1" /> Duplicar em{" "}
                  {Object.values(dupSelected).filter(Boolean).length || 0} mês(es)
                </Button>
              </div>
            </div>
          )}

          {onRemoveMonths && existingMonths.length > 0 && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-2.5 space-y-2">
              <Label className="text-[11px] font-semibold text-destructive">
                Excluir meses do pedido
              </Label>
              <p className="text-[10px] text-muted-foreground">
                Remove todos os produtos cadastrados no(s) mês(es) selecionado(s).
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 max-h-40 overflow-auto">
                {existingMonths.map((o) => {
                  const key = `${o.ano}-${o.mes}`;
                  return (
                    <label
                      key={key}
                      className="flex items-center gap-1.5 text-[11px] cursor-pointer"
                    >
                      <Checkbox
                        checked={!!rmSelected[key]}
                        onCheckedChange={(v) => setRmSelected((s) => ({ ...s, [key]: !!v }))}
                      />
                      <span>
                        {MESES[o.mes - 1]}/{o.ano}
                      </span>
                    </label>
                  );
                })}
              </div>
              <Button
                size="sm"
                variant="destructive"
                className="h-7 w-full text-[11px]"
                disabled={Object.values(rmSelected).filter(Boolean).length === 0}
                onClick={() => {
                  const targets = existingMonths.filter((o) => rmSelected[`${o.ano}-${o.mes}`]);
                  if (targets.length === 0) return;
                  const label = targets.map((t) => `${MESES[t.mes - 1]}/${t.ano}`).join(", ");
                  if (!window.confirm(`Excluir todos os produtos de: ${label}?`)) return;
                  onRemoveMonths(targets);
                  setRmSelected({});
                }}
              >
                <Trash2 className="size-3.5 mr-1" /> Excluir{" "}
                {Object.values(rmSelected).filter(Boolean).length || 0} mês(es)
              </Button>
            </div>
          )}

          {onRemoveDuplicates && (
            <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-2.5 space-y-2">
              <Label className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                Produtos duplicados no mesmo mês
              </Label>
              <p className="text-[10px] text-muted-foreground">
                Remove produtos repetidos (mesmo tipo, programa, formato e horário) dentro de um
                mesmo mês, mantendo apenas o primeiro.
              </p>
              <Button
                size="sm"
                variant="destructive"
                className="h-7 w-full text-[11px]"
                disabled={duplicatesCount === 0}
                onClick={() => {
                  if (duplicatesCount === 0) return;
                  if (!window.confirm(`Excluir ${duplicatesCount} produto(s) duplicado(s)?`))
                    return;
                  onRemoveDuplicates();
                }}
              >
                <Trash2 className="size-3.5 mr-1" />
                {duplicatesCount === 0
                  ? "Nenhum duplicado encontrado"
                  : `Excluir ${duplicatesCount} duplicado(s)`}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const CUSTOM = "__custom__";

function FieldWithCustom({
  label,
  value,
  options,
  onChange,
  disabled,
  placeholder,
  showAddButton,
  initialData,
  isLoading,
  optionSubtitles,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  disabled?: boolean;
  placeholder?: string;
  showAddButton?: boolean;
  initialData?: any;
  isLoading?: boolean;
  optionSubtitles?: Record<string, string>;
}) {
  const knownIncludes = options.includes(value);
  const [custom, setCustom] = useState(!!value && !knownIncludes);
  const [draft, setDraft] = useState(!knownIncludes ? value : "");

  useEffect(() => {
    if (value && !options.includes(value)) {
      setCustom(true);
      setDraft(value);
    }
  }, [value, options]);

  return (
    <div className="space-y-1.5">
      <Label className="text-xs flex items-center justify-between">
        <span>{label}</span>
        {!custom && (
          <div className="flex items-center gap-1">
            {showAddButton && (
              <NovoProdutoButton
                variant="ghost"
                size="icon"
                className="size-5 text-primary hover:text-primary/80"
                initialData={initialData}
              />
            )}
            <button
              type="button"
              className="text-[10px] text-primary hover:underline inline-flex items-center gap-0.5"
              onClick={() => {
                setCustom(true);
                setDraft("");
                onChange("");
              }}
            >
              <PlusCircle className="size-3" /> novo
            </button>
          </div>
        )}
        {custom && (
          <button
            type="button"
            className="text-[10px] text-muted-foreground hover:underline"
            onClick={() => {
              setCustom(false);
              setDraft("");
              onChange("");
            }}
          >
            usar lista
          </button>
        )}
      </Label>
      {custom ? (
        <Input
          autoFocus
          placeholder={`Digite ${label.toLowerCase()}`}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            onChange(e.target.value);
          }}
        />
      ) : (
        <Select
          value={value || CUSTOM}
          onValueChange={(v) => {
            if (v === CUSTOM) {
              setCustom(true);
              setDraft("");
              onChange("");
            } else onChange(v);
          }}
          disabled={disabled || isLoading}
        >
          <SelectTrigger>
            <SelectValue placeholder={isLoading ? "Carregando..." : (placeholder ?? "Selecione")} />
          </SelectTrigger>
          <SelectContent>
            {options.map((o) => {
              const subtitle = optionSubtitles?.[o];
              return (
                <SelectItem key={o} value={o}>
                  <div className="flex flex-col text-left py-0.5">
                    <span className="font-medium text-xs">{o}</span>
                    {subtitle && (
                      <span className="text-[10px] text-muted-foreground leading-tight">
                        {subtitle}
                      </span>
                    )}
                  </div>
                </SelectItem>
              );
            })}
            <SelectItem value={CUSTOM}>+ Cadastrar novo…</SelectItem>
          </SelectContent>
        </Select>
      )}
    </div>
  );
}

function ItemRow({
  index,
  item,
  onChange,
  onRemove,
  onDuplicate,
  canRemove,
  dbProdutos = [],
  isLoading,
  isDuplicate = false,
}: {
  index: number;
  item: Item;
  onChange: (patch: Partial<Item>) => void;
  onRemove: () => void;
  onDuplicate?: (targets: Array<{ mes: number; ano: number }>) => void;
  canRemove: boolean;
  dbProdutos?: any[];
  isLoading?: boolean;
  isDuplicate?: boolean;
}) {
  const [displayMes, setDisplayMes] = useState(item.mes);
  const [displayAno, setDisplayAno] = useState(item.ano);
  useEffect(() => {
    if (item.mes != null) setDisplayMes(item.mes);
  }, [item.mes]);
  useEffect(() => {
    if (item.ano != null) setDisplayAno(item.ano);
  }, [item.ano]);
  const productTypes = useMemo(() => {
    const dbTypes = dbProdutos.map((p) => p.tipo).filter(Boolean);
    return Array.from(new Set([...staticProductTypes, ...dbTypes])).sort();
  }, [dbProdutos]);

  const programas = useMemo(() => {
    const staticProgs = staticProgramsByType(item.tipo as never);
    const normalize = (s: string) => (s || "").trim().toLowerCase();
    const itemTipoNorm = normalize(item.tipo);
    const dbProgs = dbProdutos
      .filter((p) => !item.tipo || normalize(p.tipo) === itemTipoNorm)
      .map((p) => p.programa || p.nome)
      .filter(Boolean);
    return Array.from(new Set([...staticProgs, ...dbProgs])).sort();
  }, [item.tipo, dbProdutos]);

  const programaSubtitles = useMemo(() => {
    const normalize = (s: string) => (s || "").trim().toLowerCase();
    const itemTipoNorm = normalize(item.tipo);
    const map: Record<string, string> = {};
    for (const p of dbProdutos) {
      const progName = p.programa || p.nome;
      if (!progName) continue;
      if (item.tipo && normalize(p.tipo) !== itemTipoNorm) continue;
      if (p.parceiro_nome) {
        map[progName] = `🤝 Parceiro: ${p.parceiro_nome}${p.parceiro_cnpj ? ` • CNPJ: ${p.parceiro_cnpj}` : ""}`;
      } else {
        map[progName] = "🏢 Inventário Próprio";
      }
    }
    return map;
  }, [item.tipo, dbProdutos]);

  const formatos = useMemo(() => {
    if (!item.programa) return [];
    const staticForms = staticFormatsByTypeAndProgram(item.tipo as never, item.programa);
    const normalize = (s: string) => (s || "").trim().toLowerCase();
    const itemTipoNorm = normalize(item.tipo);
    const itemProgNorm = normalize(item.programa);
    const dbForms = dbProdutos
      .filter((p) => (!item.tipo || normalize(p.tipo) === itemTipoNorm) && (normalize(p.programa) === itemProgNorm || normalize(p.nome) === itemProgNorm))
      .map((p) => p.formato)
      .filter(Boolean);
    return Array.from(new Set([...staticForms, ...dbForms])).sort();
  }, [item.tipo, item.programa, dbProdutos]);
  const t = itemTotals(item, dbProdutos);

  const matchedProduto = useMemo(
    () =>
      findDatabaseProduct(
        { tipo: item.tipo, programa: item.programa, formato: item.formato },
        dbProdutos as any,
      ),
    [item.tipo, item.programa, item.formato, dbProdutos],
  );
  const veicTipo: "livre" | "dias_uteis" | "seg_sab" | "dias_fixos" | "dias_semana" =
    ((matchedProduto as any)?.veiculacao_tipo as any) ?? "livre";
  const diasFixos: number[] = ((matchedProduto as any)?.dias_fixos as number[] | null) ?? [];
  const diasSemanaFixos: number[] =
    ((matchedProduto as any)?.dias_semana_fixos as number[] | null) ?? [];
  const DOW_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const isDayAllowed = (y: number, m: number, d: number) => {
    if (veicTipo === "dias_uteis") {
      const dow = new Date(y, m - 1, d).getDay();
      return dow !== 0 && dow !== 6;
    }
    if (veicTipo === "seg_sab") {
      const dow = new Date(y, m - 1, d).getDay();
      return dow !== 0;
    }
    if (veicTipo === "dias_fixos") {
      return diasFixos.includes(d);
    }
    if (veicTipo === "dias_semana") {
      const dow = new Date(y, m - 1, d).getDay();
      return diasSemanaFixos.includes(dow);
    }
    return true;
  };

  const toggleDia = (d: number, m: number, a: number) => {
    if (!isDayAllowed(a, m, d)) return;
    const key = `${a}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const has = item.insercoesPorDia[key] != null;
    const next = { ...item.insercoesPorDia };
    if (has) delete next[key];
    else next[key] = Math.max(1, item.insercoesDia || 1);
    onChange({ insercoesPorDia: next });
  };

  const setDiaCount = (dateKey: string, n: number) => {
    const next = { ...item.insercoesPorDia };
    if (n <= 0) delete next[dateKey];
    else next[dateKey] = n;
    onChange({ insercoesPorDia: next });
  };

  const selecionados = useMemo(
    () => Object.keys(item.insercoesPorDia).sort(),
    [item.insercoesPorDia],
  );

  return (
    <div
      className={`rounded-lg border p-4 space-y-3 ${isDuplicate ? "bg-amber-500/10 border-amber-500/60 ring-1 ring-amber-500/40" : "bg-muted/20"}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
            Produto #{index + 1}
          </div>
          {isDuplicate && (
            <Badge
              variant="outline"
              className="border-amber-500 text-amber-700 dark:text-amber-400 text-[10px] h-5"
            >
              Duplicado neste mês
            </Badge>
          )}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Período:
            </span>
            <Select
              value={item.mes != null ? String(item.mes) : ""}
              onValueChange={(v) =>
                onChange({ mes: Number(v), ano: item.ano ?? new Date().getFullYear() })
              }
            >
              <SelectTrigger className="h-6 w-[110px] text-[11px]">
                <SelectValue placeholder="Mês" />
              </SelectTrigger>
              <SelectContent>
                {MESES.map((m, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={item.ano != null ? String(item.ano) : ""}
              onValueChange={(v) =>
                onChange({ ano: Number(v), mes: item.mes ?? new Date().getMonth() + 1 })
              }
            >
              <SelectTrigger className="h-6 w-[80px] text-[11px]">
                <SelectValue placeholder="Ano" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 4 }, (_, i) => new Date().getFullYear() - 1 + i).map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {onDuplicate && item.mes != null && item.ano != null && (
            <DuplicateMonthsPopover
              baseMes={item.mes}
              baseAno={item.ano}
              onConfirm={(targets) => onDuplicate(targets)}
            />
          )}
          {canRemove && (
            <Button size="icon" variant="ghost" onClick={onRemove} className="h-8 w-8">
              <Trash2 className="size-4 text-muted-foreground" />
            </Button>
          )}
        </div>
      </div>

      <div className="grid sm:grid-cols-4 gap-3">
        <FieldWithCustom
          label="Tipo de Produto"
          value={item.tipo}
          options={productTypes as string[]}
          onChange={(v) => onChange({ tipo: v, programa: "", formato: "" })}
          isLoading={isLoading}
        />
        <FieldWithCustom
          label="Programa"
          value={item.programa}
          options={programas}
          optionSubtitles={programaSubtitles}
          onChange={(v) => onChange({ programa: v, formato: "" })}
          isLoading={isLoading}
        />
        <div className="space-y-1.5">
          <Label className="text-xs">Horário</Label>
          <Input
            placeholder="Ex: 08:00"
            value={item.horario}
            onChange={(e) => onChange({ horario: e.target.value })}
          />
        </div>
        <FieldWithCustom
          label="Formato *"
          value={item.formato}
          options={formatos}
          onChange={(v) => onChange({ formato: v })}
          disabled={!item.programa}
          isLoading={isLoading}
          showAddButton
          initialData={{
            tipo: item.tipo,
            programa: item.programa,
            formato: item.formato,
            valor_unit: t.valorUnit,
          }}
        />
      </div>

      {/* Informações do Parceiro Fornecedor do Produto */}
      {(matchedProduto?.parceiro_nome || item.parceiroNome) ? (
        <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-950 dark:text-emerald-200">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">🤝</span>
            <div>
              <div className="font-semibold text-xs text-emerald-900 dark:text-emerald-200 flex items-center gap-2 flex-wrap">
                <span>Parceiro Fornecedor:</span>
                <span className="font-bold underline decoration-emerald-500/50">
                  {matchedProduto?.parceiro_nome || item.parceiroNome}
                </span>
                {(matchedProduto?.parceiro_cnpj || item.parceiroCnpj) && (
                  <span className="font-mono text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-medium">
                    CNPJ: {matchedProduto?.parceiro_cnpj || item.parceiroCnpj}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                Produto comercializado em parceria. Vinculado ao CNPJ do fornecedor para proposta, faturamento e prestação de contas.
              </p>
            </div>
          </div>
          {(matchedProduto?.comissao_inquilino_pct != null || item.comissaoInquilinoPct != null) && (
            <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs shrink-0 py-1">
              Remuneração: {matchedProduto?.comissao_inquilino_pct ?? item.comissaoInquilinoPct}%
            </Badge>
          )}
        </div>
      ) : item.programa ? (
        <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/40 border border-border/50 text-muted-foreground text-xs">
          <span>🏢</span>
          <span><strong>Inventário Próprio:</strong> Produto da grade própria do veículo / emissora (sem intermediação de parceiro externo).</span>
        </div>
      ) : null}

      <div className="grid sm:grid-cols-4 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs flex items-center justify-between">
            <span>Valor unitário (R$)</span>
            {item.valorUnitOverride != null && (
              <button
                type="button"
                className="text-[10px] text-muted-foreground hover:underline"
                onClick={() => onChange({ valorUnitOverride: null, negociadoOverride: null })}
              >
                usar tabela
              </button>
            )}
          </Label>
          <Input
            type="number"
            min={0}
            step="0.01"
            value={t.valorUnit}
            onChange={(e) =>
              onChange({
                valorUnitOverride:
                  e.target.value === "" ? null : Math.max(0, parseFloat(e.target.value) || 0),
                negociadoOverride: null,
              })
            }
            className="font-mono"
          />
          <p className="text-[10px] text-muted-foreground">
            {item.valorUnitOverride != null
              ? "Valor personalizado"
              : "Do cadastro de produtos — edite para personalizar"}
          </p>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Inserções / dia (padrão)</Label>
          <Input
            type="number"
            min={1}
            value={item.insercoesDia}
            onChange={(e) => onChange({ insercoesDia: Math.max(1, parseInt(e.target.value) || 1) })}
          />
          <p className="text-[10px] text-muted-foreground">
            Aplicado em novos dias marcados. Edite por dia abaixo.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Quantidade de inserções</Label>
          <Input
            type="number"
            min={0}
            value={item.insercoesManual ?? ""}
            placeholder={String(t.totalInsercoes)}
            onChange={(e) => {
              const val = e.target.value === "" ? null : Math.max(0, parseInt(e.target.value) || 0);
              onChange({ insercoesManual: val, negociadoOverride: null });
            }}
            className="font-mono"
          />
          <p className="text-[10px] text-muted-foreground">
            {item.insercoesManual != null
              ? "Usando quantidade manual. Calendário abaixo é opcional."
              : "Deixe em branco para calcular pelos dias marcados."}
          </p>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Desconto (%)</Label>
          <Input
            type="number"
            min={0}
            max={100}
            step="0.01"
            value={t.descontoPct}
            onChange={(e) =>
              onChange({ desconto: parseFloat(e.target.value) || 0, negociadoOverride: null })
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Dias de veiculação</Label>
          <Input
            type="number"
            min={0}
            value={item.diasVeiculacao ?? ""}
            placeholder="Ex: 30"
            onChange={(e) =>
              onChange({
                diasVeiculacao: e.target.value === "" ? null : parseInt(e.target.value) || 0,
              })
            }
          />
          <p className="text-[10px] text-muted-foreground">
            Opcional. Informe a duração da campanha.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Valor negociado (R$)</Label>
          <Input
            type="number"
            min={0}
            step="0.01"
            value={t.valorNegociado}
            onChange={(e) => onChange({ negociadoOverride: parseFloat(e.target.value) || 0 })}
          />
          <p className="text-[10px] text-muted-foreground">
            Trava o líquido fechado da negociação.
          </p>
        </div>
      </div>

      {t.row && (
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge variant="secondary">{t.row.dia}</Badge>
          <Badge variant="secondary">{t.row.horario}</Badge>
          <Badge variant="secondary">{t.row.genero}</Badge>
        </div>
      )}

      {item.mes != null && item.ano != null ? (
        <div className="space-y-2">
          <div className="text-xs flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <CalendarRange className="size-3.5" />
              Datas de veiculação
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => {
                  const newMes = displayMes! === 1 ? 12 : displayMes! - 1;
                  const newAno = displayMes! === 1 ? displayAno! - 1 : displayAno!;
                  setDisplayMes(newMes);
                  setDisplayAno(newAno);
                }}
              >
                <ChevronLeft className="size-3" />
              </Button>
              <span className="font-medium min-w-[100px] text-center">
                {MESES[displayMes! - 1]} / {displayAno!}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => {
                  const newMes = displayMes! === 12 ? 1 : displayMes! + 1;
                  const newAno = displayMes! === 12 ? displayAno! + 1 : displayAno!;
                  setDisplayMes(newMes);
                  setDisplayAno(newAno);
                }}
              >
                <ChevronRight className="size-3" />
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span className="text-muted-foreground">Preencher mês:</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-6 px-2 text-[11px]"
              onClick={() => {
                const diasNoMes = new Date(displayAno!, displayMes!, 0).getDate();
                const next = { ...item.insercoesPorDia };
                for (const k of Object.keys(next)) {
                  const [y, m] = k.split("-").map(Number);
                  if (y === displayAno! && m === displayMes!) delete next[k];
                }
                const qtd = item.insercoesDia || 1;
                for (let d = 1; d <= diasNoMes; d++) {
                  const dt = new Date(displayAno!, displayMes! - 1, d);
                  const dow = dt.getDay();
                  if (dow === 0 || dow === 6) continue;
                  if (!isDayAllowed(displayAno!, displayMes!, d)) continue;
                  const k = `${displayAno!}-${String(displayMes!).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                  next[k] = qtd;
                }
                onChange({ insercoesPorDia: next });
              }}
              disabled={veicTipo === "dias_fixos" || veicTipo === "dias_semana"}
              title={
                veicTipo === "dias_fixos" || veicTipo === "dias_semana"
                  ? "Produto restrito pelo cadastro"
                  : ""
              }
            >
              Dias úteis (Seg–Sex)
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-6 px-2 text-[11px]"
              onClick={() => {
                const diasNoMes = new Date(displayAno!, displayMes!, 0).getDate();
                const next = { ...item.insercoesPorDia };
                for (const k of Object.keys(next)) {
                  const [y, m] = k.split("-").map(Number);
                  if (y === displayAno! && m === displayMes!) delete next[k];
                }
                const qtd = item.insercoesDia || 1;
                for (let d = 1; d <= diasNoMes; d++) {
                  if (!isDayAllowed(displayAno!, displayMes!, d)) continue;
                  const k = `${displayAno!}-${String(displayMes!).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                  next[k] = qtd;
                }
                onChange({ insercoesPorDia: next });
              }}
            >
              {veicTipo === "dias_fixos"
                ? "Preencher dias fixos"
                : veicTipo === "dias_semana"
                  ? `Preencher ${diasSemanaFixos.map((d) => DOW_LABELS[d]).join("/") || "dias da semana"}`
                  : veicTipo === "dias_uteis"
                    ? "Dias úteis (Seg–Sex)"
                    : veicTipo === "seg_sab"
                      ? "Segunda a sábado (Seg–Sáb)"
                      : "Dias seguidos (todos)"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[11px]"
              onClick={() => {
                const next = { ...item.insercoesPorDia };
                for (const k of Object.keys(next)) {
                  const [y, m] = k.split("-").map(Number);
                  if (y === displayAno! && m === displayMes!) delete next[k];
                }
                onChange({ insercoesPorDia: next });
              }}
            >
              Limpar mês
            </Button>
            {veicTipo !== "livre" && (
              <span className="text-[10px] text-muted-foreground ml-1">
                Produto restrito a{" "}
                {veicTipo === "dias_uteis"
                  ? "dias úteis"
                  : veicTipo === "seg_sab"
                    ? "segunda a sábado"
                    : veicTipo === "dias_semana"
                      ? `${diasSemanaFixos.map((d) => DOW_LABELS[d]).join(", ") || "—"}`
                      : `dias fixos (${diasFixos.join(", ") || "—"})`}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span className="text-muted-foreground">Campanha longa?</span>
            {[2, 3, 6, 12].map((n) => (
              <Button
                key={n}
                type="button"
                variant="outline"
                size="sm"
                className="h-6 px-2 text-[11px]"
                onClick={() => {
                  const base = Object.entries(item.insercoesPorDia).filter(([k]) => {
                    const [y, m] = k.split("-").map(Number);
                    return y === displayAno! && m === displayMes!;
                  });
                  if (base.length === 0) return;
                  const next = { ...item.insercoesPorDia };
                  for (let i = 1; i < n; i++) {
                    const nm = ((displayMes! - 1 + i) % 12) + 1;
                    const na = displayAno! + Math.floor((displayMes! - 1 + i) / 12);
                    const diasNoMes = new Date(na, nm, 0).getDate();
                    if (
                      veicTipo === "dias_semana" ||
                      veicTipo === "dias_uteis" ||
                      veicTipo === "seg_sab"
                    ) {
                      // Replica por dia da semana (ex.: toda quarta) — evita cair em outro DOW ao mudar de mês.
                      const dowQtd = new Map<number, number>();
                      for (const [k, qtd] of base) {
                        const [y, m, d] = k.split("-").map(Number);
                        const dow = new Date(y, m - 1, d).getDay();
                        dowQtd.set(dow, Math.max(dowQtd.get(dow) ?? 0, qtd));
                      }
                      for (let dia = 1; dia <= diasNoMes; dia++) {
                        const dow = new Date(na, nm - 1, dia).getDay();
                        const qtd = dowQtd.get(dow);
                        if (qtd == null) continue;
                        if (!isDayAllowed(na, nm, dia)) continue;
                        const nk = `${na}-${String(nm).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
                        next[nk] = qtd;
                      }
                    } else {
                      for (const [k, qtd] of base) {
                        const dia = Number(k.split("-")[2]);
                        if (dia > diasNoMes) continue;
                        if (!isDayAllowed(na, nm, dia)) continue;
                        const nk = `${na}-${String(nm).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
                        next[nk] = qtd;
                      }
                    }
                  }
                  onChange({ insercoesPorDia: next });
                }}
              >
                Replicar +{n}m
              </Button>
            ))}
            <span className="text-muted-foreground">(replica os dias do mês exibido)</span>
          </div>

          <CalendarioDias
            mes={displayMes!}
            ano={displayAno!}
            contagem={item.insercoesPorDia}
            onToggle={(d) => toggleDia(d, displayMes!, displayAno!)}
            isDayAllowed={(d) => isDayAllowed(displayAno!, displayMes!, d)}
          />

          {selecionados.length > 0 && (
            <div className="rounded-md border bg-background p-2 space-y-1">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium px-1">
                Inserções por dia — ajuste quando precisar de quantidades diferentes
              </div>
              <div className="flex flex-wrap gap-1.5">
                {selecionados.map((dateKey) => {
                  const n = item.insercoesPorDia[dateKey] || 1;
                  const [y, m, d] = dateKey.split("-").map(Number);
                  return (
                    <div
                      key={dateKey}
                      className="inline-flex items-center gap-1 rounded border bg-muted/40 px-1.5 py-0.5"
                    >
                      <span className="text-[10px] font-semibold tabular-nums">
                        {String(d).padStart(2, "0")}/{String(m).padStart(2, "0")}/
                        {String(y).slice(2)}
                      </span>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-5 w-5"
                        onClick={() => setDiaCount(dateKey, n - 1)}
                      >
                        <Minus className="size-3" />
                      </Button>
                      <Input
                        type="number"
                        min={1}
                        value={n}
                        onChange={(e) =>
                          setDiaCount(dateKey, Math.max(0, parseInt(e.target.value) || 0))
                        }
                        className="h-6 w-10 px-1 text-center text-[10px]"
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-5 w-5"
                        onClick={() => setDiaCount(dateKey, n + 1)}
                      >
                        <Plus className="size-3" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <p className="text-[11px] text-muted-foreground">
            {selecionados.length > 0
              ? `${selecionados.length} dia(s) marcado(s) · `
              : `Selecione as datas no calendário · `}
            <strong>{t.totalInsercoes}</strong> inserções ·{" "}
            <strong>{t.valorNegociado > 0 ? formatBRL(t.valorNegociado) : "Bonificação"}</strong>
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-[11px] text-muted-foreground">
            <strong>{t.totalInsercoes}</strong> inserções ·{" "}
            <strong>{t.valorNegociado > 0 ? formatBRL(t.valorNegociado) : "Bonificação"}</strong>
          </p>
        </div>
      )}
    </div>
  );
}

const DOW_LABEL = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function CalendarioDias({
  mes,
  ano,
  contagem,
  onToggle,
  isDayAllowed,
}: {
  mes: number;
  ano: number;
  contagem: Record<string, number>;
  onToggle: (d: number) => void;
  isDayAllowed?: (d: number) => boolean;
}) {
  const diasNoMes = new Date(ano, mes, 0).getDate();
  const primeiroDow = new Date(ano, mes - 1, 1).getDay();
  const hoje = new Date();
  const eHoje = (d: number) =>
    hoje.getFullYear() === ano && hoje.getMonth() === mes - 1 && hoje.getDate() === d;

  return (
    <div className="rounded-lg border bg-background p-2">
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DOW_LABEL.map((d) => (
          <div
            key={d}
            className="text-[10px] uppercase tracking-wide text-muted-foreground text-center font-medium py-1"
          >
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: primeiroDow }).map((_, i) => (
          <div key={`e-${i}`} />
        ))}
        {Array.from({ length: diasNoMes }, (_, i) => i + 1).map((d) => {
          const key = `${ano}-${String(mes).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
          const n = contagem[key] || 0;
          const active = n > 0;
          const dow = new Date(ano, mes - 1, d).getDay();
          const fimDeSemana = dow === 0 || dow === 6;
          const allowed = isDayAllowed ? isDayAllowed(d) : true;
          return (
            <button
              key={d}
              type="button"
              onClick={() => onToggle(d)}
              disabled={!allowed && !active}
              title={!allowed ? "Dia não permitido pela configuração do produto" : undefined}
              className={`h-12 rounded border text-xs font-medium transition-colors flex flex-col items-center justify-center gap-0.5 relative
                ${
                  active
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : !allowed
                      ? "bg-muted/20 border-dashed text-muted-foreground/50 cursor-not-allowed opacity-50"
                      : fimDeSemana
                        ? "bg-muted/40 hover:bg-muted border-border text-muted-foreground"
                        : "bg-background hover:bg-muted border-border"
                }
                ${eHoje(d) && !active ? "ring-1 ring-primary/60" : ""}`}
            >
              <span className="text-sm font-semibold leading-none">{d}</span>
              <span
                className={`text-[9px] uppercase leading-none ${active ? "opacity-90" : "opacity-60"}`}
              >
                {DOW_LABEL[dow]}
              </span>
              {active && n > 1 && (
                <span className="absolute -top-1 -right-1 bg-amber-400 text-black text-[9px] font-bold rounded-full px-1 min-w-[14px] h-[14px] flex items-center justify-center leading-none">
                  ×{n}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SummaryItem({
  label,
  value,
  highlight,
  muted,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  muted?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-3 ${highlight ? "bg-primary/10 border-primary/30" : "bg-muted/30"}`}
    >
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div
        className={`mt-1 font-display font-semibold ${highlight ? "text-primary text-xl" : muted ? "text-muted-foreground text-lg" : "text-lg"}`}
      >
        {value}
      </div>
    </div>
  );
}

function DuplicateMonthsPopover({
  baseMes,
  baseAno,
  onConfirm,
}: {
  baseMes: number;
  baseAno: number;
  onConfirm: (targets: Array<{ mes: number; ano: number }>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  // Gera 12 meses seguintes ao mês base
  const options = useMemo(() => {
    const arr: Array<{ mes: number; ano: number; key: string; label: string }> = [];
    let m = baseMes;
    let a = baseAno;
    for (let i = 0; i < 12; i++) {
      m += 1;
      if (m > 12) {
        m = 1;
        a += 1;
      }
      arr.push({ mes: m, ano: a, key: `${a}-${m}`, label: `${MESES[m - 1]}/${a}` });
    }
    return arr;
  }, [baseMes, baseAno]);

  const toggleAll = (v: boolean) => {
    const next: Record<string, boolean> = {};
    if (v) options.forEach((o) => (next[o.key] = true));
    setSelected(next);
  };

  const confirm = () => {
    const targets = options.filter((o) => selected[o.key]).map(({ mes, ano }) => ({ mes, ano }));
    if (targets.length === 0) return;
    onConfirm(targets);
    setSelected({});
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="icon" variant="ghost" className="h-8 w-8" title="Duplicar para outros meses">
          <Copy className="size-4 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-semibold">Duplicar para meses</div>
          <button
            type="button"
            className="text-[11px] text-primary hover:underline"
            onClick={() =>
              toggleAll(Object.values(selected).filter(Boolean).length !== options.length)
            }
          >
            {Object.values(selected).filter(Boolean).length === options.length ? "Limpar" : "Todos"}
          </button>
        </div>
        <div className="max-h-56 overflow-auto space-y-1.5 pr-1">
          {options.map((o) => (
            <label key={o.key} className="flex items-center gap-2 text-xs cursor-pointer">
              <Checkbox
                checked={!!selected[o.key]}
                onCheckedChange={(v) => setSelected((s) => ({ ...s, [o.key]: !!v }))}
              />
              <span>{o.label}</span>
            </label>
          ))}
        </div>
        <Button size="sm" className="w-full mt-3 h-8 text-xs" onClick={confirm}>
          Duplicar
        </Button>
      </PopoverContent>
    </Popover>
  );
}
