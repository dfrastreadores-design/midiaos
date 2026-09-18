import { useEffect, useState, useCallback } from "react";

export type WidgetId =
  | "kpi_faturamento"
  | "kpi_propostas"
  | "kpi_pipeline"
  | "kpi_clientes"
  | "vendas_mes"
  | "faturamento_meta"
  | "mix"
  | "funil"
  | "top_exec"
  | "desemp"
  | "comp"
  | "top_cli"
  | "top_ag"
  | "pi_status"
  | "prop_status"
  | "welcome_hero"
  | "calendario";


export const WIDGET_LABELS: Record<WidgetId, string> = {
  kpi_faturamento: "KPI · Faturamento do mês",
  kpi_propostas: "KPI · Propostas ativas",
  kpi_pipeline: "KPI · Pipeline aberto",
  kpi_clientes: "KPI · Clientes ativos",
  vendas_mes: "Vendas alcançadas no mês",
  faturamento_meta: "Faturamento vs Meta",
  mix: "Mix por Tipo",
  funil: "Funil de PIs",
  top_exec: "Top Executivos",
  desemp: "Desempenho dos Executivos",
  comp: "Vendas — Ano atual vs Anterior",
  top_cli: "Top Clientes",
  top_ag: "Top Agências",
  pi_status: "PIs por Status",
  prop_status: "Propostas por Status",
  welcome_hero: "Boas-vindas / Atalhos",
  calendario: "Calendário do mês",
};


export const ACCENT_PRESETS: { id: string; label: string; value: string }[] = [
  { id: "default", label: "Padrão", value: "" },
  { id: "azul", label: "Azul", value: "217 91% 60%" },
  { id: "verde", label: "Verde", value: "142 71% 45%" },
  { id: "roxo", label: "Roxo", value: "271 81% 56%" },
  { id: "laranja", label: "Laranja", value: "24 95% 53%" },
  { id: "rosa", label: "Rosa", value: "336 80% 58%" },
  { id: "ciano", label: "Ciano", value: "189 94% 43%" },
];

const ALL_IDS = Object.keys(WIDGET_LABELS) as WidgetId[];
const KEY = "dashboard_prefs_v2";

type Prefs = { hidden: WidgetId[]; order: WidgetId[]; accent: string };

function load(): Prefs {
  const base: Prefs = { hidden: [], order: [...ALL_IDS], accent: "" };
  if (typeof window === "undefined") return base;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      // migração do v1 (só hidden)
      const old = localStorage.getItem("dashboard_prefs_v1");
      if (old) {
        const p = JSON.parse(old);
        return { ...base, hidden: Array.isArray(p?.hidden) ? p.hidden : [] };
      }
      return base;
    }
    const p = JSON.parse(raw);
    const order: WidgetId[] = Array.isArray(p?.order) ? p.order.filter((x: any) => ALL_IDS.includes(x)) : [];
    const missing = ALL_IDS.filter((x) => !order.includes(x));
    return {
      hidden: Array.isArray(p?.hidden) ? p.hidden : [],
      order: [...order, ...missing],
      accent: typeof p?.accent === "string" ? p.accent : "",
    };
  } catch {
    return base;
  }
}

export function useDashboardPrefs() {
  const [prefs, setPrefs] = useState<Prefs>({ hidden: [], order: [...ALL_IDS], accent: "" });

  useEffect(() => { setPrefs(load()); }, []);

  const save = useCallback((next: Prefs) => {
    setPrefs(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  }, []);

  const isVisible = useCallback((id: WidgetId) => !prefs.hidden.includes(id), [prefs]);

  const toggle = useCallback((id: WidgetId) => {
    const hidden = prefs.hidden.includes(id)
      ? prefs.hidden.filter((x) => x !== id)
      : [...prefs.hidden, id];
    save({ ...prefs, hidden });
  }, [prefs, save]);

  const move = useCallback((id: WidgetId, dir: -1 | 1) => {
    const order = [...prefs.order];
    const i = order.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= order.length) return;
    [order[i], order[j]] = [order[j], order[i]];
    save({ ...prefs, order });
  }, [prefs, save]);

  const reorder = useCallback((fromId: WidgetId, toId: WidgetId) => {
    if (fromId === toId) return;
    const order = [...prefs.order];
    const from = order.indexOf(fromId);
    const to = order.indexOf(toId);
    if (from < 0 || to < 0) return;
    order.splice(from, 1);
    order.splice(to, 0, fromId);
    save({ ...prefs, order });
  }, [prefs, save]);

  const getOrder = useCallback((id: WidgetId) => {

    const i = prefs.order.indexOf(id);
    return i < 0 ? 999 : i;
  }, [prefs]);

  const setAccent = useCallback((accent: string) => save({ ...prefs, accent }), [prefs, save]);

  const reset = useCallback(() => save({ hidden: [], order: [...ALL_IDS], accent: "" }), [save]);
  const hideAll = useCallback(() => save({ ...prefs, hidden: [...ALL_IDS] }), [prefs, save]);

  return { prefs, isVisible, toggle, move, reorder, getOrder, setAccent, reset, hideAll, all: prefs.order.length ? prefs.order : ALL_IDS };
}
