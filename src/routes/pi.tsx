import { createFileRoute, useNavigate } from "@tanstack/react-router";
import React, { useRef, useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PiEcosystemSection } from "@/components/pi/PiEcosystemSection";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Send,
  Ban,
  Pencil,
  History as HistoryIcon,
  FileDown,
  Eye,
  Check,
  X,
  Trash2,
  FileSpreadsheet,
  PenLine,
  Copy,
  Calendar,
  RefreshCw,
  RotateCcw,
  MoreHorizontal,
  Sparkles as SparklesIcon,
  Clock,
} from "lucide-react";
import { PosVendaDialog } from "@/components/PosVendaDialog";
import { WhatsappQrDialog } from "@/components/WhatsappQrDialog";
import { CampanhaRateioDialog } from "@/components/CampanhaRateioDialog";
import { ComprovantesExecucaoDialog } from "@/components/ComprovantesExecucaoDialog";
import { getPrestacaoContas } from "@/lib/prestacao-contas.functions";
import { useTenantBranding } from "@/hooks/use-tenant-branding";
import { Handshake, FileCheck2 } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import { useUserRoles } from "@/hooks/use-roles";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  listPis,
  getPi,
  enviarPiParaAprovacao,
  aprovarPi,
  reprovarPi,
  compararPis,
  deletarPi,
  listHistoricoCliente,
} from "@/lib/pi.functions";
import { gerarPropostaDoPi } from "@/lib/propostas.functions";
import { FileText } from "lucide-react";
import { listUsuarios } from "@/lib/usuarios.functions";
import {
  getAssinaturaExecutivoDoPi,
  getAssinaturaClienteDoPi,
  getAssinaturaDiretoriaDoPi,
  criarLinkAssinaturaCliente,
} from "@/lib/assinaturas.functions";
import { listStatusAprovacaoDiretoria } from "@/lib/aprovacao-diretoria.functions";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { calcularDiasUteisRestantes } from "@/lib/campanhas-renovacao.functions";

import type { exportarPiExcel } from "@/lib/pi-excel";
import { PiFormDialog } from "@/components/PiFormDialog";
import { CancelarPiDialog } from "@/components/CancelarPiDialog";
import { ImportarPiPdfDialog } from "@/components/ImportarPiPdfDialog";
import type { PiExtraido } from "@/lib/pi-ai.functions";
import { resolverEntidadesPi } from "@/lib/pi-import.functions";
import { Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
// pi-pdf é carregado dinamicamente nos handlers para evitar SSR de libs com DOMMatrix
type GerarPdfPi = typeof import("@/lib/pi-pdf").gerarPdfPi;
import { loadPiLayoutCached } from "@/lib/pi-layout.functions";
import { toast } from "sonner";

// ---------- Renovação: remapeamento de dias preservando o dia da semana ----------
function daysInMonth(mes: number, ano: number) {
  return new Date(ano, mes, 0).getDate();
}
// Mapeia cada dia (dias_mes) do mês origem para o dia correspondente no mês destino,
// preservando o dia da semana e a "ocorrência" (1ª, 2ª, 3ª… segunda-feira, por ex.).
function remapDiasMes(
  dias: number[] | null | undefined,
  baseMes: number,
  baseAno: number,
  novoMes: number,
  novoAno: number,
): number[] {
  if (!dias || dias.length === 0) return [];
  const dim = daysInMonth(novoMes, novoAno);
  const out = new Set<number>();
  for (const d of dias) {
    if (!d || d < 1) continue;
    const orig = new Date(baseAno, baseMes - 1, d);
    const weekday = orig.getDay();
    const ordinal = Math.floor((d - 1) / 7) + 1; // 1..5
    // Achar 1ª ocorrência do weekday no novo mês
    const primeiro = new Date(novoAno, novoMes - 1, 1);
    const offset = (weekday - primeiro.getDay() + 7) % 7;
    let candidato = 1 + offset + (ordinal - 1) * 7;
    if (candidato > dim) candidato = 1 + offset + Math.floor((dim - 1 - offset) / 7) * 7; // última ocorrência
    if (candidato >= 1 && candidato <= dim) out.add(candidato);
  }
  return Array.from(out).sort((a, b) => a - b);
}

const normalizeRenovacaoText = (value: unknown) =>
  String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("pt-BR");

const normalizeRenovacaoNumber = (value: unknown) => {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? Math.round(n * 10000) / 10000 : 0;
};

const normalizeNumberArray = (value: unknown): number[] =>
  Array.isArray(value) ? value.map(Number).filter((n) => Number.isFinite(n) && n > 0) : [];

const normalizeStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.map(normalizeRenovacaoText).filter(Boolean).sort() : [];

function exactRenovacaoItemKey(it: any) {
  return JSON.stringify({
    tipo: normalizeRenovacaoText(it.tipo),
    programa: normalizeRenovacaoText(it.programa),
    formato: normalizeRenovacaoText(it.formato),
    horario: normalizeRenovacaoText(it.horario),
    mes: Number(it.mes ?? 0) || 0,
    ano: Number(it.ano ?? 0) || 0,
    insercoes_dia: normalizeRenovacaoNumber(it.insercoes_dia ?? 1),
    desconto: normalizeRenovacaoNumber(it.desconto),
    valor_unit: normalizeRenovacaoNumber(it.valor_unit),
    valor_tabela: normalizeRenovacaoNumber(it.valor_tabela),
    valor_negociado: normalizeRenovacaoNumber(it.valor_negociado),
    total_insercoes: Number(it.total_insercoes ?? 0) || 0,
    dias_mes: normalizeNumberArray(it.dias_mes),
    dias_semana: normalizeStringArray(it.dias_semana),
  });
}

function productRenovacaoKey(it: any) {
  return JSON.stringify({
    tipo: normalizeRenovacaoText(it.tipo),
    programa: normalizeRenovacaoText(it.programa),
    formato: normalizeRenovacaoText(it.formato),
    horario: normalizeRenovacaoText(it.horario),
    insercoes_dia: normalizeRenovacaoNumber(it.insercoes_dia ?? 1),
    desconto: normalizeRenovacaoNumber(it.desconto),
    valor_unit: normalizeRenovacaoNumber(it.valor_unit),
  });
}

function dedupeExactRenovacaoItems(items: any[]) {
  const seen = new Set<string>();
  return items.filter((it) => {
    const key = exactRenovacaoItemKey(it);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getDowSet(dias: number[], mes: number, ano: number) {
  const set = new Set<number>();
  for (const d of dias) {
    if (d >= 1 && d <= 31) set.add(new Date(ano, mes - 1, d).getDay());
  }
  return set;
}

function allDaysMatchingDows(dows: Set<number>, mes: number, ano: number) {
  const dim = daysInMonth(mes, ano);
  const out: number[] = [];
  for (let d = 1; d <= dim; d++) {
    if (dows.has(new Date(ano, mes - 1, d).getDay())) out.push(d);
  }
  return out;
}

function countDaysMatchingDows(dows: Set<number>, mes: number, ano: number) {
  return allDaysMatchingDows(dows, mes, ano).length;
}

// Decide se o item segue padrão "dias da semana" (ex.: toda quarta) ou dias fixos numéricos.
// Se cobre TODOS os dias do mês de origem para o(s) DOW(s) usados, reproduz no destino
// respeitando o mesmo DOW (com todos os dias do mês destino desses DOWs).
// Caso contrário, faz remap ordinal preservando dia da semana + ocorrência.
function computeTargetDiasMes(
  rawDias: number[],
  baseMes: number,
  baseAno: number,
  targetMes: number,
  targetAno: number,
): number[] {
  if (!rawDias.length) return [];
  const uniq = Array.from(new Set(rawDias)).sort((a, b) => a - b);
  const dowSet = getDowSet(uniq, baseMes, baseAno);
  const fullDowCoverage = uniq.length === countDaysMatchingDows(dowSet, baseMes, baseAno);
  if (fullDowCoverage) {
    return allDaysMatchingDows(dowSet, targetMes, targetAno);
  }
  return remapDiasMes(uniq, baseMes, baseAno, targetMes, targetAno);
}

function buildRenovacaoConsolidatedItems(full: any, targetMes: number, targetAno: number) {
  const defaultMes = full.mes_veiculacao ?? new Date().getMonth() + 1;
  const defaultAno = full.ano_veiculacao ?? new Date().getFullYear();
  const byKey = new Map<string, any>();

  for (const it of dedupeExactRenovacaoItems(full.itens ?? [])) {
    const baseMes = it.mes ?? defaultMes;
    const baseAno = it.ano ?? defaultAno;
    const key = productRenovacaoKey(it);
    const insercoesDia = Math.max(1, Number(it.insercoes_dia || 1) || 1);
    if (!byKey.has(key)) {
      byKey.set(key, {
        tipo: it.tipo,
        programa: it.programa,
        horario: it.horario ?? null,
        formato: it.formato,
        insercoes_dia: insercoesDia,
        dias_semana: new Set<string>(it.dias_semana ?? []),
        diasOrigemSet: new Set<number>(),
        diasDestinoSet: new Set<number>(),
        desconto: it.desconto,
        valor_unit: it.valor_unit,
        mes: targetMes,
        ano: targetAno,
      });
    }
    const acc = byKey.get(key);
    for (const ds of it.dias_semana ?? []) acc.dias_semana.add(ds);
    const rawDias = normalizeNumberArray(it.dias_mes);
    for (const d of rawDias) acc.diasOrigemSet.add(d);
    const targetDias = computeTargetDiasMes(rawDias, baseMes, baseAno, targetMes, targetAno);
    for (const d of targetDias) acc.diasDestinoSet.add(d);
  }

  return Array.from(byKey.values()).map((acc) => {
    const diasDestino = Array.from(acc.diasDestinoSet as Set<number>).sort((a, b) => a - b);
    const totalInsercoes = diasDestino.length * (acc.insercoes_dia || 1);
    const valorTabela = Math.round((Number(acc.valor_unit) || 0) * totalInsercoes * 100) / 100;
    const valorNegociado =
      Math.round(valorTabela * (1 - (Number(acc.desconto) || 0) / 100) * 100) / 100;
    return {
      tipo: acc.tipo,
      programa: acc.programa,
      horario: acc.horario,
      formato: acc.formato,
      insercoes_dia: acc.insercoes_dia,
      dias_semana: Array.from(acc.dias_semana),
      dias_mes: diasDestino,
      dias_origem: Array.from(acc.diasOrigemSet as Set<number>).sort(
        (a: number, b: number) => a - b,
      ),
      desconto: acc.desconto,
      valor_unit: acc.valor_unit,
      valor_tabela: valorTabela,
      valor_negociado: valorNegociado,
      total_insercoes: totalInsercoes,
      mes: targetMes,
      ano: targetAno,
    };
  });
}

function buildRenovacaoPrefill(full: any, targetMes: number, targetAno: number) {
  const itens = buildRenovacaoConsolidatedItems(full, targetMes, targetAno).map(
    ({ dias_origem: _diasOrigem, ...it }) => it,
  );

  return {
    cliente_id: full.cliente_id,
    agencia_id: full.agencia_id,
    campanha: full.campanha,
    mes_veiculacao: targetMes,
    ano_veiculacao: targetAno,
    observacao: `Renovação de contrato do PI ${full.numero}${full.observacao ? "\n" + full.observacao : ""}`,
    faturamento_contra: full.faturamento_contra ?? "cliente",
    faturamento_tipo: full.faturamento_tipo ?? "bruto",
    permuta: full.permuta ?? false,
    permuta_uso: full.permuta_uso ?? "empresa",
    executivo_id: full.executivo_id ?? null,
    emissora_id: full.emissora_id ?? null,
    itens,
  };
}

export const Route = createFileRoute("/pi")({
  head: () => ({ meta: [{ title: "Pedidos de Inserção — Mídia.OS" }] }),
  validateSearch: (search: Record<string, unknown>) => ({
    id: typeof search.id === "string" ? search.id : undefined,
    renovar: typeof search.renovar === "string" ? search.renovar : undefined,
    filtro: typeof search.filtro === "string" ? search.filtro : undefined,
  }),
  component: PIPage,
});

const STATUS_COLOR: Record<string, string> = {
  rascunho: "bg-muted text-muted-foreground",
  enviado: "bg-blue-100 text-blue-700",
  aguardando_aprovacao: "bg-amber-100 text-amber-800",
  aguardando_assinatura: "bg-indigo-100 text-indigo-700",
  assinado: "bg-emerald-100 text-emerald-700",
  enviar_opec: "bg-purple-100 text-purple-700",
  aprovado: "bg-success/10 text-success",
  faturado: "bg-gold/20 text-gold-foreground",
  veiculado: "bg-teal-100 text-teal-700",
  encerrado: "bg-slate-300 text-slate-700",
  finalizado: "bg-green-600 text-white",
  reprovado: "bg-destructive/15 text-destructive",
  cancelado: "bg-destructive/10 text-destructive",
  substituido: "bg-slate-200 text-slate-600",
};

const STATUS_LABEL: Record<string, string> = {
  rascunho: "Rascunho",
  enviado: "Enviado",
  aguardando_aprovacao: "Aguardando Aprovação",
  aguardando_assinatura: "Aguardando Assinatura",
  assinado: "Assinado (Cliente)",
  enviar_opec: "Pronto para OPEC",
  aprovado: "Aprovado pela Diretoria",
  faturado: "Faturado",
  veiculado: "Veiculado",
  encerrado: "Encerrado",
  finalizado: "Finalizado",
  reprovado: "Reprovado",
  cancelado: "Cancelado",
  substituido: "Substituído",
};

function formatBRL(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
}

type PiRow = {
  id: string;
  numero: string;
  campanha: string;
  status: string;
  mes_veiculacao: number;
  ano_veiculacao: number;
  periodo_inicio?: string | null;
  periodo_fim?: string | null;
  valor_tabela: number;
  valor_desconto: number;
  valor_negociado: number;
  total_insercoes: number;
  observacao: string | null;
  cliente_id: string | null;
  agencia_id: string | null;
  executivo_id?: string | null;
  faturamento_contra?: "cliente" | "agencia" | null;
  faturamento_tipo?: "bruto" | "liquido" | null;
  data_faturamento?: string | null;
  data_envio_nota?: string | null;
  data_vencimento_nota?: string | null;
  email_faturamento?: string | null;
  substitui_pi_id?: string | null;
  created_at?: string | null;

  cliente?: { razao_social: string; nome_fantasia: string | null } | null;
  agencia?: { razao_social: string; nome_fantasia: string | null } | null;
};

function PIPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const routeSearch = Route.useSearch();
  const [secaoAtiva, setSecaoAtiva] = useState<"pi360" | "historico_classico">("pi360");
  const [apenasRenovacao10d, setApenasRenovacao10d] = useState(
    routeSearch?.filtro === "renovacao_10d",
  );
  const [search, setSearch] = useState("");
  const [fatFilter, setFatFilter] = useState<"todos" | "bruto" | "liquido">("todos");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [mesFilter, setMesFilter] = useState<string>("todos");
  const [anoFilter, setAnoFilter] = useState<string>("todos");
  const [entidadeFilter, setEntidadeFilter] = useState<"todos" | "cliente" | "agencia">("todos");
  const [permutaFilter, setPermutaFilter] = useState<"todos" | "sim" | "nao">("todos");
  const [execFilter, setExecFilter] = useState<string>("todos");
  // Filtros por coluna
  const [fNumero, setFNumero] = useState("");
  const [fCliente, setFCliente] = useState("");
  const [fCampanha, setFCampanha] = useState("");
  const [fValorMin, setFValorMin] = useState("");
  const [fValorMax, setFValorMax] = useState("");
  const [fInsMin, setFInsMin] = useState("");
  const [fInsMax, setFInsMax] = useState("");
  const [fDescMin, setFDescMin] = useState("");
  const [fDescMax, setFDescMax] = useState("");
  // Ordenação
  type SortKey =
    | "recente"
    | "numero"
    | "cliente"
    | "campanha"
    | "veiculacao"
    | "insercoes"
    | "valor"
    | "desconto"
    | "status";
  const [sortKey, setSortKey] = useState<SortKey>("recente");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir("asc");
    }
  };
  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey !== k ? (
      <ArrowUpDown className="size-3 inline ml-1 opacity-40" />
    ) : sortDir === "asc" ? (
      <ArrowUp className="size-3 inline ml-1" />
    ) : (
      <ArrowDown className="size-3 inline ml-1" />
    );
  const [showSubstituidos, setShowSubstituidos] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<
    (NonNullable<Parameters<typeof PiFormDialog>[0]["initial"]> & { numero?: string }) | null
  >(null);
  const [cancelPi, setCancelPi] = useState<PiRow | null>(null);
  const [histPi, setHistPi] = useState<PiRow | null>(null);
  const [posVendaPi, setPosVendaPi] = useState<PiRow | null>(null);
  const [rateioPi, setRateioPi] = useState<{ id: string; numero: string; campanha: string; valor_negociado: number } | null>(null);
  const [comprovantesPi, setComprovantesPi] = useState<{ id: string; numero: string; campanha: string } | null>(null);
  const { nome: empresaNome } = useTenantBranding();

  const handleBaixarPrestacaoContas = async (p: PiRow) => {
    try {
      toast.info("Compilando dados de prestação de contas...");
      const dados = await getPrestacaoContas({ data: { piId: p.id } });
      const { gerarPdfPrestacaoContas } = await import("@/lib/prestacao-contas-pdf");
      gerarPdfPrestacaoContas(dados, { nome: empresaNome });
      toast.success("Prestação de contas gerada!");
    } catch (e: any) {
      toast.error(e.message || "Erro ao gerar prestação de contas");
    }
  };

  const [pdfOpen, setPdfOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitulo, setPreviewTitulo] = useState<string>("");
  const [linkAssinatura, setLinkAssinatura] = useState<{
    pi: PiRow;
    url: string;
    pdfUrl?: string | null;
    phone?: string | null;
  } | null>(null);
  const [whatsLoading, setWhatsLoading] = useState(false);
  const [whatsQr, setWhatsQr] = useState<{ phone: string; message: string; title?: string } | null>(
    null,
  );
  const [prefill, setPrefill] = useState<
    NonNullable<Parameters<typeof PiFormDialog>[0]["initial"]> | undefined
  >(undefined);
  const [renovadoDeId, setRenovadoDeId] = useState<string | null>(null);
  const [renovarSource, setRenovarSource] = useState<{
    full: any;
    initialMes: number;
    initialAno: number;
  } | null>(null);

  React.useEffect(() => {
    if (routeSearch.renovar) {
      (async () => {
        try {
          const full = (await getPi({ data: { id: routeSearch.renovar! } })) as any;
          if (full) {
            const baseMes = full.mes_veiculacao ?? new Date().getMonth() + 1;
            const baseAno = full.ano_veiculacao ?? new Date().getFullYear();
            const nextMes = (baseMes % 12) + 1;
            const nextAno = baseAno + (baseMes === 12 ? 1 : 0);
            setRenovarSource({ full, initialMes: nextMes, initialAno: nextAno });
          }
        } catch (e) {
          console.warn("Falha ao abrir renovação via parâmetro URL:", e);
        }
      })();
    }
  }, [routeSearch.renovar]);

  const handleRenovarPi = async (piId: string) => {
    try {
      const full = (await getPi({ data: { id: piId } })) as any;
      if (full) {
        const baseMes = full.mes_veiculacao ?? new Date().getMonth() + 1;
        const baseAno = full.ano_veiculacao ?? new Date().getFullYear();
        const nextMes = (baseMes % 12) + 1;
        const nextAno = baseAno + (baseMes === 12 ? 1 : 0);
        setRenovarSource({ full, initialMes: nextMes, initialAno: nextAno });
      }
    } catch (e) {
      toast.error("Falha ao carregar dados para renovação");
    }
  };

  const { user, loading: authLoading } = useAuth();
  const { isAdmin, hasPermission, roles } = useUserRoles();
  const [reprovaPi, setReprovaPi] = useState<PiRow | null>(null);
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["pis"],
    queryFn: () => listPis() as unknown as Promise<PiRow[]>,
    enabled: !!user && !authLoading,
  });
  const { data: usuarios = [] } = useQuery({
    queryKey: ["usuarios-pi-filtro"],
    queryFn: () => listUsuarios() as unknown as Promise<Array<{ id: string; nome: string }>>,
    enabled: !!user && !authLoading,
  });
  const { data: aprovDirList = [] } = useQuery({
    queryKey: ["pis-aprov-diretoria"],
    queryFn: () => listStatusAprovacaoDiretoria(),
    enabled: !!user && !authLoading,
    refetchInterval: 20000,
    refetchOnWindowFocus: true,
  });
  const aprovDirMap = React.useMemo(() => {
    const m = new Map<
      string,
      { status: string; aprovador_nome: string | null; decidido_em: string | null }
    >();
    for (const r of aprovDirList as Array<{
      pi_id: string;
      status: string;
      aprovador_nome: string | null;
      decidido_em: string | null;
    }>)
      m.set(r.pi_id, r);
    return m;
  }, [aprovDirList]);

  const { data: anexosList = [] } = useQuery({
    queryKey: ["pis-anexos-status"],
    queryFn: async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data, error } = await supabase
        .from("pi_anexos")
        .select("pi_id")
        .not("pi_id", "is", null);
      if (error) throw error;
      return (data ?? []) as Array<{ pi_id: string }>;
    },
    enabled: !!user && !authLoading,
    refetchOnWindowFocus: true,
  });
  const anexosSet = React.useMemo(() => {
    const s = new Set<string>();
    for (const r of anexosList) if (r.pi_id) s.add(r.pi_id);
    return s;
  }, [anexosList]);
  // Realtime: atualiza quando a Diretoria assina/decide
  React.useEffect(() => {
    if (!user) return;
    let cancelled = false;
    let channel: ReturnType<
      typeof import("@/integrations/supabase/client").supabase.channel
    > | null = null;
    (async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      if (cancelled) return;
      channel = supabase
        .channel("pi-aprov-diretoria")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "pi_aprovacoes_diretoria" },
          () => {
            qc.invalidateQueries({ queryKey: ["pis-aprov-diretoria"] });
            qc.invalidateQueries({ queryKey: ["pis"] });
          },
        )
        .subscribe();
    })();
    return () => {
      cancelled = true;
      if (channel) {
        import("@/integrations/supabase/client").then(({ supabase }) =>
          supabase.removeChannel(channel!),
        );
      }
    };
  }, [user, qc]);

  const sendMut = useMutation({
    mutationFn: (pi: PiRow) => enviarPiParaAprovacao({ data: { id: pi.id } }),
    onSuccess: () => {
      toast.success("PI enviado para aprovação da Diretoria");
      qc.invalidateQueries({ queryKey: ["pis"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const approveMut = useMutation({
    mutationFn: (pi: PiRow) => aprovarPi({ data: { id: pi.id } }),
    onSuccess: () => {
      toast.success("PI aprovado");
      qc.invalidateQueries({ queryKey: ["pis"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (pi: PiRow) => deletarPi({ data: { id: pi.id } }),
    onSuccess: () => {
      toast.success("PI excluído");
      qc.invalidateQueries({ queryKey: ["pis"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Mapeia o PI original -> PI que o substituiu
  const substituidoPor = new Map<string, PiRow>();
  for (const p of rows) {
    if (p.substitui_pi_id) substituidoPor.set(p.substitui_pi_id, p);
  }
  const totalSubstituidos = rows.filter((p) => p.status === "substituido").length;
  const anosDisponiveis = Array.from(new Set(rows.map((p) => p.ano_veiculacao))).sort(
    (a, b) => b - a,
  );

  const filtered = rows
    .filter((p) => {
      const s = search.toLowerCase().trim();
      const matchSearch =
        !s ||
        p.numero.toLowerCase().includes(s) ||
        p.campanha.toLowerCase().includes(s) ||
        p.cliente?.razao_social?.toLowerCase().includes(s) ||
        p.cliente?.nome_fantasia?.toLowerCase().includes(s) ||
        p.agencia?.razao_social?.toLowerCase().includes(s) ||
        p.agencia?.nome_fantasia?.toLowerCase().includes(s) ||
        p.observacao?.toLowerCase().includes(s);
      const matchFat = fatFilter === "todos" || (p.faturamento_tipo ?? "bruto") === fatFilter;
      const matchStatus = statusFilter === "todos" || p.status === statusFilter;
      const matchMes = mesFilter === "todos" || String(p.mes_veiculacao) === mesFilter;
      const matchAno = anoFilter === "todos" || String(p.ano_veiculacao) === anoFilter;
      const matchEntidade =
        entidadeFilter === "todos" ||
        (entidadeFilter === "cliente" && !p.agencia_id) ||
        (entidadeFilter === "agencia" && !!p.agencia_id);
      const piPermuta = (p as PiRow & { permuta?: boolean }).permuta === true;
      const matchPermuta =
        permutaFilter === "todos" ||
        (permutaFilter === "sim" && piPermuta) ||
        (permutaFilter === "nao" && !piPermuta);
      const matchExec = execFilter === "todos" || p.executivo_id === execFilter;
      const matchSubst = showSubstituidos || p.status !== "substituido";

      let matchRenovacao10d = true;
      if (apenasRenovacao10d) {
        let fimStr = p.periodo_fim;
        if (!fimStr && p.mes_veiculacao && p.ano_veiculacao) {
          const uDia = new Date(p.ano_veiculacao, p.mes_veiculacao, 0).getDate();
          fimStr = `${p.ano_veiculacao}-${String(p.mes_veiculacao).padStart(2, "0")}-${String(uDia).padStart(2, "0")}`;
        }
        if (!fimStr || ["cancelado", "reprovado", "substituido"].includes(p.status)) {
          matchRenovacao10d = false;
        } else {
          const du = calcularDiasUteisRestantes(fimStr);
          matchRenovacao10d = du <= 10 && du >= -3;
        }
      }

      // Filtros por coluna
      const matchFNumero = !fNumero || p.numero.toLowerCase().includes(fNumero.toLowerCase());
      const matchFCliente =
        !fCliente ||
        (
          (p.cliente?.razao_social ?? "") +
          " " +
          (p.cliente?.nome_fantasia ?? "") +
          " " +
          (p.agencia?.razao_social ?? "") +
          " " +
          (p.agencia?.nome_fantasia ?? "")
        )
          .toLowerCase()
          .includes(fCliente.toLowerCase());
      const matchFCampanha =
        !fCampanha || p.campanha.toLowerCase().includes(fCampanha.toLowerCase());
      const v = p.valor_negociado || 0;
      const matchValorMin = !fValorMin || v >= parseFloat(fValorMin);
      const matchValorMax = !fValorMax || v <= parseFloat(fValorMax);
      const ins = p.total_insercoes || 0;
      const matchInsMin = !fInsMin || ins >= parseFloat(fInsMin);
      const matchInsMax = !fInsMax || ins <= parseFloat(fInsMax);
      const descPct = p.valor_tabela > 0 ? (p.valor_desconto / p.valor_tabela) * 100 : 0;
      const matchDescMin = !fDescMin || descPct >= parseFloat(fDescMin);
      const matchDescMax = !fDescMax || descPct <= parseFloat(fDescMax);

      const isWaitingApproval = p.status === "aguardando_aprovacao";
      const isProducao = roles.includes("producao");
      const canSeeApproval = isAdmin || p.executivo_id === user?.id || isProducao;
      const matchRoleVisibility = !isWaitingApproval || canSeeApproval;

      return (
        matchSearch &&
        matchFat &&
        matchStatus &&
        matchMes &&
        matchAno &&
        matchEntidade &&
        matchPermuta &&
        matchExec &&
        matchSubst &&
        matchRenovacao10d &&
        matchFNumero &&
        matchFCliente &&
        matchFCampanha &&
        matchValorMin &&
        matchValorMax &&
        matchInsMin &&
        matchInsMax &&
        matchDescMin &&
        matchDescMax &&
        matchRoleVisibility
      );
    })
    .sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      const getVal = (p: PiRow): string | number => {
        switch (sortKey) {
          case "recente":
            return p.created_at ?? "";
          case "numero":
            return p.numero;
          case "cliente":
            return (
              p.cliente?.nome_fantasia ||
              p.cliente?.razao_social ||
              p.agencia?.razao_social ||
              ""
            ).toLowerCase();
          case "campanha":
            return p.campanha.toLowerCase();
          case "veiculacao":
            return p.ano_veiculacao * 100 + p.mes_veiculacao;
          case "insercoes":
            return p.total_insercoes || 0;
          case "valor":
            return p.valor_negociado || 0;
          case "desconto":
            return p.valor_tabela > 0 ? p.valor_desconto / p.valor_tabela : 0;
          case "status":
            return p.status;
        }
      };
      const va = getVal(a);
      const vb = getVal(b);
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });

  const total = rows.reduce((a, b) => a + (b.valor_negociado || 0), 0);

  const grupos: { tipo: "bruto" | "liquido"; rows: PiRow[]; total: number; insercoes: number }[] = (
    ["bruto", "liquido"] as const
  )
    .map((tipo) => {
      const r = filtered.filter((p) => (p.faturamento_tipo ?? "bruto") === tipo);
      return {
        tipo,
        rows: r,
        total: r.reduce((a, b) => a + (b.valor_negociado || 0), 0),
        insercoes: r.reduce((a, b) => a + (b.total_insercoes || 0), 0),
      };
    })
    .filter((g) => g.rows.length > 0);

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-semibold tracking-tight">
            Pedidos de Inserção (PI)
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Ordens de compra formal · Checking pericial de veiculação · Liquidação bimodal e repasses
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-muted p-1 rounded-lg flex items-center border">
            <button
              type="button"
              onClick={() => setSecaoAtiva("pi360")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                secaoAtiva === "pi360"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <FileCheck2 className="size-3.5 text-primary" />
              PI 360° & Liquidação Bimodal
            </button>
            <button
              type="button"
              onClick={() => setSecaoAtiva("historico_classico")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                secaoAtiva === "historico_classico"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <HistoryIcon className="size-3.5" />
              PIs Clássicos / Histórico
            </button>
          </div>
          {secaoAtiva === "historico_classico" && (
            <>
              <Button variant="outline" size="sm" onClick={() => setPdfOpen(true)}>
                <Sparkles className="size-4 mr-2" />
                Importar PDF (IA)
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setEditing(null);
                  setPrefill(undefined);
                  setFormOpen(true);
                }}
              >
                <Plus className="size-4 mr-2" />
                Novo PI Clássico
              </Button>
            </>
          )}
        </div>
      </div>

      {secaoAtiva === "pi360" ? (
        <PiEcosystemSection />
      ) : (
        <>

      {(() => {
        const now = new Date();
        const mesAtual = now.getMonth() + 1;
        const anoAtual = now.getFullYear();
        const nomeMes = now.toLocaleDateString("pt-BR", { month: "long" });
        const STATUS_ASSINADOS = [
          "aprovado",
          "aguardando_assinatura",
          "faturado",
          "veiculado",
          "encerrado",
          "finalizado",
        ];
        const doMes = rows.filter(
          (p) =>
            p.mes_veiculacao === mesAtual &&
            p.ano_veiculacao === anoAtual &&
            STATUS_ASSINADOS.includes(p.status),
        );
        const totalBruto = doMes
          .filter((p) => (p.faturamento_tipo ?? "bruto") === "bruto")
          .reduce((a, b) => a + (b.valor_negociado || 0), 0);
        const totalLiquido = doMes
          .filter((p) => p.faturamento_tipo === "liquido")
          .reduce((a, b) => a + (b.valor_negociado || 0), 0);
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground uppercase">
                  PIs assinados · {nomeMes}
                </div>
                <div className="text-2xl font-display font-semibold mt-1">{doMes.length}</div>
                <div className="text-[10px] text-muted-foreground mt-1">
                  Somente após assinatura da diretoria
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground uppercase">
                  Faturamento Bruto · {nomeMes}
                </div>
                <div className="text-2xl font-display font-semibold mt-1 text-primary">
                  {formatBRL(totalBruto)}
                </div>
                <div className="text-[10px] text-muted-foreground mt-1">
                  PIs com faturamento bruto assinados
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground uppercase">
                  Faturamento Líquido · {nomeMes}
                </div>
                <div className="text-2xl font-display font-semibold mt-1 text-success">
                  {formatBRL(totalLiquido)}
                </div>
                <div className="text-[10px] text-muted-foreground mt-1">
                  PIs com faturamento líquido assinados
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground uppercase">Total do Mês</div>
                <div className="text-2xl font-display font-semibold mt-1">
                  {formatBRL(totalBruto + totalLiquido)}
                </div>
                <div className="text-[10px] text-muted-foreground mt-1">
                  Bruto + Líquido validados
                </div>
              </CardContent>
            </Card>
          </div>
        );
      })()}

      <Card>
        <CardContent className="p-0">
          <div className="p-3 sm:p-4 border-b flex flex-wrap items-center gap-2 sm:gap-3">
            <Input
              placeholder="Buscar por nº, campanha, cliente, agência ou observação…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:max-w-md min-w-0"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos status</SelectItem>
                {Object.entries(STATUS_LABEL).map(([k, label]) => (
                  <SelectItem key={k} value={k}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={fatFilter}
              onValueChange={(v) => setFatFilter(v as "todos" | "bruto" | "liquido")}
            >
              <SelectTrigger className="w-[calc(50%-0.25rem)] sm:w-[170px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos faturamentos</SelectItem>
                <SelectItem value="bruto">Bruto</SelectItem>
                <SelectItem value="liquido">Líquido</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={entidadeFilter}
              onValueChange={(v) => setEntidadeFilter(v as "todos" | "cliente" | "agencia")}
            >
              <SelectTrigger className="w-[calc(50%-0.25rem)] sm:w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Cliente e agência</SelectItem>
                <SelectItem value="cliente">Direto (cliente)</SelectItem>
                <SelectItem value="agencia">Via agência</SelectItem>
              </SelectContent>
            </Select>
            <Select value={mesFilter} onValueChange={setMesFilter}>
              <SelectTrigger className="w-[calc(50%-0.25rem)] sm:w-[130px]">
                <SelectValue placeholder="Mês" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos meses</SelectItem>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <SelectItem key={m} value={String(m)}>
                    {String(m).padStart(2, "0")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={anoFilter} onValueChange={setAnoFilter}>
              <SelectTrigger className="w-[calc(50%-0.25rem)] sm:w-[120px]">
                <SelectValue placeholder="Ano" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos anos</SelectItem>
                {anosDisponiveis.map((a) => (
                  <SelectItem key={a} value={String(a)}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={permutaFilter}
              onValueChange={(v) => setPermutaFilter(v as "todos" | "sim" | "nao")}
            >
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Permuta: todos</SelectItem>
                <SelectItem value="sim">Apenas permuta</SelectItem>
                <SelectItem value="nao">Sem permuta</SelectItem>
              </SelectContent>
            </Select>
            {isAdmin && (
              <Select value={execFilter} onValueChange={setExecFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Executivo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos executivos</SelectItem>
                  {usuarios.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button
              variant={apenasRenovacao10d ? "default" : "outline"}
              size="sm"
              onClick={() => setApenasRenovacao10d(!apenasRenovacao10d)}
              className={`h-9 gap-1.5 text-xs font-semibold ${
                apenasRenovacao10d
                  ? "bg-amber-600 text-white hover:bg-amber-700"
                  : "border-amber-300 text-amber-800 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30"
              }`}
              title="Filtrar campanhas a 10 dias úteis ou menos do término para negociação de renovação"
            >
              <Clock className="size-3.5" />
              <span>A Renovar (≤ 10 dias úteis)</span>
            </Button>

            {(search ||
              apenasRenovacao10d ||
              statusFilter !== "todos" ||
              fatFilter !== "todos" ||
              mesFilter !== "todos" ||
              anoFilter !== "todos" ||
              entidadeFilter !== "todos" ||
              permutaFilter !== "todos" ||
              execFilter !== "todos" ||
              fNumero ||
              fCliente ||
              fCampanha ||
              fValorMin ||
              fValorMax ||
              fInsMin ||
              fInsMax ||
              fDescMin ||
              fDescMax) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setApenasRenovacao10d(false);
                  setStatusFilter("todos");
                  setFatFilter("todos");
                  setMesFilter("todos");
                  setAnoFilter("todos");
                  setEntidadeFilter("todos");
                  setPermutaFilter("todos");
                  setExecFilter("todos");
                  setFNumero("");
                  setFCliente("");
                  setFCampanha("");
                  setFValorMin("");
                  setFValorMax("");
                  setFInsMin("");
                  setFInsMax("");
                  setFDescMin("");
                  setFDescMax("");
                }}
              >
                <X className="size-4 mr-1" />
                Limpar filtros
              </Button>
            )}
            <div className="ml-auto text-xs text-muted-foreground">
              {filtered.length} de {rows.length} PI(s)
            </div>
            {totalSubstituidos > 0 && (
              <Button
                variant={showSubstituidos ? "default" : "outline"}
                size="sm"
                onClick={() => setShowSubstituidos((v) => !v)}
                title="Mostrar/ocultar PIs substituídos"
              >
                <HistoryIcon className="size-4 mr-2" />
                {showSubstituidos
                  ? "Ocultar substituídos"
                  : `Mostrar substituídos (${totalSubstituidos})`}
              </Button>
            )}
          </div>
          <div className="w-full overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead
                    className="cursor-pointer select-none"
                    onClick={() => toggleSort("numero")}
                  >
                    Nº PI
                    <SortIcon k="numero" />
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none"
                    onClick={() => toggleSort("cliente")}
                  >
                    Cliente / Agência
                    <SortIcon k="cliente" />
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none"
                    onClick={() => toggleSort("campanha")}
                  >
                    Campanha
                    <SortIcon k="campanha" />
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none"
                    onClick={() => toggleSort("veiculacao")}
                  >
                    Veiculação
                    <SortIcon k="veiculacao" />
                  </TableHead>
                  <TableHead
                    className="text-right cursor-pointer select-none"
                    onClick={() => toggleSort("insercoes")}
                  >
                    Inserções
                    <SortIcon k="insercoes" />
                  </TableHead>
                  <TableHead
                    className="text-right cursor-pointer select-none"
                    onClick={() => toggleSort("valor")}
                  >
                    Bruto
                    <SortIcon k="valor" />
                  </TableHead>
                  <TableHead className="text-right">Líquido</TableHead>
                  <TableHead
                    className="text-right cursor-pointer select-none"
                    onClick={() => toggleSort("desconto")}
                  >
                    Desc. médio
                    <SortIcon k="desconto" />
                  </TableHead>
                  <TableHead>Faturamento</TableHead>
                  <TableHead
                    className="cursor-pointer select-none"
                    onClick={() => toggleSort("status")}
                  >
                    Status
                    <SortIcon k="status" />
                  </TableHead>
                  <TableHead></TableHead>
                </TableRow>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead>
                    <Input
                      value={fNumero}
                      onChange={(e) => setFNumero(e.target.value)}
                      placeholder="filtrar…"
                      className="h-7 text-xs"
                    />
                  </TableHead>
                  <TableHead>
                    <Input
                      value={fCliente}
                      onChange={(e) => setFCliente(e.target.value)}
                      placeholder="filtrar…"
                      className="h-7 text-xs"
                    />
                  </TableHead>
                  <TableHead>
                    <Input
                      value={fCampanha}
                      onChange={(e) => setFCampanha(e.target.value)}
                      placeholder="filtrar…"
                      className="h-7 text-xs"
                    />
                  </TableHead>
                  <TableHead className="text-xs text-muted-foreground">(use Mês/Ano)</TableHead>
                  <TableHead>
                    <div className="flex gap-1">
                      <Input
                        value={fInsMin}
                        onChange={(e) => setFInsMin(e.target.value)}
                        placeholder="min"
                        className="h-7 text-xs"
                        type="number"
                      />
                      <Input
                        value={fInsMax}
                        onChange={(e) => setFInsMax(e.target.value)}
                        placeholder="max"
                        className="h-7 text-xs"
                        type="number"
                      />
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex gap-1">
                      <Input
                        value={fValorMin}
                        onChange={(e) => setFValorMin(e.target.value)}
                        placeholder="R$ min"
                        className="h-7 text-xs"
                        type="number"
                      />
                      <Input
                        value={fValorMax}
                        onChange={(e) => setFValorMax(e.target.value)}
                        placeholder="R$ max"
                        className="h-7 text-xs"
                        type="number"
                      />
                    </div>
                  </TableHead>
                  <TableHead className="text-xs text-muted-foreground">(calc.)</TableHead>
                  <TableHead>
                    <div className="flex gap-1">
                      <Input
                        value={fDescMin}
                        onChange={(e) => setFDescMin(e.target.value)}
                        placeholder="% min"
                        className="h-7 text-xs"
                        type="number"
                      />
                      <Input
                        value={fDescMax}
                        onChange={(e) => setFDescMax(e.target.value)}
                        placeholder="% max"
                        className="h-7 text-xs"
                        type="number"
                      />
                    </div>
                  </TableHead>
                  <TableHead className="text-xs text-muted-foreground">(topo)</TableHead>
                  <TableHead className="text-xs text-muted-foreground">(topo)</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                      Carregando…
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                      Nenhum PI ainda. Clique em "Novo PI" para começar.
                    </TableCell>
                  </TableRow>
                )}
                {grupos.map((g) => (
                  <React.Fragment key={g.tipo}>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableCell colSpan={11} className="py-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="capitalize">
                              {g.tipo}
                            </Badge>
                            <span className="text-sm font-medium">Faturamento {g.tipo}</span>
                            <span className="text-xs text-muted-foreground">
                              · {g.rows.length} PI(s) · {g.insercoes} inserções
                            </span>
                          </div>
                          <span className="text-sm font-semibold">{formatBRL(g.total)}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                    {g.rows.map((p) => (
                      <TableRow
                        key={p.id}
                        className={p.status === "substituido" ? "opacity-60" : undefined}
                      >
                        <TableCell className="font-mono text-sm font-medium">
                          <div>{p.numero}</div>
                          {p.substitui_pi_id && rows.find((r) => r.id === p.substitui_pi_id) && (
                            <button
                              type="button"
                              className="mt-1 text-[10px] text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
                              onClick={() => setHistPi(p)}
                              title="Ver PI substituído"
                            >
                              substitui {rows.find((r) => r.id === p.substitui_pi_id)?.numero}
                            </button>
                          )}
                          {substituidoPor.get(p.id) && (
                            <button
                              type="button"
                              className="mt-1 block text-[10px] text-primary hover:underline"
                              onClick={() => setHistPi(substituidoPor.get(p.id)!)}
                              title="Ir para o PI vigente"
                            >
                              vigente: {substituidoPor.get(p.id)?.numero}
                            </button>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {p.cliente?.nome_fantasia || p.cliente?.razao_social || "—"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {p.agencia?.nome_fantasia || p.agencia?.razao_social || "Direto"}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{p.campanha}</TableCell>
                        <TableCell className="text-sm">
                          {(() => {
                            const ini = p.periodo_inicio
                              ? new Date(p.periodo_inicio + "T00:00:00")
                              : null;
                            const fim = p.periodo_fim
                              ? new Date(p.periodo_fim + "T00:00:00")
                              : null;
                            const sameMonth =
                              ini &&
                              fim &&
                              ini.getMonth() === fim.getMonth() &&
                              ini.getFullYear() === fim.getFullYear();
                            const mm = (d: Date) =>
                              `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
                            const periodoMes =
                              ini && fim
                                ? sameMonth
                                  ? mm(ini)
                                  : `${mm(ini)} → ${mm(fim)}`
                                : `${String(p.mes_veiculacao).padStart(2, "0")}/${p.ano_veiculacao}`;
                            return (
                              <>
                                <div>{periodoMes}</div>
                                {ini && fim && (
                                  <div className="text-[11px] text-muted-foreground whitespace-nowrap">
                                    {ini.toLocaleDateString("pt-BR")} →{" "}
                                    {fim.toLocaleDateString("pt-BR")}
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </TableCell>
                        <TableCell className="text-sm text-right">{p.total_insercoes}</TableCell>
                        {(() => {
                          const tipo = p.faturamento_tipo ?? "bruto";
                          const v = p.valor_negociado || 0;
                          const temAgencia = !!p.agencia_id;
                          const bruto = tipo === "liquido" && temAgencia ? v / 0.8 : v;
                          const liquido = temAgencia ? (tipo === "liquido" ? v : v * 0.8) : bruto;
                          return (
                            <>
                              <TableCell className="text-right font-semibold">
                                {formatBRL(bruto)}
                              </TableCell>
                              <TableCell className="text-right text-sm">
                                {formatBRL(liquido)}
                              </TableCell>
                            </>
                          );
                        })()}
                        <TableCell className="text-right text-xs text-muted-foreground">
                          {p.valor_tabela > 0
                            ? `${((p.valor_desconto / p.valor_tabela) * 100).toFixed(2)}%`
                            : "0%"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {p.faturamento_tipo ?? "bruto"}
                          </Badge>
                        </TableCell>

                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Badge className={STATUS_COLOR[p.status]}>
                              {STATUS_LABEL[p.status] ?? p.status}
                            </Badge>
                            {(() => {
                              let fimStr = p.periodo_fim;
                              if (!fimStr && p.mes_veiculacao && p.ano_veiculacao) {
                                const uDia = new Date(
                                  p.ano_veiculacao,
                                  p.mes_veiculacao,
                                  0,
                                ).getDate();
                                fimStr = `${p.ano_veiculacao}-${String(p.mes_veiculacao).padStart(2, "0")}-${String(uDia).padStart(2, "0")}`;
                              }
                              if (
                                !fimStr ||
                                ["cancelado", "reprovado", "substituido"].includes(p.status)
                              )
                                return null;
                              const du = calcularDiasUteisRestantes(fimStr);
                              if (du <= 10 && du >= -3) {
                                const badgeCls =
                                  du <= 3
                                    ? "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-300 font-bold animate-pulse"
                                    : du <= 6
                                      ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-300 font-bold"
                                      : "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-300 font-medium";
                                return (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRenovarPi(p.id);
                                    }}
                                    className="text-left cursor-pointer"
                                  >
                                    <Badge
                                      variant="outline"
                                      className={`text-[10px] w-fit hover:opacity-85 transition-opacity ${badgeCls}`}
                                      title="Campanha a ≤ 10 dias úteis do término. Clique para iniciar a renovação."
                                    >
                                      ⏰ Renovar:{" "}
                                      {du === 0 ? "HOJE" : du < 0 ? "Vencido" : `${du}d úteis`}
                                    </Badge>
                                  </button>
                                );
                              }
                              return null;
                            })()}
                            {anexosSet.has(p.id) && (
                              <Badge
                                variant="outline"
                                className="bg-sky-100 text-sky-700 text-[10px] w-fit"
                                title="Este PI possui PDF importado/anexado"
                              >
                                PDF anexado
                              </Badge>
                            )}
                            {(() => {
                              const ad = aprovDirMap.get(p.id);
                              if (!ad) return null;
                              const map: Record<string, { label: string; cls: string }> = {
                                pendente: {
                                  label: "Diretoria: pendente",
                                  cls: "bg-amber-100 text-amber-800",
                                },
                                aprovado: {
                                  label: `Diretoria: aceito${ad.aprovador_nome ? ` — ${ad.aprovador_nome}` : ""}`,
                                  cls: "bg-emerald-100 text-emerald-700",
                                },
                                reprovado: {
                                  label: "Diretoria: reprovado",
                                  cls: "bg-destructive/15 text-destructive",
                                },
                              };
                              const info = map[ad.status];
                              if (!info) return null;
                              return (
                                <Badge
                                  variant="outline"
                                  className={`${info.cls} text-[10px] w-fit`}
                                  title={
                                    ad.decidido_em
                                      ? new Date(ad.decidido_em).toLocaleString("pt-BR")
                                      : undefined
                                  }
                                >
                                  {info.label}
                                </Badge>
                              );
                            })()}
                          </div>
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const handleEdit = async () => {
                              try {
                                const full = (await getPi({ data: { id: p.id } })) as any;
                                setPrefill(undefined);
                                setEditing({
                                  ...full,
                                  faturamento_contra: full.faturamento_contra ?? "cliente",
                                  faturamento_tipo: full.faturamento_tipo ?? "bruto",
                                  permuta: full.permuta ?? false,
                                  permuta_uso: full.permuta_uso ?? "empresa",
                                  itens: (full.itens ?? []).map((it: any) => ({
                                    ...it,
                                    mes: it.mes ?? full.mes_veiculacao ?? undefined,
                                    ano: it.ano ?? full.ano_veiculacao ?? undefined,
                                    dias_semana: it.dias_semana ?? [],
                                    dias_mes: it.dias_mes ?? [],
                                    dias_veiculacao: it.dias_veiculacao ?? null,
                                    link_modelo: it.link_modelo ?? null,
                                  })),
                                });
                                setFormOpen(true);
                              } catch (e) {
                                toast.error((e as Error).message);
                              }
                            };

                            const handleRenovar = async () => {
                              try {
                                const full = (await getPi({ data: { id: p.id } })) as any;
                                const baseMes = full.mes_veiculacao ?? new Date().getMonth() + 1;
                                const baseAno = full.ano_veiculacao ?? new Date().getFullYear();
                                const nextMes = (baseMes % 12) + 1;
                                const nextAno = baseAno + (baseMes === 12 ? 1 : 0);
                                setRenovarSource({
                                  full,
                                  initialMes: nextMes,
                                  initialAno: nextAno,
                                });
                              } catch (e) {
                                toast.error("Falha ao carregar dados para renovação");
                              }
                            };

                            const handleVisualizar = async () => {
                              try {
                                const { gerarPdfPi } = await import("@/lib/pi-pdf");
                                const { getEmissoraOrTenantLogoDataUrl } =
                                  await import("@/lib/tenant-logo-pdf");
                                const [full, sigExec, sigCli, sigDir] = await Promise.all([
                                  getPi({ data: { id: p.id } }) as Promise<
                                    Parameters<GerarPdfPi>[0]
                                  >,
                                  getAssinaturaExecutivoDoPi({ data: { pi_id: p.id } }),
                                  getAssinaturaClienteDoPi({ data: { pi_id: p.id } }),
                                  getAssinaturaDiretoriaDoPi({ data: { pi_id: p.id } }),
                                ]);
                                const tenantLogoDataUrl = await getEmissoraOrTenantLogoDataUrl(
                                  (full as any).emissora?.logo_url ?? null,
                                );
                                const piLayout = await loadPiLayoutCached();
                                const url = gerarPdfPi(full, "blob", null, {
                                  assinaturaExecutivoDataUrl: sigExec.dataUrl,
                                  nomeExecutivo: sigExec.nome,
                                  assinaturaCliente: sigCli,
                                  assinaturaDiretoriaDataUrl: sigDir.dataUrl,
                                  nomeDiretoria: sigDir.nome,
                                  tenantLogoDataUrl,
                                  layout: piLayout,
                                }) as unknown as string;
                                setPreviewTitulo(`${p.numero} — ${p.campanha}`);
                                setPreviewUrl(url);
                              } catch (e) {
                                toast.error((e as Error).message);
                              }
                            };

                            const handleDownload = async () => {
                              try {
                                const { gerarPdfPi } = await import("@/lib/pi-pdf");
                                const { getEmissoraOrTenantLogoDataUrl } =
                                  await import("@/lib/tenant-logo-pdf");
                                const [full, sigExec, sigCli, sigDir] = await Promise.all([
                                  getPi({ data: { id: p.id } }) as Promise<
                                    Parameters<GerarPdfPi>[0]
                                  >,
                                  getAssinaturaExecutivoDoPi({ data: { pi_id: p.id } }),
                                  getAssinaturaClienteDoPi({ data: { pi_id: p.id } }),
                                  getAssinaturaDiretoriaDoPi({ data: { pi_id: p.id } }),
                                ]);
                                const tenantLogoDataUrl = await getEmissoraOrTenantLogoDataUrl(
                                  (full as any).emissora?.logo_url ?? null,
                                );
                                const piLayout = await loadPiLayoutCached();
                                gerarPdfPi(full, "download", null, {
                                  assinaturaExecutivoDataUrl: sigExec.dataUrl,
                                  nomeExecutivo: sigExec.nome,
                                  assinaturaCliente: sigCli,
                                  assinaturaDiretoriaDataUrl: sigDir.dataUrl,
                                  nomeDiretoria: sigDir.nome,
                                  tenantLogoDataUrl,
                                  layout: piLayout,
                                });
                              } catch (e) {
                                toast.error((e as Error).message);
                              }
                            };

                            const handleExcel = async () => {
                              try {
                                const { exportarPiExcel } = await import("@/lib/pi-excel");
                                const full = (await getPi({ data: { id: p.id } })) as Parameters<
                                  typeof exportarPiExcel
                                >[0];
                                exportarPiExcel(full);
                              } catch (e) {
                                toast.error((e as Error).message);
                              }
                            };

                            const handleLinkAssinar = async () => {
                              try {
                                const { token } = await criarLinkAssinaturaCliente({
                                  data: { pi_id: p.id },
                                });
                                const url = `${window.location.origin}/assinar/${token}`;
                                setLinkAssinatura({ pi: p, url });
                              } catch (e) {
                                toast.error((e as Error).message);
                              }
                            };

                            const handleEnviarDiretoriaWhats = async () => {
                              try {
                                if (p.status === "rascunho" || p.status === "reprovado") {
                                  await enviarPiParaAprovacao({ data: { id: p.id } });
                                  qc.invalidateQueries({ queryKey: ["pis"] });
                                }
                                const { uploadPdfSigned } = await import("@/lib/whatsapp-share");
                                const { gerarPdfPi } = await import("@/lib/pi-pdf");
                                const { getEmissoraOrTenantLogoDataUrl } =
                                  await import("@/lib/tenant-logo-pdf");
                                const [full, sigExec, sigCli, sigDir] = await Promise.all([
                                  getPi({ data: { id: p.id } }) as Promise<
                                    Parameters<GerarPdfPi>[0]
                                  >,
                                  getAssinaturaExecutivoDoPi({ data: { pi_id: p.id } }),
                                  getAssinaturaClienteDoPi({ data: { pi_id: p.id } }),
                                  getAssinaturaDiretoriaDoPi({ data: { pi_id: p.id } }),
                                ]);
                                const tenantLogoDataUrl = await getEmissoraOrTenantLogoDataUrl(
                                  (full as any).emissora?.logo_url ?? null,
                                );
                                const piLayout = await loadPiLayoutCached();
                                const pdfObjUrl = gerarPdfPi(full, "blob", null, {
                                  assinaturaExecutivoDataUrl: sigExec.dataUrl,
                                  nomeExecutivo: sigExec.nome,
                                  assinaturaCliente: sigCli,
                                  assinaturaDiretoriaDataUrl: sigDir.dataUrl,
                                  nomeDiretoria: sigDir.nome,
                                  tenantLogoDataUrl,
                                  layout: piLayout,
                                }) as unknown as string;
                                const blob = await fetch(pdfObjUrl).then((r) => r.blob());
                                const pdfUrl = await uploadPdfSigned(
                                  "pi-anexos",
                                  p.id,
                                  `PI-${p.numero}.pdf`,
                                  blob,
                                );
                                const { criarLinkAprovacaoDiretoria } =
                                  await import("@/lib/aprovacao-diretoria.functions");
                                const { token: aprovToken } = await criarLinkAprovacaoDiretoria({
                                  data: { pi_id: p.id },
                                });
                                const linkAprovar = `${window.location.origin}/aprovar-diretoria/${aprovToken}`;
                                const phone = window.prompt(
                                  "Telefone da Diretoria (com DDD; DDI 55 será adicionado automaticamente):",
                                  "",
                                );
                                if (phone === null) return;
                                const msgPadrao = `Olá! Solicito a aprovação do PI ${p.numero}${p.campanha ? ` — ${p.campanha}` : ""}.\n\n📄 PDF do PI: ${pdfUrl}\n✅ Aprovar e assinar (link exclusivo): ${linkAprovar}`;
                                const msg = window.prompt(
                                  "Personalize a mensagem para a Diretoria:",
                                  msgPadrao,
                                );
                                if (msg === null) return;
                                setWhatsQr({
                                  phone,
                                  message: msg,
                                  title: `Enviar PI ${p.numero} para Diretoria`,
                                });
                                toast.success("QR/Link pronto para a Diretoria");
                              } catch (e) {
                                toast.error((e as Error).message);
                              }
                            };

                            const handleCopiarLinkDiretoria = async () => {
                              try {
                                if (p.status === "rascunho" || p.status === "reprovado") {
                                  await enviarPiParaAprovacao({ data: { id: p.id } });
                                  qc.invalidateQueries({ queryKey: ["pis"] });
                                }
                                const { criarLinkAprovacaoDiretoria } =
                                  await import("@/lib/aprovacao-diretoria.functions");
                                const { token: aprovToken } = await criarLinkAprovacaoDiretoria({
                                  data: { pi_id: p.id },
                                });
                                const url = `${window.location.origin}/aprovar-diretoria/${aprovToken}`;
                                try {
                                  await navigator.clipboard.writeText(url);
                                  toast.success("Link copiado para enviar à Diretoria");
                                } catch {
                                  window.prompt("Copie o link abaixo:", url);
                                }
                              } catch (e) {
                                toast.error((e as Error).message);
                              }
                            };

                            const handleGerarProposta = async () => {
                              try {
                                const res = await gerarPropostaDoPi({ data: { pi_id: p.id } });
                                toast.success(`Proposta ${res.numero} criada como rascunho`);
                                navigate({ to: "/propostas" });
                              } catch (e) {
                                toast.error((e as Error).message);
                              }
                            };

                            const canCancel = !["cancelado", "substituido"].includes(p.status);

                            return (
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  title="Editar"
                                  onClick={handleEdit}
                                >
                                  <Pencil className="size-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  title="Visualizar PI"
                                  onClick={handleVisualizar}
                                >
                                  <Eye className="size-4" />
                                </Button>
                                {p.status === "rascunho" && (
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    title="Enviar para aprovação"
                                    onClick={() => sendMut.mutate(p)}
                                  >
                                    <Send className="size-4" />
                                  </Button>
                                )}
                                {p.status === "reprovado" && (
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    title="Reenviar para aprovação"
                                    onClick={() => sendMut.mutate(p)}
                                  >
                                    <Send className="size-4" />
                                  </Button>
                                )}
                                {isAdmin && p.status === "aguardando_aprovacao" && (
                                  <>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      title="Aprovar"
                                      onClick={() => approveMut.mutate(p)}
                                    >
                                      <Check className="size-4 text-success" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      title="Reprovar"
                                      onClick={() => setReprovaPi(p)}
                                    >
                                      <X className="size-4 text-destructive" />
                                    </Button>
                                  </>
                                )}
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button size="icon" variant="ghost" title="Mais ações">
                                      <MoreHorizontal className="size-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-56">
                                    <DropdownMenuLabel>Ações do PI</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={handleDownload}>
                                      <FileDown className="size-4 mr-2" /> Baixar PDF
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleExcel}>
                                      <FileSpreadsheet className="size-4 mr-2" /> Exportar Excel
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleLinkAssinar}>
                                      <PenLine className="size-4 mr-2" /> Link de assinatura
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={handleEnviarDiretoriaWhats}
                                      className="text-green-700 focus:text-green-700"
                                    >
                                      <Send className="size-4 mr-2" /> Enviar à Diretoria (WhatsApp)
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleCopiarLinkDiretoria}>
                                      <PenLine className="size-4 mr-2" /> Copiar link de aprovação
                                      da Diretoria
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleRenovar}>
                                      <RefreshCw className="size-4 mr-2" /> Renovar contrato (novo
                                      PI)
                                    </DropdownMenuItem>

                                    <DropdownMenuItem onClick={handleEdit}>
                                      <Pencil className="size-4 mr-2" /> Gerar CS (Carta de
                                      Substituição)
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleGerarProposta}>
                                      <FileText className="size-4 mr-2" /> Gerar proposta deste PI
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() =>
                                        setRateioPi({
                                          id: p.id,
                                          numero: p.numero,
                                          campanha: p.campanha,
                                          valor_negociado: p.valor_negociado,
                                        })
                                      }
                                      className="text-primary font-medium"
                                    >
                                      <Handshake className="size-4 mr-2" /> Rateio de Parceiros
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() =>
                                        setComprovantesPi({
                                          id: p.id,
                                          numero: p.numero,
                                          campanha: p.campanha,
                                        })
                                      }
                                    >
                                      <FileCheck2 className="size-4 mr-2 text-blue-600" /> Comprovantes de Execução
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => handleBaixarPrestacaoContas(p)}
                                      className="text-emerald-700"
                                    >
                                      <FileText className="size-4 mr-2" /> Prestação de Contas (PDF)
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => setPosVendaPi(p)}
                                      className="text-emerald-700 focus:text-emerald-700"
                                    >
                                      <SparklesIcon className="size-4 mr-2" /> Comprovação de
                                      pós-venda
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />

                                    <DropdownMenuItem onClick={() => setHistPi(p)}>
                                      <HistoryIcon className="size-4 mr-2" /> Histórico
                                    </DropdownMenuItem>
                                    {canCancel && (
                                      <DropdownMenuItem
                                        onClick={() => setCancelPi(p)}
                                        className="text-destructive focus:text-destructive"
                                      >
                                        <Ban className="size-4 mr-2" /> Cancelar / Substituir
                                      </DropdownMenuItem>
                                    )}
                                    {isAdmin && (
                                      <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                          className="text-destructive focus:text-destructive"
                                          onClick={() => {
                                            if (
                                              window.confirm(
                                                `Tem certeza que deseja excluir permanentemente o PI ${p.numero}?`,
                                              )
                                            ) {
                                              deleteMut.mutate(p);
                                            }
                                          }}
                                        >
                                          <Trash2 className="size-4 mr-2" /> Excluir
                                        </DropdownMenuItem>
                                      </>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            );
                          })()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
        </>
      )}

      <PiFormDialog
        key={editing?.id ?? (renovadoDeId ? `renovar-${renovadoDeId}` : "novo")}
        open={formOpen}
        onOpenChange={(v) => {
          setFormOpen(v);
          if (!v) {
            setEditing(null);
            setPrefill(undefined);
            setRenovadoDeId(null);
          }
        }}
        initial={renovadoDeId ? prefill : (editing ?? prefill)}
        renovadoDeId={renovadoDeId}
      />
      <ImportarPiPdfDialog
        open={pdfOpen}
        onOpenChange={setPdfOpen}
        onExtracted={async (d: PiExtraido) => {
          const now = new Date();
          setEditing(null);
          let cliente_id: string | null = null;
          let agencia_id: string | null = null;
          let resumoCadastro = "";
          try {
            const r = await resolverEntidadesPi({
              data: { cliente: d.cliente ?? null, agencia: d.agencia ?? null },
            });
            cliente_id = r.cliente_id;
            agencia_id = r.agencia_id;
            if (r.cliente_criado && r.cliente_nome) {
              toast.success(`Cliente cadastrado: ${r.cliente_nome}`);
              resumoCadastro += `Cliente cadastrado automaticamente: ${r.cliente_nome}\n`;
            } else if (r.cliente_id && r.cliente_nome) {
              toast.info(`Cliente vinculado: ${r.cliente_nome}`);
            }
            if (r.agencia_criada && r.agencia_nome) {
              toast.success(`Agência cadastrada: ${r.agencia_nome}`);
              resumoCadastro += `Agência cadastrada automaticamente: ${r.agencia_nome}\n`;
            } else if (r.agencia_id && r.agencia_nome) {
              toast.info(`Agência vinculada: ${r.agencia_nome}`);
            }
            qc.invalidateQueries({ queryKey: ["clientes"] });
            qc.invalidateQueries({ queryKey: ["agencias"] });
          } catch (e) {
            toast.warning(`Não foi possível resolver cliente/agência: ${(e as Error).message}`);
          }
          const itensPrefill = (d.itens ?? []).map((it) => {
            const insercoes_dia = Math.max(1, Number(it.insercoes_dia ?? 1) || 1);
            const total_insercoes = Number(it.total_insercoes ?? 0) || 0;
            const valor_unit = Number(it.valor_unit ?? 0) || 0;
            const valor_tabela = Number(it.valor_tabela ?? valor_unit) || valor_unit;
            const desconto = Number(it.desconto ?? 0) || 0;
            const valor_negociado = Number(it.valor_negociado ?? 0) || valor_unit * total_insercoes;
            return {
              tipo: String(it.tipo ?? "VT"),
              programa: it.programa ?? null,
              horario: it.horario ?? null,
              formato: it.formato ?? null,
              insercoes_dia,
              dias_semana: Array.isArray(it.dias_semana) ? it.dias_semana : [],
              dias_mes: Array.isArray(it.dias_mes) ? it.dias_mes : [],
              desconto,
              valor_unit,
              valor_tabela,
              valor_negociado,
              total_insercoes,
            };
          });
          if (itensPrefill.length) {
            toast.success(`${itensPrefill.length} item(ns) de programação importado(s)`);
          }

          // Faturamento — usa o que a IA extraiu; cai num default coerente se vier nulo
          const fatContraExtraido =
            d.faturamento_contra ?? (agencia_id ? "agencia" : cliente_id ? "cliente" : null);
          const fatTipoExtraido = d.faturamento_tipo ?? (agencia_id ? "liquido" : "bruto");

          // Datas — se IA der prazo em dias e tiver data de faturamento, calcula vencimento
          let dataVenc = d.data_vencimento_nota ?? null;
          if (!dataVenc && d.data_faturamento && d.prazo_pagamento_dias) {
            const base = new Date(d.data_faturamento + "T00:00:00");
            base.setDate(base.getDate() + d.prazo_pagamento_dias);
            dataVenc = base.toISOString().slice(0, 10);
          }

          // Valor manual — se a IA extraiu um valor explícito (bruto/líquido conforme tipo)
          // e for diferente do que os itens somam, oferece como override.
          const somaItens = itensPrefill.reduce((a, b) => a + (b.valor_negociado || 0), 0);
          const valorIaBruto = d.valor_bruto ?? null;
          const valorIaLiquido = d.valor_liquido ?? null;
          const valorIa =
            fatTipoExtraido === "liquido"
              ? (valorIaLiquido ?? (valorIaBruto != null ? +(valorIaBruto * 0.8).toFixed(2) : null))
              : (valorIaBruto ?? d.valor_negociado ?? null);
          const valorManual =
            valorIa != null && Math.abs(valorIa - somaItens) > 0.5 ? valorIa : null;

          if (d.data_faturamento) toast.info(`Data de faturamento: ${d.data_faturamento}`);
          if (dataVenc) toast.info(`Vencimento: ${dataVenc}`);

          setPrefill({
            cliente_id,
            agencia_id,
            campanha: d.campanha ?? "",
            mes_veiculacao: d.mes_veiculacao ?? now.getMonth() + 1,
            ano_veiculacao: d.ano_veiculacao ?? now.getFullYear(),
            permuta: !!d.permuta,
            permuta_uso: d.permuta ? "empresa" : null,
            faturamento_contra: fatContraExtraido,
            faturamento_tipo: fatTipoExtraido,
            data_faturamento: d.data_faturamento ?? null,
            data_envio_nota: d.data_envio_nota ?? null,
            data_vencimento_nota: dataVenc,
            valor_manual: valorManual,
            itens: itensPrefill.length ? itensPrefill : undefined,
            observacao: [
              resumoCadastro.trim() || null,
              d.observacao,
              valorIaBruto != null
                ? `Valor bruto extraído: R$ ${valorIaBruto.toLocaleString("pt-BR")}`
                : null,
              valorIaLiquido != null
                ? `Valor líquido extraído: R$ ${valorIaLiquido.toLocaleString("pt-BR")}`
                : null,
              d.prazo_pagamento_dias ? `Prazo de pagamento: ${d.prazo_pagamento_dias} dias` : null,
              d.periodo_inicio && d.periodo_fim
                ? `Período: ${d.periodo_inicio} a ${d.periodo_fim}`
                : null,
            ]
              .filter(Boolean)
              .join("\n"),
          });
          setFormOpen(true);
        }}
      />

      <CancelarPiDialog
        piId={cancelPi?.id ?? null}
        numero={cancelPi?.numero ?? ""}
        open={!!cancelPi}
        onOpenChange={(v) => !v && setCancelPi(null)}
      />
      <HistoricoDialog
        pi={histPi}
        onClose={() => setHistPi(null)}
        onRenovarPi={async (piId) => {
          try {
            const full = (await getPi({ data: { id: piId } })) as any;
            const baseMes = full.mes_veiculacao ?? new Date().getMonth() + 1;
            const baseAno = full.ano_veiculacao ?? new Date().getFullYear();
            const nextMes = (baseMes % 12) + 1;
            const nextAno = baseAno + (baseMes === 12 ? 1 : 0);
            setRenovarSource({ full, initialMes: nextMes, initialAno: nextAno });
            setHistPi(null);
          } catch (e) {
            toast.error("Falha ao carregar dados para renovação");
          }
        }}
        onUsarComoModelo={async (piId) => {
          try {
            const full = (await getPi({ data: { id: piId } })) as any;
            const now = new Date();
            const nowMes = now.getMonth() + 1;
            const nowAno = now.getFullYear();
            const baseMes = full.mes_veiculacao ?? nowMes;
            const baseAno = full.ano_veiculacao ?? nowAno;
            const shift = nowAno * 12 + (nowMes - 1) - (baseAno * 12 + (baseMes - 1));
            const shiftItem = (m?: number | null, a?: number | null) => {
              if (!m || !a) return { mes: nowMes, ano: nowAno };
              const idx = a * 12 + (m - 1) + shift;
              return { mes: (idx % 12) + 1, ano: Math.floor(idx / 12) };
            };
            setHistPi(null);
            setRenovadoDeId(null);
            setEditing(null);
            setPrefill({
              cliente_id: full.cliente_id,
              agencia_id: full.agencia_id,
              campanha: full.campanha,
              mes_veiculacao: nowMes,
              ano_veiculacao: nowAno,
              observacao: `Baseado no PI ${full.numero} (modelo para CS)${full.observacao ? "\n" + full.observacao : ""}`,
              faturamento_contra: full.faturamento_contra ?? "cliente",
              faturamento_tipo: full.faturamento_tipo ?? "bruto",
              permuta: full.permuta ?? false,
              permuta_uso: full.permuta_uso ?? "empresa",
              executivo_id: full.executivo_id ?? null,
              emissora_id: full.emissora_id ?? null,
              itens: (full.itens ?? []).map((it: any) => {
                const sh = shiftItem(it.mes, it.ano);
                return {
                  tipo: it.tipo,
                  programa: it.programa,
                  horario: it.horario ?? null,
                  formato: it.formato,
                  insercoes_dia: it.insercoes_dia,
                  dias_semana: it.dias_semana ?? [],
                  dias_mes: it.dias_mes ?? [],
                  desconto: it.desconto,
                  valor_unit: it.valor_unit,
                  valor_tabela: it.valor_tabela,
                  valor_negociado: it.valor_negociado,
                  total_insercoes: it.total_insercoes,
                  mes: sh.mes,
                  ano: sh.ano,
                };
              }),
            });
            setFormOpen(true);
            toast.info(`Usando PI ${full.numero} como modelo — ajuste os itens e salve`);
          } catch (e) {
            toast.error("Falha ao carregar PI modelo");
          }
        }}
        onReutilizarPi={async (piId) => {
          try {
            const full = (await getPi({ data: { id: piId } })) as any;
            setHistPi(null);
            setEditing(null);
            setRenovadoDeId(null);
            setPrefill({
              cliente_id: full.cliente_id,
              agencia_id: full.agencia_id,
              campanha: full.campanha,
              mes_veiculacao: full.mes_veiculacao ?? new Date().getMonth() + 1,
              ano_veiculacao: full.ano_veiculacao ?? new Date().getFullYear(),
              observacao: full.observacao ?? "",
              faturamento_contra: full.faturamento_contra ?? "cliente",
              faturamento_tipo: full.faturamento_tipo ?? "bruto",
              permuta: full.permuta ?? false,
              permuta_uso: full.permuta_uso ?? "empresa",
              executivo_id: full.executivo_id ?? null,
              emissora_id: full.emissora_id ?? null,
              itens: (full.itens ?? []).map((it: any) => ({
                tipo: it.tipo,
                programa: it.programa,
                horario: it.horario ?? null,
                formato: it.formato,
                insercoes_dia: it.insercoes_dia,
                dias_semana: it.dias_semana ?? [],
                dias_mes: it.dias_mes ?? [],
                desconto: it.desconto,
                valor_unit: it.valor_unit,
                valor_tabela: it.valor_tabela,
                valor_negociado: it.valor_negociado,
                total_insercoes: it.total_insercoes,
                mes: it.mes ?? full.mes_veiculacao,
                ano: it.ano ?? full.ano_veiculacao,
              })),
            });
            setFormOpen(true);
            toast.info(`Reutilizando PI ${full.numero} — resgatado por completo`);
          } catch (e) {
            toast.error("Falha ao reutilizar PI");
          }
        }}
        onVisualizarPi={async (piId) => {
          try {
            const { gerarPdfPi } = await import("@/lib/pi-pdf");
            const { getEmissoraOrTenantLogoDataUrl } = await import("@/lib/tenant-logo-pdf");
            const [full, sigExec, sigCli, sigDir] = await Promise.all([
              getPi({ data: { id: piId } }) as Promise<Parameters<GerarPdfPi>[0]>,
              getAssinaturaExecutivoDoPi({ data: { pi_id: piId } }),
              getAssinaturaClienteDoPi({ data: { pi_id: piId } }),
              getAssinaturaDiretoriaDoPi({ data: { pi_id: piId } }),
            ]);
            const tenantLogoDataUrl = await getEmissoraOrTenantLogoDataUrl(
              (full as any).emissora?.logo_url ?? null,
            );
            const piLayout = await loadPiLayoutCached();
            const url = gerarPdfPi(full, "blob", null, {
              assinaturaExecutivoDataUrl: sigExec.dataUrl,
              nomeExecutivo: sigExec.nome,
              assinaturaCliente: sigCli,
              assinaturaDiretoriaDataUrl: sigDir.dataUrl,
              nomeDiretoria: sigDir.nome,
              tenantLogoDataUrl,
              layout: piLayout,
            }) as unknown as string;
            setPreviewTitulo(`${(full as any).numero} — ${(full as any).campanha}`);
            setPreviewUrl(url);
          } catch (e) {
            toast.error((e as Error).message);
          }
        }}
      />
      <RenovacaoPreviewDialog
        source={renovarSource}
        onCancel={() => setRenovarSource(null)}
        onConfirm={(targetMes, targetAno) => {
          if (!renovarSource) return;
          const prefill = buildRenovacaoPrefill(renovarSource.full, targetMes, targetAno);
          setEditing(null);
          setRenovadoDeId(renovarSource.full.id);
          setPrefill(prefill as any);
          setFormOpen(true);
          toast.info(
            `Renovando contrato — novo PI para ${String(targetMes).padStart(2, "0")}/${targetAno}`,
          );
          setRenovarSource(null);
        }}
      />

      <PosVendaDialog pi={posVendaPi as any} onClose={() => setPosVendaPi(null)} />

      {rateioPi && (
        <CampanhaRateioDialog pi={rateioPi} onClose={() => setRateioPi(null)} />
      )}

      {comprovantesPi && (
        <ComprovantesExecucaoDialog pi={comprovantesPi} onClose={() => setComprovantesPi(null)} />
      )}

      <ReprovarPiDialog
        pi={reprovaPi}
        onClose={() => setReprovaPi(null)}
        onConfirm={(motivo) => {
          if (!reprovaPi) return;
          reprovarPi({ data: { id: reprovaPi.id, motivo } })
            .then(() => {
              toast.success("PI reprovado");
              qc.invalidateQueries({ queryKey: ["pis"] });
              setReprovaPi(null);
            })
            .catch((e: Error) => toast.error(e.message));
        }}
      />
      <Dialog
        open={!!previewUrl}
        onOpenChange={(v) => {
          if (!v) {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
            setPreviewUrl(null);
          }
        }}
      >
        <DialogContent className="max-w-6xl w-[95vw] h-[90vh] p-0 flex flex-col">
          <DialogHeader className="px-4 py-3 border-b">
            <DialogTitle className="text-base">Visualizar PI — {previewTitulo}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0">
            {previewUrl && (
              <iframe src={previewUrl} title="PI PDF" className="w-full h-full border-0" />
            )}
          </div>
          <DialogFooter className="px-4 py-2 border-t">
            {previewUrl && (
              <a
                href={previewUrl}
                download={`${previewTitulo}.pdf`}
                className="text-sm text-primary underline"
              >
                Baixar PDF
              </a>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!linkAssinatura} onOpenChange={(v) => !v && setLinkAssinatura(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link de assinatura — {linkAssinatura?.pi.numero}</DialogTitle>
            <DialogDescription>
              Envie este link ao cliente. Ele poderá conferir o PI e assinar eletronicamente
              (registramos nome, CPF, IP e data/hora — validade jurídica nos termos da MP 2.200-2).
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Input
              readOnly
              value={linkAssinatura?.url ?? ""}
              onFocus={(e) => e.currentTarget.select()}
            />
            <Button
              variant="outline"
              onClick={() => {
                if (linkAssinatura) {
                  navigator.clipboard.writeText(linkAssinatura.url);
                  toast.success("Link copiado");
                }
              }}
            >
              <Copy className="size-4" />
            </Button>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setLinkAssinatura(null)}>
              Fechar
            </Button>
            {linkAssinatura && (
              <Button
                className="bg-green-600 hover:bg-green-700 text-white"
                disabled={whatsLoading}
                onClick={async () => {
                  if (!linkAssinatura) return;
                  const { pi, url } = linkAssinatura;
                  setWhatsLoading(true);
                  try {
                    const { uploadPdfSigned } = await import("@/lib/whatsapp-share");
                    const { gerarPdfPi } = await import("@/lib/pi-pdf");
                    const { getEmissoraOrTenantLogoDataUrl } =
                      await import("@/lib/tenant-logo-pdf");
                    const [full, sigExec, sigCli, sigDir] = await Promise.all([
                      getPi({ data: { id: pi.id } }) as Promise<Parameters<GerarPdfPi>[0]>,
                      getAssinaturaExecutivoDoPi({ data: { pi_id: pi.id } }),
                      getAssinaturaClienteDoPi({ data: { pi_id: pi.id } }),
                      getAssinaturaDiretoriaDoPi({ data: { pi_id: pi.id } }),
                    ]);
                    const tenantLogoDataUrl = await getEmissoraOrTenantLogoDataUrl(
                      (full as any).emissora?.logo_url ?? null,
                    );
                    const piLayout = await loadPiLayoutCached();
                    const pdfObjUrl = gerarPdfPi(full, "blob", null, {
                      assinaturaExecutivoDataUrl: sigExec.dataUrl,
                      nomeExecutivo: sigExec.nome,
                      assinaturaCliente: sigCli,
                      assinaturaDiretoriaDataUrl: sigDir.dataUrl,
                      nomeDiretoria: sigDir.nome,
                      tenantLogoDataUrl,
                      layout: piLayout,
                    }) as unknown as string;
                    const blob = await fetch(pdfObjUrl).then((r) => r.blob());
                    const pdfUrl = await uploadPdfSigned(
                      "pi-anexos",
                      pi.id,
                      `PI-${pi.numero}.pdf`,
                      blob,
                    );
                    const cli: any = (pi as any).cliente || (pi as any).agencia || {};
                    const phoneSugerido = cli.telefone || cli.contato_telefone || "";
                    const phone = window.prompt(
                      "Telefone do destinatário (com DDD; DDI 55 será adicionado automaticamente):",
                      phoneSugerido,
                    );
                    if (phone === null) return;
                    const msgPadrao = `Olá! Segue o PI ${pi.numero}${(pi as any).campanha ? ` — ${(pi as any).campanha}` : ""}.\n\n📄 PDF do PI: ${pdfUrl}\n✍️ Link de assinatura: ${url}`;
                    const msg = window.prompt("Personalize a mensagem do WhatsApp:", msgPadrao);
                    if (msg === null) return;
                    setWhatsQr({ phone, message: msg, title: `Enviar PI ${pi.numero} ao cliente` });
                    toast.success("QR/Link pronto para envio");
                  } catch (e) {
                    toast.error("Erro ao preparar envio: " + (e as Error).message);
                  } finally {
                    setWhatsLoading(false);
                  }
                }}
              >
                {whatsLoading ? "Preparando…" : "Enviar PI + link por WhatsApp"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <WhatsappQrDialog
        open={!!whatsQr}
        onOpenChange={(v) => {
          if (!v) setWhatsQr(null);
        }}
        phone={whatsQr?.phone ?? ""}
        message={whatsQr?.message ?? ""}
        title={whatsQr?.title}
      />
    </AppShell>
  );
}

function HistoricoDialog({
  pi,
  onClose,
  onRenovarPi,
  onUsarComoModelo,
  onReutilizarPi,
  onVisualizarPi,
}: {
  pi: PiRow | null;
  onClose: () => void;
  onRenovarPi?: (piId: string) => void;
  onUsarComoModelo?: (piId: string) => void;
  onReutilizarPi?: (piId: string) => void;
  onVisualizarPi?: (piId: string) => void;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["pi-historico", pi?.id],
    queryFn: () => getPi({ data: { id: pi!.id } }),
    enabled: !!pi,
  });

  const { data: histCliente = [], isLoading: loadingCliente } = useQuery({
    queryKey: ["pi-historico-cliente", pi?.cliente_id],
    queryFn: () => listHistoricoCliente({ data: { cliente_id: pi!.cliente_id! } }),
    enabled: !!pi && !!pi.cliente_id,
  });

  const [compararCom, setCompararCom] = useState<string | null>(null);

  type HistRow = {
    id: string;
    acao: string;
    created_at: string;
    detalhes?: Record<string, unknown> | null;
    pi_id?: string | null;
    pi?: { numero: string; campanha: string; status: string; valor_negociado: number };
  };

  const historicoPi = ((data as { historico?: HistRow[] } | undefined)?.historico ?? [])
    .slice()
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

  const historicoCompleto = (histCliente as HistRow[])
    .slice()
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

  const fmt = (s: string) =>
    new Date(s).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

  const formatBRL = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

  // Chaves de detalhes que referenciam outro PI (numero) → clicáveis para comparar.
  const PI_REF_KEYS = new Set(["substitui", "novo_pi", "substituido_por", "pi_anterior"]);

  const renderDetalhes = (h: HistRow) => {
    const d = h.detalhes;
    return (
      <div className="mt-1 space-y-1">
        {h.pi && h.pi.numero !== pi?.numero && (
          <div className="text-[11px] font-semibold text-primary">
            Ref: PI {h.pi.numero} — {h.pi.campanha} ({formatBRL(h.pi.valor_negociado)})
          </div>
        )}
        {d && Object.keys(d).length > 0 && (
          <ul className="space-y-0.5 text-xs text-muted-foreground">
            {Object.entries(d).map(([k, v]) => {
              const isPiRef = PI_REF_KEYS.has(k) && typeof v === "string" && v.length > 0;
              return (
                <li key={k}>
                  <span className="font-medium">{k}:</span>{" "}
                  {isPiRef ? (
                    <button
                      type="button"
                      className="text-primary underline underline-offset-2 hover:opacity-80"
                      onClick={() => setCompararCom(v as string)}
                      title="Ver mudanças em relação a este PI"
                    >
                      {String(v)}
                    </button>
                  ) : (
                    String(v)
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
  };

  return (
    <Dialog open={!!pi} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Histórico do Cliente</span>
            <Badge variant="outline" className="text-xs font-mono">
              {pi?.numero}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Exibindo todos os eventos relacionados a este cliente (
            {pi?.cliente?.nome_fantasia || pi?.cliente?.razao_social})
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[65vh] overflow-y-auto py-2 pr-2">
          {isLoading || loadingCliente ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
              <HistoryIcon className="size-8 animate-spin" />
              <p className="text-sm">Carregando histórico completo…</p>
            </div>
          ) : historicoCompleto.length === 0 ? (
            <p className="text-sm text-center py-8 text-muted-foreground">
              Nenhum evento registrado para este cliente.
            </p>
          ) : (
            <div className="space-y-6">
              <ol className="relative space-y-4 border-l ml-3 pl-6">
                {historicoCompleto.map((h) => {
                  const isCurrentPi = h.pi?.numero === pi?.numero;
                  const podeReaproveitar =
                    !!h.pi_id && (h.pi?.status === "cancelado" || h.pi?.status === "substituido");
                  return (
                    <li key={h.id} className="relative">
                      <span
                        className={`absolute -left-[30px] top-1.5 size-4 rounded-full border-2 border-background flex items-center justify-center ${isCurrentPi ? "bg-primary" : "bg-muted"}`}
                      >
                        <div
                          className={`size-1.5 rounded-full ${isCurrentPi ? "bg-white" : "bg-muted-foreground"}`}
                        />
                      </span>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <div className="text-sm font-semibold flex items-center gap-2">
                          {h.acao}
                          {isCurrentPi && (
                            <Badge className="text-[9px] h-3.5 px-1 bg-primary/10 text-primary border-none">
                              PI ATUAL
                            </Badge>
                          )}
                        </div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Calendar className="size-3" /> {fmt(h.created_at)}
                        </div>
                      </div>
                      {renderDetalhes(h)}
                      {h.pi_id &&
                        (onRenovarPi || onUsarComoModelo || onReutilizarPi || onVisualizarPi) && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {onVisualizarPi && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() => onVisualizarPi(h.pi_id!)}
                              >
                                <Eye className="size-3 mr-1" /> Visualizar PDF
                              </Button>
                            )}
                            {onReutilizarPi && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs border-primary/40 text-primary hover:bg-primary/10"
                                onClick={() => onReutilizarPi(h.pi_id!)}
                              >
                                <RotateCcw className="size-3 mr-1" /> Reutilizar PI (resgatar)
                              </Button>
                            )}
                            {podeReaproveitar && onRenovarPi && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() => onRenovarPi(h.pi_id!)}
                              >
                                <RefreshCw className="size-3 mr-1" /> Renovar este PI
                              </Button>
                            )}
                            {podeReaproveitar && onUsarComoModelo && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() => onUsarComoModelo(h.pi_id!)}
                              >
                                <Copy className="size-3 mr-1" /> Usar como modelo (CS) com inserções
                              </Button>
                            )}
                          </div>
                        )}
                    </li>
                  );
                })}
              </ol>
            </div>
          )}
        </div>
        <CompararPisDialog
          numeroAtual={pi?.numero ?? null}
          numeroOutro={compararCom}
          onClose={() => setCompararCom(null)}
        />
      </DialogContent>
    </Dialog>
  );
}

function formatDiffVal(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "number") {
    // heurística: campos monetários costumam ter casas decimais; mostra como número
    return v.toLocaleString("pt-BR");
  }
  return String(v);
}

function CompararPisDialog({
  numeroAtual,
  numeroOutro,
  onClose,
}: {
  numeroAtual: string | null;
  numeroOutro: string | null;
  onClose: () => void;
}) {
  const open = !!numeroAtual && !!numeroOutro;
  const { data, isLoading, error } = useQuery({
    queryKey: ["pi-comparar", numeroAtual, numeroOutro],
    queryFn: () => compararPis({ data: { numeroA: numeroOutro!, numeroB: numeroAtual! } }),
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Mudanças: {numeroOutro} → {numeroAtual}
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto py-2">
          {isLoading && <p className="text-sm text-muted-foreground">Comparando…</p>}
          {error && <p className="text-sm text-destructive">{(error as Error).message}</p>}
          {data && data.diffs.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhuma diferença relevante encontrada.</p>
          )}
          {data && data.diffs.length > 0 && (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campo</TableHead>
                    <TableHead>De ({data.a.numero})</TableHead>
                    <TableHead>Para ({data.b.numero})</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.diffs.map((d, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium text-sm">{d.campo}</TableCell>
                      <TableCell className="text-sm text-muted-foreground line-through">
                        {formatDiffVal(d.de)}
                      </TableCell>
                      <TableCell className="text-sm">{formatDiffVal(d.para)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReprovarPiDialog({
  pi,
  onClose,
  onConfirm,
}: {
  pi: PiRow | null;
  onClose: () => void;
  onConfirm: (motivo: string) => void;
}) {
  const [motivo, setMotivo] = useState("");
  React.useEffect(() => {
    if (!pi) setMotivo("");
  }, [pi]);
  return (
    <Dialog open={!!pi} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reprovar PI {pi?.numero}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <p className="text-sm text-muted-foreground">
            Informe o motivo da reprovação. O executivo será notificado.
          </p>
          <Textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Motivo da reprovação…"
            rows={4}
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            disabled={!motivo.trim()}
            onClick={() => onConfirm(motivo.trim())}
          >
            Reprovar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RenovacaoPreviewDialog({
  source,
  onCancel,
  onConfirm,
}: {
  source: { full: any; initialMes: number; initialAno: number } | null;
  onCancel: () => void;
  onConfirm: (mes: number, ano: number) => void;
}) {
  const MESES = [
    "Jan",
    "Fev",
    "Mar",
    "Abr",
    "Mai",
    "Jun",
    "Jul",
    "Ago",
    "Set",
    "Out",
    "Nov",
    "Dez",
  ];
  const [targetMes, setTargetMes] = React.useState<number>(source?.initialMes ?? 1);
  const [targetAno, setTargetAno] = React.useState<number>(
    source?.initialAno ?? new Date().getFullYear(),
  );
  React.useEffect(() => {
    if (source) {
      setTargetMes(source.initialMes);
      setTargetAno(source.initialAno);
    }
  }, [source]);

  const fmtMA = (m: number, a: number) => `${MESES[(m - 1 + 12) % 12]}/${a}`;
  const fmtDate = (s: string | null) => {
    if (!s) return "—";
    const [y, m, d] = s.slice(0, 10).split("-");
    return `${d}/${m}/${y}`;
  };

  const full = source?.full;
  const baseMes = full?.mes_veiculacao ?? targetMes;
  const baseAno = full?.ano_veiculacao ?? targetAno;
  const itensPreview = React.useMemo(
    () => (full ? buildRenovacaoConsolidatedItems(full, targetMes, targetAno) : []),
    [full, targetMes, targetAno],
  );
  const anos = [targetAno - 1, targetAno, targetAno + 1, targetAno + 2];

  return (
    <Dialog open={!!source} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Renovação — PI {full?.numero}</DialogTitle>
          <DialogDescription>
            Escolha o mês de destino. Os dias de veiculação serão remapeados preservando o dia da
            semana (ex.: se o programa é toda segunda, será colocado nas segundas do novo mês).
          </DialogDescription>
        </DialogHeader>
        {source && (
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-md border p-3 bg-muted/30">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Origem
                </div>
                <div className="text-sm font-semibold">{fmtMA(baseMes, baseAno)}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Período: {fmtDate(full?.periodo_inicio ?? null)} →{" "}
                  {fmtDate(full?.periodo_fim ?? null)}
                </div>
              </div>
              <div className="rounded-md border border-primary/40 p-3 bg-primary/5 space-y-2">
                <div className="text-[10px] uppercase tracking-wide text-primary">
                  Novo PI — escolha o mês
                </div>
                <div className="flex gap-2">
                  <Select value={String(targetMes)} onValueChange={(v) => setTargetMes(Number(v))}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MESES.map((m, i) => (
                        <SelectItem key={i} value={String(i + 1)}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={String(targetAno)} onValueChange={(v) => setTargetAno(Number(v))}>
                    <SelectTrigger className="h-8 text-xs w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {anos.map((a) => (
                        <SelectItem key={a} value={String(a)}>
                          {a}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <div className="rounded-md border overflow-hidden">
              <div className="px-3 py-2 text-xs font-semibold bg-muted/40">
                Itens ({itensPreview.length}) — remapeamento de dias
              </div>
              <div className="max-h-72 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Item</TableHead>
                      <TableHead className="text-xs">
                        Dias origem ({fmtMA(baseMes, baseAno)})
                      </TableHead>
                      <TableHead className="text-xs">
                        Dias novo ({fmtMA(targetMes, targetAno)})
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itensPreview.map((it: any, i: number) => {
                      const dOrig: number[] = it.dias_origem ?? [];
                      const dNovo: number[] = it.dias_mes ?? [];
                      return (
                        <TableRow key={i}>
                          <TableCell className="text-xs">
                            <div className="font-medium">{it.programa || it.tipo || "—"}</div>
                            <div className="text-muted-foreground">{it.formato || ""}</div>
                          </TableCell>
                          <TableCell className="text-xs">
                            {dOrig.length ? dOrig.join(", ") : "—"}
                          </TableCell>
                          <TableCell className="text-xs text-primary font-medium">
                            {dNovo.length ? dNovo.join(", ") : "—"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
          <Button onClick={() => onConfirm(targetMes, targetAno)}>
            Confirmar e abrir formulário
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
