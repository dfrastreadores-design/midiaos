import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Radio, ChevronDown, ChevronRight, FileText, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatCNPJ } from "@/lib/cnpj";
const formatCnpj = formatCNPJ;

export const Route = createFileRoute("/historico-veiculacao")({
  head: () => ({
    meta: [
      { title: "Histórico de Veiculação por CNPJ — Mídia.OS" },
      { name: "description", content: "Controle total das veiculações agrupadas pelo CNPJ da emissora emissora do PI." },
    ],
  }),
  component: HistoricoVeiculacaoPage,
});

type Emissora = {
  id: string;
  nome: string;
  razao_social: string | null;
  cnpj: string | null;
  tipo_midia: string | null;
  logo_url: string | null;
};

type PiRow = {
  id: string;
  numero: string;
  campanha: string | null;
  status: string;
  periodo_inicio: string | null;
  periodo_fim: string | null;
  valor_tabela: number | null;
  valor_negociado: number | null;
  total_insercoes: number | null;
  emissora_id: string | null;
  cliente: { razao_social: string | null; nome_fantasia: string | null } | null;
  agencia: { razao_social: string | null; nome_fantasia: string | null } | null;
};

const STATUS_COLOR: Record<string, string> = {
  rascunho: "bg-muted text-muted-foreground",
  enviado: "bg-blue-100 text-blue-700",
  aguardando_aprovacao: "bg-amber-100 text-amber-800",
  aguardando_assinatura: "bg-indigo-100 text-indigo-700",
  assinado: "bg-emerald-100 text-emerald-700",
  aprovado: "bg-emerald-100 text-emerald-700",
  reprovado: "bg-rose-100 text-rose-700",
  faturado: "bg-purple-100 text-purple-700",
  veiculado: "bg-teal-100 text-teal-700",
  encerrado: "bg-slate-200 text-slate-800",
  cancelado: "bg-rose-100 text-rose-700",
  substituido: "bg-zinc-200 text-zinc-700",
};

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtDate = (d: string | null) => (d ? new Date(d + "T00:00:00").toLocaleDateString("pt-BR") : "—");

function HistoricoVeiculacaoPage() {
  const [statusFilter, setStatusFilter] = useState<string>("veiculados");
  const [emissoraFilter, setEmissoraFilter] = useState<string>("");
  const [dataIni, setDataIni] = useState<string>("");
  const [dataFim, setDataFim] = useState<string>("");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const { data: emissoras = [] } = useQuery({
    queryKey: ["emissoras-hv"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("emissoras")
        .select("id, nome, razao_social, cnpj, tipo_midia, logo_url")
        .order("nome");
      if (error) throw error;
      return (data ?? []) as Emissora[];
    },
  });

  const { data: pis = [], isLoading } = useQuery({
    queryKey: ["pis-historico-veiculacao", statusFilter, emissoraFilter, dataIni, dataFim],
    queryFn: async () => {
      let q = supabase
        .from("pis")
        .select(
          "id, numero, campanha, status, periodo_inicio, periodo_fim, valor_tabela, valor_negociado, total_insercoes, emissora_id, cliente:clientes(razao_social, nome_fantasia), agencia:agencias(razao_social, nome_fantasia)",
        )
        .order("periodo_inicio", { ascending: false, nullsFirst: false })
        .limit(1000);

      if (statusFilter === "veiculados") {
        q = q.in("status", ["aprovado", "faturado"]);
      } else if (statusFilter && statusFilter !== "todos") {
        q = q.eq("status", statusFilter as "aprovado");
      }
      if (emissoraFilter) q = q.eq("emissora_id", emissoraFilter);
      if (dataIni) q = q.gte("periodo_inicio", dataIni);
      if (dataFim) q = q.lte("periodo_fim", dataFim);

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as PiRow[];
    },
  });

  const grupos = useMemo(() => {
    const emissoraMap = new Map(emissoras.map((e) => [e.id, e]));
    const s = search.toLowerCase().trim();
    const filtered = s
      ? pis.filter((p) => {
          const nome = (p.cliente?.nome_fantasia || p.cliente?.razao_social || p.agencia?.razao_social || "").toLowerCase();
          return (
            p.numero?.toLowerCase().includes(s) ||
            (p.campanha ?? "").toLowerCase().includes(s) ||
            nome.includes(s)
          );
        })
      : pis;

    const map = new Map<string, { emissora: Emissora | null; pis: PiRow[]; bruto: number; liquido: number; insercoes: number }>();
    for (const p of filtered) {
      const key = p.emissora_id ?? "__sem__";
      let g = map.get(key);
      if (!g) {
        g = { emissora: p.emissora_id ? emissoraMap.get(p.emissora_id) ?? null : null, pis: [], bruto: 0, liquido: 0, insercoes: 0 };
        map.set(key, g);
      }
      g.pis.push(p);
      g.bruto += Number(p.valor_tabela ?? 0);
      g.liquido += Number(p.valor_negociado ?? 0);
      g.insercoes += Number(p.total_insercoes ?? 0);
    }
    return Array.from(map.values()).sort((a, b) => b.liquido - a.liquido);
  }, [pis, emissoras, search]);

  const totais = useMemo(
    () => grupos.reduce(
      (acc, g) => ({
        bruto: acc.bruto + g.bruto,
        liquido: acc.liquido + g.liquido,
        insercoes: acc.insercoes + g.insercoes,
        pis: acc.pis + g.pis.length,
      }),
      { bruto: 0, liquido: 0, insercoes: 0, pis: 0 },
    ),
    [grupos],
  );

  const exportCSV = () => {
    const rows: string[] = ["Emissora;CNPJ;Numero PI;Campanha;Cliente/Agencia;Status;Inicio;Fim;Insercoes;Bruto;Liquido"];
    for (const g of grupos) {
      for (const p of g.pis) {
        const cli = p.cliente?.nome_fantasia || p.cliente?.razao_social || p.agencia?.razao_social || "";
        rows.push(
          [
            g.emissora?.nome ?? "Sem emissora",
            g.emissora?.cnpj ? formatCnpj(g.emissora.cnpj) : "",
            p.numero,
            (p.campanha ?? "").replaceAll(";", ","),
            cli.replaceAll(";", ","),
            p.status,
            fmtDate(p.periodo_inicio),
            fmtDate(p.periodo_fim),
            String(p.total_insercoes ?? 0),
            Number(p.valor_tabela ?? 0).toFixed(2),
            Number(p.valor_negociado ?? 0).toFixed(2),
          ].join(";"),
        );
      }
    }
    const blob = new Blob(["\uFEFF" + rows.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `historico-veiculacao-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <Radio className="h-6 w-6 text-primary" />
              Histórico de Veiculação por CNPJ
            </h1>
            <p className="text-sm text-muted-foreground">
              Controle total das veiculações agrupadas pela emissora emissora do PI.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={exportCSV} disabled={grupos.length === 0}>
            <Download className="h-4 w-4 mr-2" /> Exportar CSV
          </Button>
        </div>

        <Card>
          <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="lg:col-span-2">
              <label className="text-xs text-muted-foreground">Buscar (PI, campanha, cliente)</label>
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Digite para filtrar..." />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Emissora / CNPJ</label>
              <Select value={emissoraFilter || "all"} onValueChange={(v) => setEmissoraFilter(v === "all" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as emissoras</SelectItem>
                  {emissoras.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.nome}{e.cnpj ? ` — ${formatCnpj(e.cnpj)}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="veiculados">Veiculados (padrão)</SelectItem>
                  <SelectItem value="todos">Todos os status</SelectItem>
                  <SelectItem value="aprovado">Aprovado</SelectItem>
                  <SelectItem value="faturado">Faturado</SelectItem>
                  <SelectItem value="aguardando_aprovacao">Aguardando aprovação</SelectItem>
                  <SelectItem value="enviado">Enviado</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                  <SelectItem value="reprovado">Reprovado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground">De</label>
                <Input type="date" value={dataIni} onChange={(e) => setDataIni(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Até</label>
                <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Emissoras</div><div className="text-2xl font-semibold">{grupos.length}</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">PIs</div><div className="text-2xl font-semibold">{totais.pis}</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Inserções</div><div className="text-2xl font-semibold">{totais.insercoes.toLocaleString("pt-BR")}</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Total líquido</div><div className="text-2xl font-semibold">{brl(totais.liquido)}</div><div className="text-[11px] text-muted-foreground">Bruto {brl(totais.bruto)}</div></CardContent></Card>
        </div>

        {isLoading ? (
          <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Carregando...</CardContent></Card>
        ) : grupos.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Nenhuma veiculação encontrada com os filtros aplicados.</CardContent></Card>
        ) : (
          <div className="space-y-3">
            {grupos.map((g) => {
              const key = g.emissora?.id ?? "sem";
              const open = expanded[key] ?? true;
              return (
                <Card key={key}>
                  <CardContent className="p-0">
                    <button
                      type="button"
                      onClick={() => setExpanded((s) => ({ ...s, [key]: !open }))}
                      className="w-full flex flex-wrap items-center gap-3 p-4 hover:bg-muted/40 text-left"
                    >
                      {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      {g.emissora?.logo_url ? (
                        <img src={g.emissora.logo_url} alt="" className="h-8 w-8 rounded object-contain bg-white border" />
                      ) : (
                        <div className="h-8 w-8 rounded bg-muted flex items-center justify-center"><Radio className="h-4 w-4 text-muted-foreground" /></div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{g.emissora?.nome ?? "Sem emissora definida"}</div>
                        <div className="text-xs text-muted-foreground">
                          {g.emissora?.cnpj ? `CNPJ ${formatCnpj(g.emissora.cnpj)}` : "CNPJ não informado"}
                          {g.emissora?.razao_social ? ` • ${g.emissora.razao_social}` : ""}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-4 text-right text-xs">
                        <div><div className="text-muted-foreground">PIs</div><div className="font-semibold text-sm">{g.pis.length}</div></div>
                        <div><div className="text-muted-foreground">Inserções</div><div className="font-semibold text-sm">{g.insercoes.toLocaleString("pt-BR")}</div></div>
                        <div><div className="text-muted-foreground">Bruto</div><div className="font-semibold text-sm">{brl(g.bruto)}</div></div>
                        <div><div className="text-muted-foreground">Líquido</div><div className="font-semibold text-sm text-primary">{brl(g.liquido)}</div></div>
                      </div>
                    </button>

                    {open && (
                      <div className="border-t overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>PI</TableHead>
                              <TableHead>Cliente / Agência</TableHead>
                              <TableHead>Campanha</TableHead>
                              <TableHead>Período</TableHead>
                              <TableHead className="text-right">Inserções</TableHead>
                              <TableHead className="text-right">Bruto</TableHead>
                              <TableHead className="text-right">Líquido</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead />
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {g.pis.map((p) => {
                              const cli = p.cliente?.nome_fantasia || p.cliente?.razao_social || p.agencia?.razao_social || "—";
                              return (
                                <TableRow key={p.id}>
                                  <TableCell className="font-mono text-xs">{p.numero}</TableCell>
                                  <TableCell className="text-sm">{cli}</TableCell>
                                  <TableCell className="text-sm">{p.campanha ?? "—"}</TableCell>
                                  <TableCell className="text-xs whitespace-nowrap">{fmtDate(p.periodo_inicio)} → {fmtDate(p.periodo_fim)}</TableCell>
                                  <TableCell className="text-right text-sm">{(p.total_insercoes ?? 0).toLocaleString("pt-BR")}</TableCell>
                                  <TableCell className="text-right text-sm">{brl(Number(p.valor_tabela ?? 0))}</TableCell>
                                  <TableCell className="text-right text-sm font-medium">{brl(Number(p.valor_negociado ?? 0))}</TableCell>
                                  <TableCell>
                                    <Badge className={STATUS_COLOR[p.status] ?? "bg-muted"}>{p.status}</Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Link to="/pi" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                                      <FileText className="h-3.5 w-3.5" /> Abrir
                                    </Link>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
