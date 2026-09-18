import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { useUserRoles } from "@/hooks/use-roles";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Percent, DollarSign } from "lucide-react";
import { toast } from "sonner";
import {
  listComissoesRegras, saveComissaoRegra, deleteComissaoRegra,
  listApuracoes, updateApuracaoStatus,
} from "@/lib/comissoes.functions";
import { listEmissoras } from "@/lib/emissoras.functions";

export const Route = createFileRoute("/comissoes")({
  head: () => ({ meta: [{ title: "Comissões — MidiaOS Connect" }] }),
  component: ComissoesPage,
});

const ESCOPOS = [
  { value: "global", label: "Global (todos os PIs)" },
  { value: "fornecedor", label: "Por fornecedor/veículo" },
  { value: "cliente", label: "Por cliente" },
  { value: "tipo_midia", label: "Por tipo de mídia" },
  { value: "campanha", label: "Por campanha (PI específica)" },
] as const;

const TIPOS_MIDIA = [
  { value: "tv", label: "TV" },
  { value: "radio", label: "Rádio" },
  { value: "portal", label: "Portal" },
  { value: "ooh", label: "OOH" },
  { value: "dooh", label: "DOOH / Busdoor" },
  { value: "influencer", label: "Influenciador" },
  { value: "redes_sociais", label: "Redes Sociais" },
  { value: "outros", label: "Outros" },
] as const;

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function ComissoesPage() {
  const { isSuperAdmin, loading } = useUserRoles();
  if (loading) return <AppShell><div className="p-6 text-sm text-muted-foreground">Carregando…</div></AppShell>;
  if (!isSuperAdmin) {
    return (
      <AppShell>
        <PageHeader
          title="Comissões"
          description="Módulo MidiaOS Connect disponível apenas no Painel do Proprietário."
          icon={<Percent className="h-5 w-5" />}
        />
        <div className="mt-6 rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          Acesso restrito. Entre em contato com o proprietário do sistema para liberar este módulo.
        </div>
      </AppShell>
    );
  }
  return (
    <AppShell>
      <PageHeader
        title="Comissões"
        description="Configure regras de comissão por fornecedor, cliente, tipo de mídia ou campanha e acompanhe a apuração mês a mês."
        icon={<Percent className="h-5 w-5" />}
      />
      <Tabs defaultValue="apuracao" className="mt-6">
        <TabsList>
          <TabsTrigger value="apuracao"><DollarSign className="h-4 w-4 mr-1.5" /> Apuração</TabsTrigger>
          <TabsTrigger value="regras"><Percent className="h-4 w-4 mr-1.5" /> Regras</TabsTrigger>
        </TabsList>
        <TabsContent value="apuracao" className="mt-4"><ApuracaoTab /></TabsContent>
        <TabsContent value="regras" className="mt-4"><RegrasTab /></TabsContent>
      </Tabs>
    </AppShell>
  );
}

function ApuracaoTab() {
  const listFn = useServerFn(listApuracoes);
  const updFn = useServerFn(updateApuracaoStatus);
  const qc = useQueryClient();
  const [filtros, setFiltros] = useState<{ inicio?: string; fim?: string; status?: any }>({});
  const { data, isLoading } = useQuery({
    queryKey: ["comissoes-apuracao", filtros],
    queryFn: () => listFn({ data: filtros }),
  });

  const upd = useMutation({
    mutationFn: (p: { id: string; status: any }) => updFn({ data: p }),
    onSuccess: () => { toast.success("Status atualizado"); qc.invalidateQueries({ queryKey: ["comissoes-apuracao"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const totalPorStatus = useMemo(() => {
    const rows = (data?.rows ?? []) as any[];
    const acc: Record<string, number> = { prevista: 0, confirmada: 0, paga: 0, cancelada: 0 };
    rows.forEach((r) => { acc[r.status] = (acc[r.status] || 0) + Number(r.valor || 0); });
    return acc;
  }, [data]);

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3">
        {(["prevista","confirmada","paga","cancelada"] as const).map((s) => (
          <Card key={s}>
            <CardHeader className="pb-2"><CardDescription className="capitalize">{s}</CardDescription></CardHeader>
            <CardContent><div className="text-xl font-semibold">{fmt(totalPorStatus[s] ?? 0)}</div></CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <CardTitle>Apurações de comissão</CardTitle>
            <div className="flex gap-2 items-end flex-wrap">
              <div>
                <Label className="text-xs">De</Label>
                <Input type="date" value={filtros.inicio ?? ""} onChange={(e) => setFiltros((f) => ({ ...f, inicio: e.target.value || undefined }))} />
              </div>
              <div>
                <Label className="text-xs">Até</Label>
                <Input type="date" value={filtros.fim ?? ""} onChange={(e) => setFiltros((f) => ({ ...f, fim: e.target.value || undefined }))} />
              </div>
              <div className="w-44">
                <Label className="text-xs">Status</Label>
                <Select value={filtros.status ?? "todos"} onValueChange={(v) => setFiltros((f) => ({ ...f, status: v === "todos" ? undefined : v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="prevista">Prevista</SelectItem>
                    <SelectItem value="confirmada">Confirmada</SelectItem>
                    <SelectItem value="paga">Paga</SelectItem>
                    <SelectItem value="cancelada">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? <div className="text-sm text-muted-foreground">Carregando…</div>
            : (data?.rows ?? []).length === 0 ? <div className="text-sm text-muted-foreground">Nenhuma comissão apurada no período.</div>
            : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>PI</TableHead>
                      <TableHead>Fornecedor</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead className="text-right">Base</TableHead>
                      <TableHead className="text-right">%</TableHead>
                      <TableHead className="text-right">Comissão</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(data?.rows ?? []).map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono text-xs">{r.pis?.numero_pi ?? "—"}</TableCell>
                        <TableCell>{r.emissoras?.nome ?? "—"}</TableCell>
                        <TableCell>{r.clientes?.nome_fantasia || r.clientes?.razao_social || "—"}</TableCell>
                        <TableCell className="text-right">{fmt(Number(r.base_calculo || 0))}</TableCell>
                        <TableCell className="text-right">{Number(r.percentual || 0).toFixed(2)}%</TableCell>
                        <TableCell className="text-right font-medium">{fmt(Number(r.valor || 0))}</TableCell>
                        <TableCell><Badge variant={r.status === "paga" ? "default" : "outline"} className="capitalize">{r.status}</Badge></TableCell>
                        <TableCell className="text-right">
                          <Select value={r.status} onValueChange={(v) => upd.mutate({ id: r.id, status: v })}>
                            <SelectTrigger className="h-8 w-36 ml-auto"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="prevista">Prevista</SelectItem>
                              <SelectItem value="confirmada">Confirmada</SelectItem>
                              <SelectItem value="paga">Marcar como paga</SelectItem>
                              <SelectItem value="cancelada">Cancelar</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}

function RegrasTab() {
  const listFn = useServerFn(listComissoesRegras);
  const saveFn = useServerFn(saveComissaoRegra);
  const delFn = useServerFn(deleteComissaoRegra);
  const emissorasFn = useServerFn(listEmissoras);
  const qc = useQueryClient();

  const { data: regras, isLoading } = useQuery({ queryKey: ["comissoes-regras"], queryFn: () => listFn() });
  const { data: emissoras } = useQuery({ queryKey: ["emissoras"], queryFn: () => emissorasFn() });

  const empty = { escopo: "global" as const, percentual: 5, prioridade: 100, ativa: true, fornecedor_id: null, cliente_id: null, pi_id: null, tipo_midia: null, vigencia_inicio: null, vigencia_fim: null, observacao: "" };
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<any>(empty);

  function openNew() { setEditing(null); setForm(empty); setOpen(true); }
  function openEdit(r: any) {
    setEditing(r);
    setForm({
      escopo: r.escopo, percentual: Number(r.percentual), prioridade: r.prioridade ?? 100,
      ativa: r.ativa, fornecedor_id: r.fornecedor_id, cliente_id: r.cliente_id, pi_id: r.pi_id,
      tipo_midia: r.tipo_midia, vigencia_inicio: r.vigencia_inicio, vigencia_fim: r.vigencia_fim,
      observacao: r.observacao ?? "",
    });
    setOpen(true);
  }

  const save = useMutation({
    mutationFn: async () => saveFn({ data: { ...form, id: editing?.id } }),
    onSuccess: () => { toast.success("Regra salva"); setOpen(false); qc.invalidateQueries({ queryKey: ["comissoes-regras"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { toast.success("Regra excluída"); qc.invalidateQueries({ queryKey: ["comissoes-regras"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>Regras de comissão</CardTitle>
            <CardDescription>A regra com maior prioridade que atender ao PI será aplicada. Use vigências para alterações temporárias.</CardDescription>
          </div>
          <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Nova regra</Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? <div className="text-sm text-muted-foreground">Carregando…</div>
          : (regras ?? []).length === 0 ? <div className="text-sm text-muted-foreground">Nenhuma regra cadastrada. Comece criando uma regra global para o representante.</div>
          : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Escopo</TableHead>
                    <TableHead>Alvo</TableHead>
                    <TableHead className="text-right">%</TableHead>
                    <TableHead className="text-right">Prioridade</TableHead>
                    <TableHead>Vigência</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(regras as any[]).map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="capitalize">{r.escopo}</TableCell>
                      <TableCell>
                        {r.escopo === "fornecedor" && (r.emissoras?.nome ?? "—")}
                        {r.escopo === "cliente" && (r.clientes?.nome_fantasia || r.clientes?.razao_social || "—")}
                        {r.escopo === "tipo_midia" && (r.tipo_midia ?? "—")}
                        {r.escopo === "global" && "Todos os PIs"}
                        {r.escopo === "campanha" && (r.pi_id ?? "—")}
                      </TableCell>
                      <TableCell className="text-right">{Number(r.percentual).toFixed(2)}%</TableCell>
                      <TableCell className="text-right">{r.prioridade}</TableCell>
                      <TableCell className="text-xs">{r.vigencia_inicio ?? "—"} → {r.vigencia_fim ?? "—"}</TableCell>
                      <TableCell><Badge variant={r.ativa ? "default" : "outline"}>{r.ativa ? "Ativa" : "Inativa"}</Badge></TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => { if (confirm("Excluir esta regra?")) del.mutate(r.id); }}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader><DialogTitle>{editing ? "Editar regra" : "Nova regra de comissão"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label className="text-xs">Escopo</Label>
              <Select value={form.escopo} onValueChange={(v) => setForm((f: any) => ({ ...f, escopo: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ESCOPOS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {form.escopo === "fornecedor" && (
              <div className="col-span-2">
                <Label className="text-xs">Fornecedor / Veículo</Label>
                <Select value={form.fornecedor_id ?? ""} onValueChange={(v) => setForm((f: any) => ({ ...f, fornecedor_id: v || null }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
                  <SelectContent>
                    {(emissoras ?? []).map((e: any) => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {form.escopo === "tipo_midia" && (
              <div className="col-span-2">
                <Label className="text-xs">Tipo de mídia</Label>
                <Select value={form.tipo_midia ?? ""} onValueChange={(v) => setForm((f: any) => ({ ...f, tipo_midia: v || null }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
                  <SelectContent>{TIPOS_MIDIA.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label className="text-xs">Percentual (%)</Label>
              <Input type="number" step="0.01" min="0" max="100"
                value={form.percentual}
                onChange={(e) => setForm((f: any) => ({ ...f, percentual: Number(e.target.value) }))} />
            </div>
            <div>
              <Label className="text-xs">Prioridade</Label>
              <Input type="number" value={form.prioridade}
                onChange={(e) => setForm((f: any) => ({ ...f, prioridade: Number(e.target.value) }))} />
            </div>
            <div>
              <Label className="text-xs">Vigência início</Label>
              <Input type="date" value={form.vigencia_inicio ?? ""}
                onChange={(e) => setForm((f: any) => ({ ...f, vigencia_inicio: e.target.value || null }))} />
            </div>
            <div>
              <Label className="text-xs">Vigência fim</Label>
              <Input type="date" value={form.vigencia_fim ?? ""}
                onChange={(e) => setForm((f: any) => ({ ...f, vigencia_fim: e.target.value || null }))} />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Observação</Label>
              <Textarea rows={2} value={form.observacao ?? ""} onChange={(e) => setForm((f: any) => ({ ...f, observacao: e.target.value }))} />
            </div>
            <label className="col-span-2 flex items-center gap-2 text-sm cursor-pointer">
              <Switch checked={form.ativa} onCheckedChange={(v) => setForm((f: any) => ({ ...f, ativa: v }))} />
              Regra ativa
            </label>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending ? "Salvando…" : editing ? "Salvar" : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
