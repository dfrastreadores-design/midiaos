import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Pencil,
  Trash2,
  ArrowRightCircle,
  Presentation,
  Eye,
  Settings,
  Copy,
  ThumbsDown,
  FileUp,
  Paperclip,
  Sliders,
  Compass,
} from "lucide-react";
import { Planejamento360Modal } from "@/components/planejamento360/Planejamento360Modal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PropostaFormDialog } from "@/components/PropostaFormDialog";
import { ImportarPropostaDialog } from "@/components/ImportarPropostaDialog";
import { ImportarModeloPropostaDialog } from "@/components/ImportarModeloPropostaDialog";
import { ConverterPropostaDialog } from "@/components/ConverterPropostaDialog";
import { GerarApresentacaoDialog } from "@/components/GerarApresentacaoDialog";
import { VisualizarPropostaDialog } from "@/components/VisualizarPropostaDialog";
import { LayoutManagerDialog } from "@/components/LayoutManagerDialog";
import { RecusarPropostaDialog } from "@/components/RecusarPropostaDialog";
import { useUserRoles } from "@/hooks/use-roles";
import { usePropostas } from "@/hooks/use-propostas";
import { PROPOSTA_STATUS_CONFIG, formatCurrency } from "@/lib/services/proposta-utils";
import { Proposta } from "@/types/proposta";

export const Route = createFileRoute("/propostas")({
  head: () => ({ meta: [{ title: "Propostas — Mídia.OS" }] }),
  component: Propostas,
});

function Propostas() {
  const { isAdmin } = useUserRoles();
  const { propostas, isLoading, search, setSearch, deleteProposta } = usePropostas();

  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [modeloEmpresaOpen, setModeloEmpresaOpen] = useState(false);
  const [layoutOpen, setLayoutOpen] = useState(false);
  const [editing, setEditing] = useState<Proposta | null>(null);
  const [converting, setConverting] = useState<Proposta | null>(null);
  const [apresentando, setApresentando] = useState<Proposta | null>(null);
  const [visualizando, setVisualizando] = useState<Proposta | null>(null);
  const [recusando, setRecusando] = useState<Proposta | null>(null);
  const [planejamento360Open, setPlanejamento360Open] = useState(false);

  const totalBruto = propostas.reduce((s, p) => s + Number(p.valor_tabela || 0), 0);
  const totalLiquido = propostas.reduce((s, p) => s + Number(p.valor_negociado || 0), 0);

  const handleAplicarPlano360Direto = (itens: any[], defesa: string) => {
    if (!itens || itens.length === 0) return;
    const novosItens = itens.map((it) => ({
      tipo: it.tipo || "DOOH",
      programa: it.nome,
      horario: "Rotativo",
      formato: it.formato,
      mes: new Date().getMonth() + 1,
      ano: new Date().getFullYear(),
      insercoes_dia: Math.max(1, Math.round((it.insercoes_mes || 30) / 30)),
      dias_semana: ["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"],
      dias_mes: Array.from({ length: 30 }, (_, i) => i + 1),
      desconto: it.desconto_pct || 0,
      valor_unit: it.valor_negociado / Math.max(1, it.insercoes_mes || 1),
      valor_tabela: it.valor_tabela || it.valor_negociado,
      valor_negociado: it.valor_negociado,
      total_insercoes: it.insercoes_mes || 30,
      produto_id: it.produto_id || null,
      parceiro_nome: it.parceiro_nome || null,
      latitude: it.latitude || null,
      longitude: it.longitude || null,
      link_maps: it.link_maps || null,
      sentido_via: it.sentido_via || null,
      ponto_referencia: it.ponto_referencia || null,
      endereco_ponto: it.localizacao || null,
      canal_macro: "OFF" as const,
    }));

    setEditing({
      id: "",
      numero: "",
      campanha: `Estratégia 360° — ${itens[0]?.regiao || "DF"}`,
      status: "rascunho",
      cliente_id: null,
      agencia_id: null,
      cliente_avulso: "Cliente Comercial em Reunião",
      validade: null,
      observacao: defesa,
      valor_tabela: itens.reduce((s, it) => s + (it.valor_tabela || 0), 0),
      valor_desconto: itens.reduce((s, it) => s + ((it.valor_tabela || it.valor_negociado) - it.valor_negociado), 0),
      valor_negociado: itens.reduce((s, it) => s + (it.valor_negociado || 0), 0),
      total_insercoes: itens.reduce((s, it) => s + (it.insercoes_mes || 30), 0),
      comissao_pct: 0,
      itens: novosItens,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any);

    setFormOpen(true);
  };

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-semibold tracking-tight">
            Propostas Comerciais
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Crie, envie e converta em PI com um clique.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            className="border-sky-500/50 bg-sky-500/10 text-sky-700 dark:text-sky-300 hover:bg-sky-500/20 font-semibold"
            onClick={() => setPlanejamento360Open(true)}
            title="Diagnóstico ao vivo na reunião, perfil de público do DF e radar de expansão regional"
          >
            <Compass className="size-4 mr-2 text-sky-600 dark:text-sky-400 animate-pulse" />
            Planejamento 360°
          </Button>
          <Button
            variant="outline"
            className="border-primary/40 text-primary hover:bg-primary/10"
            onClick={() => setModeloEmpresaOpen(true)}
            title="Importe a apresentação institucional em PDF/slides e mapeie a tabela de produtos e valores"
          >
            <Sliders className="size-4 mr-2" /> Modelo da Empresa
          </Button>
          {isAdmin && (
            <Button variant="outline" onClick={() => setLayoutOpen(true)}>
              <Settings className="size-4 mr-2" /> Layouts
            </Button>
          )}
          <Button
            variant="outline"
            className="border-primary/40 text-primary hover:bg-primary/10"
            onClick={() => setImportOpen(true)}
          >
            <FileUp className="size-4 mr-2" /> Importar PDF / PPTX
          </Button>
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="size-4 mr-2" /> Nova Proposta
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Total de Propostas</div>
            <div className="text-2xl font-semibold mt-1">{propostas.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Valor Bruto</div>
            <div className="text-2xl font-semibold mt-1">{formatCurrency(totalBruto)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Valor Líquido</div>
            <div className="text-2xl font-semibold mt-1 text-primary">
              {formatCurrency(totalLiquido)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="p-4 border-b">
            <Input
              placeholder="Buscar…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-md"
            />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nº</TableHead>
                <TableHead>Cliente / Campanha</TableHead>
                <TableHead>Criado por</TableHead>
                <TableHead className="text-right">Inserções</TableHead>
                <TableHead className="text-right">Valor Bruto</TableHead>
                <TableHead className="text-right">Valor Líquido</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Carregando…
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && propostas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Nenhuma proposta encontrada.
                  </TableCell>
                </TableRow>
              )}
              {propostas.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs">{p.numero}</TableCell>
                  <TableCell>
                    <div className="font-medium">
                      {p.cliente?.nome_fantasia ||
                        p.cliente?.razao_social ||
                        p.agencia?.nome_fantasia ||
                        p.agencia?.razao_social ||
                        p.cliente_avulso ||
                        "—"}
                    </div>
                    <div className="text-xs text-muted-foreground">{p.campanha}</div>
                  </TableCell>
                  <TableCell className="text-sm">{p.criado_por || "—"}</TableCell>
                  <TableCell className="text-right text-sm">{p.total_insercoes}</TableCell>
                  <TableCell className="text-right text-sm">
                    {formatCurrency(p.valor_tabela)}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(p.valor_negociado)}
                  </TableCell>

                  <TableCell>
                    <Badge className={PROPOSTA_STATUS_CONFIG[p.status]?.className}>
                      {p.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-end">
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Visualizar"
                        onClick={() => setVisualizando(p)}
                      >
                        <Eye className="size-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Editar"
                        onClick={() => {
                          setEditing(p);
                          setFormOpen(true);
                        }}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Duplicar para outro cliente"
                        onClick={() => {
                          setEditing({ ...p, isCopy: true } as any);
                          setFormOpen(true);
                        }}
                      >
                        <Copy className="size-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Gerar Apresentação"
                        onClick={() => setApresentando(p)}
                      >
                        <Presentation className="size-4 text-primary" />
                      </Button>
                      {p.status !== "convertida" && (
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Converter em PI"
                          onClick={() => setConverting(p)}
                        >
                          <ArrowRightCircle className="size-4 text-primary" />
                        </Button>
                      )}
                      {p.status !== "convertida" && p.status !== "recusada" && (
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Cliente não tem interesse"
                          onClick={() => setRecusando(p)}
                        >
                          <ThumbsDown className="size-4 text-destructive" />
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Excluir"
                        onClick={() => deleteProposta(p.id)}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && propostas.length > 0 && (
                <TableRow className="bg-muted/40 font-semibold">
                  <TableCell colSpan={4} className="text-right">
                    Totais
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(totalBruto)}</TableCell>
                  <TableCell className="text-right text-primary">
                    {formatCurrency(totalLiquido)}
                  </TableCell>
                  <TableCell colSpan={2} />
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {formOpen && (
        <PropostaFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          initial={
            editing
              ? {
                  id: editing.id,
                  isCopy: editing.isCopy,
                  cliente_id: editing.cliente_id,
                  agencia_id: editing.agencia_id,
                  executivo_id: editing.executivo_id,
                  cliente_avulso: editing.cliente_avulso,
                  campanha: editing.campanha,
                  validade: editing.validade,
                  observacao: editing.observacao,
                }
              : undefined
          }
          onOpenImport={() => setImportOpen(true)}
        />
      )}

      <ImportarPropostaDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onSuccess={(id) => {
          setVisualizando({ id } as any);
        }}
      />

      <GerarApresentacaoDialog
        open={!!apresentando}
        onOpenChange={(v) => !v && setApresentando(null)}
        propostaId={apresentando?.id ?? null}
      />

      <ConverterPropostaDialog
        propostaId={converting?.id ?? null}
        numero={converting?.numero ?? ""}
        open={!!converting}
        onOpenChange={(v) => !v && setConverting(null)}
      />

      <VisualizarPropostaDialog
        open={!!visualizando}
        onOpenChange={(v) => !v && setVisualizando(null)}
        propostaId={visualizando?.id ?? null}
      />

      <RecusarPropostaDialog
        open={!!recusando}
        onOpenChange={(v) => !v && setRecusando(null)}
        propostaId={recusando?.id ?? null}
        numero={recusando?.numero}
      />

      <LayoutManagerDialog open={layoutOpen} onOpenChange={setLayoutOpen} />

      <ImportarModeloPropostaDialog open={modeloEmpresaOpen} onOpenChange={setModeloEmpresaOpen} />

      <Planejamento360Modal
        open={planejamento360Open}
        onOpenChange={setPlanejamento360Open}
        onAplicarAoPlano={handleAplicarPlano360Direto}
      />
    </AppShell>
  );
}
