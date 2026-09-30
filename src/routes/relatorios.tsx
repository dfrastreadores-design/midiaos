import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileDown, FileSpreadsheet, Loader2, Eye, X } from "lucide-react";
import { toast } from "sonner";
import { gerarRelatorio, type RelatorioTipo, type Relatorio } from "@/lib/relatorios.functions";
import { listUsuarios } from "@/lib/usuarios.functions";
import { listClientes } from "@/lib/clientes.functions";
import { listAgencias } from "@/lib/agencias.functions";
const loadRelExport = () => import("@/lib/relatorio-export");

export const Route = createFileRoute("/relatorios")({
  head: () => ({ meta: [{ title: "Relatórios — Mídia.OS" }] }),
  component: RelatoriosPage,
});

const reports: {
  tipo: RelatorioTipo;
  titulo: string;
  desc: string;
  usaPeriodo?: boolean;
  usaAno?: boolean;
  grupo?: string;
}[] = [
  {
    tipo: "vendas_periodo",
    titulo: "Vendas por período",
    desc: "PIs detalhados no intervalo selecionado",
    usaPeriodo: true,
    grupo: "Comercial",
  },
  {
    tipo: "clientes_ativos",
    titulo: "Clientes cadastrados",
    desc: "Lista completa com contatos e cidade",
    grupo: "Comercial",
  },
  {
    tipo: "campanhas_andamento",
    titulo: "Campanhas em andamento",
    desc: "PIs com veiculação ativa hoje",
    grupo: "Comercial",
  },
  {
    tipo: "faturamento_mensal",
    titulo: "Faturamento mensal",
    desc: "Realizado vs meta mês a mês",
    usaAno: true,
    grupo: "Financeiro",
  },
  {
    tipo: "desempenho_executivos",
    titulo: "Desempenho de executivos",
    desc: "Ranking por vendas no período",
    usaPeriodo: true,
    grupo: "Comercial",
  },
  {
    tipo: "comissoes_agencias",
    titulo: "Comissões de agências",
    desc: "Comissão calculada por proposta",
    usaPeriodo: true,
    grupo: "Financeiro",
  },
  {
    tipo: "pi_status",
    titulo: "PIs por status",
    desc: "Resumo quantitativo por status",
    grupo: "Comercial",
  },
  {
    tipo: "propostas_status",
    titulo: "Propostas por status",
    desc: "Resumo quantitativo por status",
    grupo: "Comercial",
  },
  {
    tipo: "projetos_especiais",
    titulo: "Projetos especiais",
    desc: "Datas de comercialização e valor estimado",
    grupo: "Comercial",
  },
  {
    tipo: "metas_vs_realizado",
    titulo: "Metas vs Realizado",
    desc: "Por executivo no ano selecionado",
    usaAno: true,
    grupo: "Comercial",
  },
  {
    tipo: "produtos_catalogo",
    titulo: "Catálogo de produtos",
    desc: "TV, Rádio e DOOH",
    grupo: "Comercial",
  },
  {
    tipo: "investimento_clientes",
    titulo: "Investimento por cliente",
    desc: "Histórico consolidado por cliente no período",
    usaPeriodo: true,
    grupo: "Comercial",
  },
  {
    tipo: "investimento_agencias",
    titulo: "Investimento por agência",
    desc: "Histórico consolidado por agência no período",
    usaPeriodo: true,
    grupo: "Comercial",
  },
  {
    tipo: "faturamento_fiscal",
    titulo: "Faturamento fiscal",
    desc: "PIs com data de faturamento no período (CNPJ, IE, valor) — pronto para contabilidade",
    usaPeriodo: true,
    grupo: "Fiscal",
  },
  {
    tipo: "notas_emitidas",
    titulo: "Notas emitidas",
    desc: "PIs com nota enviada no período, com CNPJ e UF do tomador",
    usaPeriodo: true,
    grupo: "Fiscal",
  },
  {
    tipo: "contas_a_receber",
    titulo: "Contas a receber",
    desc: "PIs faturados com vencimento dentro do período",
    usaPeriodo: true,
    grupo: "Fiscal",
  },
  {
    tipo: "pis_consultados",
    titulo: "PIs consultados",
    desc: "Quem abriu o link compartilhado, por cliente e executivo, com tempo desde o envio",
    usaPeriodo: true,
    grupo: "Comercial",
  },
  {
    tipo: "vendas_executivo_detalhado",
    titulo: "Vendas por executivo (detalhado)",
    desc: "PIs vendidos por cada executivo, com cliente, agência, campanha e valores bruto/líquido",
    usaPeriodo: true,
    grupo: "Comercial",
  },
  {
    tipo: "desempenho_executivo_completo",
    titulo: "Desempenho por executivo (completo)",
    desc: "PIs, propostas, conversão, ticket médio, inserções, bruto/líquido, meta e atingimento",
    usaPeriodo: true,
    usaAno: true,
    grupo: "Comercial",
  },
];

const PI_STATUS = [
  "rascunho",
  "enviado",
  "aprovado",
  "faturado",
  "veiculado",
  "encerrado",
  "reprovado",
  "cancelado",
  "substituido",
];

function RelatoriosPage() {
  const now = new Date();
  const [ano, setAno] = useState(now.getFullYear());
  const [inicio, setInicio] = useState(`${now.getFullYear()}-01-01`);
  const [fim, setFim] = useState(now.toISOString().slice(0, 10));
  const [executivoId, setExecutivoId] = useState<string>("");
  const [clienteId, setClienteId] = useState<string>("");
  const [agenciaId, setAgenciaId] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [preview, setPreview] = useState<{ rel: Relatorio; tipo: RelatorioTipo } | null>(null);
  const [pageSize, setPageSize] = useState(50);
  const gerar = useServerFn(gerarRelatorio);

  const { data: usuarios = [] } = useQuery({
    queryKey: ["rel-usuarios"],
    queryFn: () => listUsuarios(),
  });
  const { data: clientes = [] } = useQuery({
    queryKey: ["rel-clientes"],
    queryFn: () => listClientes(),
  });
  const { data: agencias = [] } = useQuery({
    queryKey: ["rel-agencias"],
    queryFn: () => listAgencias(),
  });

  const mut = useMutation({
    mutationFn: async (vars: {
      tipo: RelatorioTipo;
      action: "pdf" | "xlsx" | "preview";
      page?: number;
      pageSize?: number;
    }) => {
      const rel = (await gerar({
        data: {
          tipo: vars.tipo,
          inicio,
          fim,
          ano,
          ...(executivoId ? { executivoId } : {}),
          ...(clienteId ? { clienteId } : {}),
          ...(agenciaId ? { agenciaId } : {}),
          ...(status ? { status } : {}),
          ...(vars.action === "preview"
            ? { page: vars.page ?? 1, pageSize: vars.pageSize ?? pageSize }
            : {}),
        },
      })) as Relatorio;
      return { rel, action: vars.action, tipo: vars.tipo };
    },
    onSuccess: async ({ rel, action, tipo }) => {
      if (action === "pdf") {
        const m = await loadRelExport();
        m.exportRelatorioPdf(rel);
        toast.success("PDF gerado");
      } else if (action === "xlsx") {
        const m = await loadRelExport();
        m.exportRelatorioXlsx(rel);
        toast.success("Planilha Excel gerada");
      } else setPreview({ rel, tipo });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const pendingKey = mut.isPending ? `${mut.variables?.tipo}:${mut.variables?.action}` : "";
  const goToPage = (page: number) => {
    if (!preview) return;
    mut.mutate({ tipo: preview.tipo, action: "preview", page, pageSize });
  };

  const limparFiltros = () => {
    setExecutivoId("");
    setClienteId("");
    setAgenciaId("");
    setStatus("");
  };

  return (
    <AppShell>
      <div className="mb-4">
        <h1 className="text-2xl lg:text-3xl font-display font-semibold tracking-tight">
          Relatórios
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Gere relatórios em PDF ou Excel (.xlsx) com dados em tempo real, incluindo bloco fiscal
          para contabilidade.
        </p>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3 items-end">
            <div>
              <Label className="text-xs">Início</Label>
              <Input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Fim</Label>
              <Input type="date" value={fim} onChange={(e) => setFim(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Ano</Label>
              <Input type="number" value={ano} onChange={(e) => setAno(Number(e.target.value))} />
            </div>
            <div>
              <Label className="text-xs">Executivo</Label>
              <Select
                value={executivoId || "all"}
                onValueChange={(v) => setExecutivoId(v === "all" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {usuarios.map((u: any) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.nome || u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Cliente</Label>
              <Select
                value={clienteId || "all"}
                onValueChange={(v) => setClienteId(v === "all" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {clientes.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome_fantasia || c.razao_social}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Agência</Label>
              <Select
                value={agenciaId || "all"}
                onValueChange={(v) => setAgenciaId(v === "all" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {agencias.map((a: any) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.nome_fantasia || a.razao_social}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select
                value={status || "all"}
                onValueChange={(v) => setStatus(v === "all" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {PI_STATUS.map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {(executivoId || clienteId || agenciaId || status) && (
            <div className="mt-3 flex justify-end">
              <Button size="sm" variant="ghost" onClick={limparFiltros}>
                <X className="size-3.5 mr-1" /> Limpar filtros
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports.map((r) => {
          const filtroLabel = r.usaPeriodo
            ? "Usa período"
            : r.usaAno
              ? "Usa ano"
              : "Snapshot atual";
          return (
            <Card key={r.tipo}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{r.titulo}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-1">{r.desc}</p>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground/70 mb-4">
                  {filtroLabel}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={mut.isPending}
                    onClick={() => mut.mutate({ tipo: r.tipo, action: "preview" })}
                  >
                    {pendingKey === `${r.tipo}:preview` ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <>
                        <Eye className="size-3.5 mr-1" />
                        Ver
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={mut.isPending}
                    onClick={() => mut.mutate({ tipo: r.tipo, action: "pdf" })}
                  >
                    {pendingKey === `${r.tipo}:pdf` ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <>
                        <FileDown className="size-3.5 mr-1" />
                        PDF
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={mut.isPending}
                    onClick={() => mut.mutate({ tipo: r.tipo, action: "xlsx" })}
                  >
                    {pendingKey === `${r.tipo}:xlsx` ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <>
                        <FileSpreadsheet className="size-3.5 mr-1" />
                        Excel
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <PreviewDialog
        rel={preview?.rel ?? null}
        loading={mut.isPending && mut.variables?.action === "preview"}
        pageSize={pageSize}
        onPageSizeChange={(n) => {
          setPageSize(n);
          if (preview) goToPage(1);
        }}
        onPageChange={goToPage}
        onClose={() => setPreview(null)}
      />
    </AppShell>
  );
}

function PreviewDialog({
  rel,
  loading,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onClose,
}: {
  rel: Relatorio | null;
  loading: boolean;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (n: number) => void;
  onClose: () => void;
}) {
  if (!rel) return null;
  const pag = rel.paginacao;
  const totalPages = pag ? Math.max(1, Math.ceil(pag.total / pag.pageSize)) : 1;
  return (
    <Dialog open={!!rel} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{rel.titulo}</DialogTitle>
          <p className="text-xs text-muted-foreground">
            Gerado em {new Date(rel.geradoEm).toLocaleString("pt-BR")} • {rel.rows.length} linha(s)
            {pag && (
              <>
                {" "}
                • {pag.total} no total{pag.truncado ? " (resultado truncado)" : ""}
              </>
            )}
          </p>
        </DialogHeader>
        <div className="overflow-auto flex-1 border rounded-md relative">
          {loading && (
            <div className="absolute inset-0 bg-background/60 backdrop-blur-sm z-10 flex items-center justify-center">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                {rel.columns.map((c) => (
                  <TableHead key={c.key}>{c.label}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rel.rows.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={rel.columns.length}
                    className="text-center py-8 text-muted-foreground"
                  >
                    Sem dados para os filtros selecionados.
                  </TableCell>
                </TableRow>
              )}
              {rel.rows.map((row, i) => (
                <TableRow key={i}>
                  {rel.columns.map((c) => (
                    <TableCell key={c.key} className="text-sm">
                      {formatPreview(row[c.key], c.type)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {pag && (
          <div className="flex items-center justify-between flex-wrap gap-2 pt-2 text-xs">
            <div className="flex items-center gap-2">
              <Label className="text-xs">Por página</Label>
              <select
                className="h-8 rounded-md border bg-background px-2 text-xs"
                value={pageSize}
                disabled={loading}
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
              >
                {[25, 50, 100, 200].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">
                Página {pag.page} de {totalPages}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={loading || pag.page <= 1}
                onClick={() => onPageChange(pag.page - 1)}
              >
                Anterior
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={loading || pag.page >= totalPages}
                onClick={() => onPageChange(pag.page + 1)}
              >
                Próxima
              </Button>
            </div>
          </div>
        )}
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={async () => {
              const m = await loadRelExport();
              m.exportRelatorioXlsx(rel);
            }}
          >
            <FileSpreadsheet className="size-4 mr-1.5" />
            Baixar Excel
          </Button>
          <Button
            onClick={async () => {
              const m = await loadRelExport();
              m.exportRelatorioPdf(rel);
            }}
          >
            <FileDown className="size-4 mr-1.5" />
            Baixar PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function formatPreview(v: any, type?: string) {
  if (v === null || v === undefined || v === "") return "—";
  if (type === "currency")
    return Number(v).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    });
  if (type === "number") return Number(v).toLocaleString("pt-BR", { maximumFractionDigits: 1 });
  if (type === "date") {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleDateString("pt-BR");
  }
  return String(v);
}
